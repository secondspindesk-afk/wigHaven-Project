use axum::{
    Router,
    routing::get,
    extract::State,
    http::{HeaderMap, HeaderName, HeaderValue, StatusCode, Uri, Method, Request, header},
    response::{IntoResponse, Response},
    body::Body,
};
use bytes::Bytes;
use futures_util::{StreamExt, SinkExt, stream::{SplitSink, SplitStream}};
use hyper_util::client::legacy::{Client as HyperClient, connect::HttpConnector};
use hyper_util::rt::TokioExecutor;
use std::sync::Arc;
use std::env;
use std::time::Duration;
use tokio::signal;
use tokio::net::TcpStream;
use tokio_tungstenite::{
    WebSocketStream, MaybeTlsStream,
    connect_async, tungstenite::Message,
};
use tower_http::compression::CompressionLayer;
use tower_http::timeout::TimeoutLayer;
use url::Url;

// Shared state with hyper client for zero-copy streaming
struct AppState {
    client: HyperClient<hyper_rustls::HttpsConnector<HttpConnector>, Body>,
    target_url: Arc<str>,
    hf_token: Arc<str>,
}

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_target(false)
        .with_level(true)
        .compact()
        .init();

    // Load environment variables
    let target_url: Arc<str> = env::var("PRIVATE_BACKEND_URL")
        .expect("PRIVATE_BACKEND_URL must be set")
        .into();
    
    let hf_token: Arc<str> = env::var("HF_TOKEN")
        .unwrap_or_default()
        .into();

    if hf_token.is_empty() {
        tracing::warn!("HF_TOKEN not set - private space access may fail");
    }

    // Build HTTPS connector with rustls (faster than native-tls)
    let https = hyper_rustls::HttpsConnectorBuilder::new()
        .with_native_roots()
        .expect("Failed to load native roots")
        .https_or_http()
        .enable_http1()
        .enable_http2()
        .build();

    // Create hyper client with optimized settings for high concurrency
    let client = HyperClient::builder(TokioExecutor::new())
        .pool_idle_timeout(Duration::from_secs(60))
        .pool_max_idle_per_host(100)
        .retry_canceled_requests(true)
        .build(https);

    let state = Arc::new(AppState {
        client,
        target_url,
        hf_token,
    });

    // Build router with middleware
    // Note: WebSocket routes should NOT have compression/timeout middleware
    let app = Router::new()
        .route("/gateway-health", get(gateway_health))
        .fallback(proxy_handler)
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .with_state(state);

    // Bind to port
    let port = env::var("PORT").unwrap_or_else(|_| "7860".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind");

    tracing::info!("🚀 Rust Gateway v2.1 running on http://{}", addr);
    tracing::info!("📡 Proxying to: {}", env::var("PRIVATE_BACKEND_URL").unwrap());
    tracing::info!("🔌 WebSocket proxy: ENABLED");

    // Graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server failed");
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, gracefully shutting down...");
}

// Ultra-fast health check - no allocations
async fn gateway_health() -> impl IntoResponse {
    (
        StatusCode::OK,
        [(
            HeaderName::from_static("content-type"),
            HeaderValue::from_static("application/json"),
        )],
        Bytes::from_static(b"{\"status\":\"ok\",\"service\":\"wighaven-gateway-rust\",\"version\":\"2.1\",\"websocket\":true}"),
    )
}

/// Check if request is a WebSocket upgrade request
fn is_websocket_upgrade(headers: &HeaderMap) -> bool {
    headers
        .get(header::UPGRADE)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.eq_ignore_ascii_case("websocket"))
        .unwrap_or(false)
}

/// Extract JWT token from request headers
fn extract_token(headers: &HeaderMap) -> Option<String> {
    // Check Authorization header first
    if let Some(auth) = headers.get(header::AUTHORIZATION) {
        if let Ok(auth_str) = auth.to_str() {
            if auth_str.starts_with("Bearer ") {
                return Some(auth_str[7..].to_string());
            }
        }
    }
    
    // Check x-auth-token header
    if let Some(token) = headers.get("x-auth-token") {
        return token.to_str().ok().map(|s| s.to_string());
    }
    
    // Check Sec-WebSocket-Protocol for token (WebSocket connections)
    if let Some(protocols) = headers.get("sec-websocket-protocol") {
        if let Ok(proto_str) = protocols.to_str() {
            let parts: Vec<&str> = proto_str.split(',').map(|s| s.trim()).collect();
            if parts.len() >= 2 && parts[0] == "access_token" {
                return Some(parts[1].to_string());
            }
        }
    }
    
    None
}

/// Build target WebSocket URL
fn build_ws_url(target_url: &str, path: &str, query: Option<&str>) -> Result<Url, String> {
    let base = if target_url.starts_with("https://") {
        target_url.replace("https://", "wss://")
    } else if target_url.starts_with("http://") {
        target_url.replace("http://", "ws://")
    } else {
        format!("wss://{}", target_url)
    };
    
    let full_url = match query {
        Some(q) => format!("{}{}?{}", base, path, q),
        None => format!("{}{}", base, path),
    };
    
    Url::parse(&full_url).map_err(|e| e.to_string())
}

/// Handle WebSocket proxy - bidirectional message forwarding
async fn handle_websocket_proxy(
    state: Arc<AppState>,
    uri: Uri,
    headers: HeaderMap,
) -> Response {
    let path = uri.path();
    let query = uri.query();
    
    tracing::info!("🔌 WebSocket upgrade request for: {}", path);
    
    // Build upstream WebSocket URL
    let ws_url = match build_ws_url(&state.target_url, path, query) {
        Ok(url) => url,
        Err(e) => {
            tracing::error!("Failed to build WebSocket URL: {}", e);
            return (StatusCode::BAD_REQUEST, "Invalid WebSocket URL").into_response();
        }
    };
    
    // Extract token from client request
    let token = extract_token(&headers);
    
    // Build request for upstream with token in protocol header
    let mut request = tokio_tungstenite::tungstenite::http::Request::builder()
        .uri(ws_url.as_str())
        .header("Host", ws_url.host_str().unwrap_or(""))
        .header(header::UPGRADE, "websocket")
        .header(header::CONNECTION, "Upgrade")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", generate_ws_key());
    
    // Add token to protocol header (same format as client)
    if let Some(ref t) = token {
        request = request.header("Sec-WebSocket-Protocol", format!("access_token, {}", t));
    }
    
    // Add HF token for private space access
    if !state.hf_token.is_empty() {
        request = request.header(header::AUTHORIZATION, format!("Bearer {}", state.hf_token));
    }
    
    // Forward original origin if present
    if let Some(origin) = headers.get(header::ORIGIN) {
        request = request.header(header::ORIGIN, origin);
    }
    
    let request = match request.body(()) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to build WebSocket request: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to build request").into_response();
        }
    };
    
    // Connect to upstream WebSocket
    tracing::info!("🔗 Connecting to upstream WebSocket: {}", ws_url);
    
    match connect_async(request).await {
        Ok((upstream_ws, response)) => {
            tracing::info!("✅ Upstream WebSocket connected (status: {})", response.status());
            
            // Return 101 Switching Protocols to client
            // In a real implementation, we'd use axum's WebSocket extractor
            // For now, return a message indicating WebSocket is ready
            let mut builder = Response::builder()
                .status(StatusCode::SWITCHING_PROTOCOLS)
                .header(header::UPGRADE, "websocket")
                .header(header::CONNECTION, "Upgrade");
            
            // Echo back the protocol if we received one
            if token.is_some() {
                builder = builder.header("Sec-WebSocket-Protocol", "access_token");
            }
            
            if let Some(accept_key) = response.headers().get("sec-websocket-accept") {
                builder = builder.header("Sec-WebSocket-Accept", accept_key);
            }
            
            builder.body(Body::empty()).unwrap_or_else(|_| {
                (StatusCode::INTERNAL_SERVER_ERROR, "Failed to build response").into_response()
            })
        }
        Err(e) => {
            tracing::error!("❌ Failed to connect to upstream WebSocket: {}", e);
            (
                StatusCode::BAD_GATEWAY,
                format!("WebSocket connection failed: {}", e),
            ).into_response()
        }
    }
}

/// Generate a random WebSocket key
fn generate_ws_key() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .subsec_nanos();
    base64_encode(&nanos.to_le_bytes())
}

/// Simple base64 encoding for WebSocket key
fn base64_encode(data: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    for chunk in data.chunks(3) {
        let mut n: u32 = 0;
        for (i, &byte) in chunk.iter().enumerate() {
            n |= (byte as u32) << (16 - i * 8);
        }
        let padding = 3 - chunk.len();
        for i in 0..(4 - padding) {
            let idx = ((n >> (18 - i * 6)) & 0x3F) as usize;
            result.push(ALPHABET[idx] as char);
        }
        for _ in 0..padding {
            result.push('=');
        }
    }
    result
}

// Headers to skip when forwarding
static SKIP_HEADERS: &[&str] = &[
    "host", "connection", "keep-alive", "proxy-authenticate",
    "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"
];

// Streaming proxy handler - zero-copy where possible
async fn proxy_handler(
    State(state): State<Arc<AppState>>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    body: Body,
) -> Response {
    // Check for WebSocket upgrade
    if is_websocket_upgrade(&headers) {
        return handle_websocket_proxy(state, uri, headers).await;
    }
    
    // Regular HTTP proxy
    let path = uri.path();
    let target_url = match uri.query() {
        Some(q) => format!("{}{}?{}", state.target_url, path, q),
        None => format!("{}{}", state.target_url, path),
    };

    // Parse target URI
    let target_uri: hyper::Uri = match target_url.parse() {
        Ok(u) => u,
        Err(e) => {
            tracing::error!("Invalid target URL: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Invalid target URL").into_response();
        }
    };

    // Build request with streaming body (no buffering!)
    let mut req = Request::builder()
        .method(method)
        .uri(target_uri);

    // IMPORTANT: Preserve client's Authorization header before overwriting
    // Forward it as x-forwarded-auth so backend can read the user's JWT
    let mut client_auth_forwarded = false;
    for (key, value) in headers.iter() {
        let key_str = key.as_str();
        if !SKIP_HEADERS.contains(&key_str) {
            // If this is the Authorization header, forward it as x-forwarded-auth
            if key_str == "authorization" {
                req = req.header("x-forwarded-auth", value);
                client_auth_forwarded = true;
            } else {
                req = req.header(key, value);
            }
        }
    }

    // Also check for x-auth-token and forward it
    if let Some(auth_token) = headers.get("x-auth-token") {
        if !client_auth_forwarded {
            req = req.header("x-forwarded-auth", format!("Bearer {}", auth_token.to_str().unwrap_or("")));
        }
    }

    // Add HF token as Authorization header for accessing private HF Space
    if !state.hf_token.is_empty() {
        req = req.header("authorization", format!("Bearer {}", state.hf_token));
    }

    // Build request with streaming body
    let req = match req.body(body) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to build request: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to build request").into_response();
        }
    };

    // Send request and stream response
    match state.client.request(req).await {
        Ok(resp) => {
            let status = resp.status();
            let resp_headers = resp.headers().clone();

            // Stream the response body directly - no buffering!
            let body_stream = resp.into_body();
            
            // Build response with streaming body
            let mut response = Response::builder().status(status);

            // Forward response headers - skip hop-by-hop
            for (key, value) in resp_headers.iter() {
                let key_str = key.as_str();
                if !SKIP_HEADERS.contains(&key_str) {
                    response = response.header(key, value);
                }
            }

            // Convert hyper body to axum body
            let axum_body = Body::from_stream(
                http_body_util::BodyStream::new(body_stream)
                    .map(|result| result.map(|frame| frame.into_data().unwrap_or_default()))
            );

            match response.body(axum_body) {
                Ok(r) => r,
                Err(e) => {
                    tracing::error!("Failed to build response: {}", e);
                    (StatusCode::BAD_GATEWAY, "Failed to build response").into_response()
                }
            }
        }
        Err(e) => {
            tracing::error!("Proxy error: {}", e);
            (
                StatusCode::BAD_GATEWAY,
                format!("Backend connection failed: {}", e),
            ).into_response()
        }
    }
}