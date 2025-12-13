use axum::{
    Router,
    routing::get,
    extract::{State, WebSocketUpgrade, ws::{Message, WebSocket}},
    http::{HeaderMap, HeaderName, HeaderValue, StatusCode, Uri, Method, Request, header},
    response::{IntoResponse, Response},
    body::Body,
};
use bytes::Bytes;
use futures_util::{StreamExt, SinkExt};
use hyper_util::client::legacy::{Client as HyperClient, connect::HttpConnector};
use hyper_util::rt::TokioExecutor;
use std::sync::Arc;
use std::env;
use std::time::Duration;
use tokio::signal;
use tokio_tungstenite::{connect_async, tungstenite::Message as TungMessage};
use tower_http::compression::CompressionLayer;
use tower_http::timeout::TimeoutLayer;
use url::Url;

// Shared state
struct AppState {
    client: HyperClient<hyper_rustls::HttpsConnector<HttpConnector>, Body>,
    target_url: Arc<str>,
    hf_token: Arc<str>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_level(true)
        .compact()
        .init();

    let target_url: Arc<str> = env::var("PRIVATE_BACKEND_URL")
        .expect("PRIVATE_BACKEND_URL must be set")
        .into();
    
    let hf_token: Arc<str> = env::var("HF_TOKEN")
        .unwrap_or_default()
        .into();

    if hf_token.is_empty() {
        tracing::warn!("HF_TOKEN not set - private space access may fail");
    }

    let https = hyper_rustls::HttpsConnectorBuilder::new()
        .with_native_roots()
        .expect("Failed to load native roots")
        .https_or_http()
        .enable_http1()
        .enable_http2()
        .build();

    let client = HyperClient::builder(TokioExecutor::new())
        .pool_idle_timeout(Duration::from_secs(60))
        .pool_max_idle_per_host(100)
        .retry_canceled_requests(true)
        .build(https);

    let state = Arc::new(AppState { client, target_url, hf_token });

    // WebSocket route must be separate to avoid compression/timeout middleware
    let ws_routes = Router::new()
        .route("/notifications", get(websocket_handler))
        .with_state(state.clone());

    // HTTP routes with compression and timeout
    let http_routes = Router::new()
        .route("/gateway-health", get(gateway_health))
        .fallback(proxy_handler)
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .with_state(state);

    // Merge routes - WebSocket routes first (no middleware)
    let app = ws_routes.merge(http_routes);

    let port = env::var("PORT").unwrap_or_else(|_| "7860".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await.expect("Failed to bind");

    tracing::info!("🚀 Rust Gateway v2.2 on http://{}", addr);
    tracing::info!("📡 Proxying to: {}", env::var("PRIVATE_BACKEND_URL").unwrap());
    tracing::info!("🔌 WebSocket: /notifications");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server failed");
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("Failed to install Ctrl+C handler");
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
    tracing::info!("Shutting down...");
}

// Health check
async fn gateway_health() -> impl IntoResponse {
    (
        StatusCode::OK,
        [(HeaderName::from_static("content-type"), HeaderValue::from_static("application/json"))],
        Bytes::from_static(b"{\"status\":\"ok\",\"service\":\"wighaven-gateway-rust\",\"version\":\"2.2\",\"websocket\":true}"),
    )
}

// WebSocket handler - accepts upgrade and proxies to backend
async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Response {
    tracing::info!("🔌 WebSocket upgrade request for /notifications");
    
    // Extract token from Sec-WebSocket-Protocol header
    let token = headers
        .get("sec-websocket-protocol")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| {
            let parts: Vec<&str> = s.split(',').map(|p| p.trim()).collect();
            if parts.len() >= 2 && parts[0] == "access_token" {
                Some(parts[1].to_string())
            } else {
                None
            }
        });

    // Accept with protocol if token was provided
    let ws = if token.is_some() {
        ws.protocols(["access_token"])
    } else {
        ws
    };

    ws.on_upgrade(move |socket| websocket_proxy(socket, state, token))
}

// Bidirectional WebSocket proxy
async fn websocket_proxy(client_ws: WebSocket, state: Arc<AppState>, token: Option<String>) {
    // Build upstream WebSocket URL
    let base_url = if state.target_url.starts_with("https://") {
        state.target_url.replace("https://", "wss://")
    } else if state.target_url.starts_with("http://") {
        state.target_url.replace("http://", "ws://")
    } else {
        format!("wss://{}", state.target_url)
    };
    
    let ws_url = format!("{}/notifications", base_url);
    
    tracing::info!("🔗 Connecting to upstream: {}", ws_url);

    // Parse URL for tokio-tungstenite
    let url = match url::Url::parse(&ws_url) {
        Ok(u) => u,
        Err(e) => {
            tracing::error!("Invalid WebSocket URL: {}", e);
            return;
        }
    };

    // Build proper WebSocket request with all required headers
    use tokio_tungstenite::tungstenite::handshake::client::generate_key;
    
    let host = url.host_str().unwrap_or("localhost");
    let ws_key = generate_key(); // This generates a proper sec-websocket-key
    
    let mut request = tokio_tungstenite::tungstenite::http::Request::builder()
        .uri(ws_url.as_str())
        .header("Host", host)
        .header("Connection", "Upgrade")
        .header("Upgrade", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", ws_key);
    
    // Add token in protocol header
    if let Some(ref t) = token {
        request = request.header("Sec-WebSocket-Protocol", format!("access_token, {}", t));
    }
    
    // Add HF token for private space access
    if !state.hf_token.is_empty() {
        request = request.header("Authorization", format!("Bearer {}", state.hf_token));
    }

    let request = match request.body(()) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to build upstream request: {}", e);
            return;
        }
    };

    // Connect to upstream
    let upstream_ws = match connect_async(request).await {
        Ok((ws, resp)) => {
            tracing::info!("✅ Upstream connected (status: {})", resp.status());
            ws
        }
        Err(e) => {
            tracing::error!("❌ Upstream connection failed: {}", e);
            return;
        }
    };

    // Split both connections
    let (mut client_sink, mut client_stream) = client_ws.split();
    let (mut upstream_sink, mut upstream_stream) = upstream_ws.split();

    // Forward client -> upstream
    let client_to_upstream = async {
        while let Some(msg) = client_stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if upstream_sink.send(TungMessage::Text(text)).await.is_err() {
                        break;
                    }
                }
                Ok(Message::Binary(data)) => {
                    if upstream_sink.send(TungMessage::Binary(data)).await.is_err() {
                        break;
                    }
                }
                Ok(Message::Ping(data)) => {
                    if upstream_sink.send(TungMessage::Ping(data)).await.is_err() {
                        break;
                    }
                }
                Ok(Message::Pong(data)) => {
                    if upstream_sink.send(TungMessage::Pong(data)).await.is_err() {
                        break;
                    }
                }
                Ok(Message::Close(_)) => break,
                Err(_) => break,
            }
        }
        let _ = upstream_sink.close().await;
    };

    // Forward upstream -> client
    let upstream_to_client = async {
        while let Some(msg) = upstream_stream.next().await {
            match msg {
                Ok(TungMessage::Text(text)) => {
                    if client_sink.send(Message::Text(text)).await.is_err() {
                        break;
                    }
                }
                Ok(TungMessage::Binary(data)) => {
                    if client_sink.send(Message::Binary(data)).await.is_err() {
                        break;
                    }
                }
                Ok(TungMessage::Ping(data)) => {
                    if client_sink.send(Message::Ping(data)).await.is_err() {
                        break;
                    }
                }
                Ok(TungMessage::Pong(data)) => {
                    if client_sink.send(Message::Pong(data)).await.is_err() {
                        break;
                    }
                }
                Ok(TungMessage::Close(_)) => break,
                Ok(TungMessage::Frame(_)) => {} // Ignore raw frames
                Err(_) => break,
            }
        }
        let _ = client_sink.close().await;
    };

    // Run both directions concurrently
    tokio::select! {
        _ = client_to_upstream => {
            tracing::info!("Client disconnected");
        }
        _ = upstream_to_client => {
            tracing::info!("Upstream disconnected");
        }
    }
    
    tracing::info!("🔌 WebSocket connection closed");
}

// HTTP proxy handler
static SKIP_HEADERS: &[&str] = &[
    "host", "connection", "keep-alive", "proxy-authenticate",
    "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"
];

async fn proxy_handler(
    State(state): State<Arc<AppState>>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    body: Body,
) -> Response {
    let path = uri.path();
    let target_url = match uri.query() {
        Some(q) => format!("{}{}?{}", state.target_url, path, q),
        None => format!("{}{}", state.target_url, path),
    };

    let target_uri: hyper::Uri = match target_url.parse() {
        Ok(u) => u,
        Err(e) => {
            tracing::error!("Invalid target URL: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Invalid target URL").into_response();
        }
    };

    let mut req = Request::builder().method(method).uri(target_uri);

    // Forward headers, move Authorization to x-forwarded-auth
    let mut client_auth_forwarded = false;
    for (key, value) in headers.iter() {
        let key_str = key.as_str();
        if !SKIP_HEADERS.contains(&key_str) {
            if key_str == "authorization" {
                req = req.header("x-forwarded-auth", value);
                client_auth_forwarded = true;
            } else {
                req = req.header(key, value);
            }
        }
    }

    if let Some(auth_token) = headers.get("x-auth-token") {
        if !client_auth_forwarded {
            req = req.header("x-forwarded-auth", format!("Bearer {}", auth_token.to_str().unwrap_or("")));
        }
    }

    if !state.hf_token.is_empty() {
        req = req.header("authorization", format!("Bearer {}", state.hf_token));
    }

    let req = match req.body(body) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to build request: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to build request").into_response();
        }
    };

    match state.client.request(req).await {
        Ok(resp) => {
            let status = resp.status();
            let resp_headers = resp.headers().clone();
            let body_stream = resp.into_body();
            
            let mut response = Response::builder().status(status);
            for (key, value) in resp_headers.iter() {
                if !SKIP_HEADERS.contains(&key.as_str()) {
                    response = response.header(key, value);
                }
            }

            let axum_body = Body::from_stream(
                http_body_util::BodyStream::new(body_stream)
                    .map(|r| r.map(|f| f.into_data().unwrap_or_default()))
            );

            response.body(axum_body).unwrap_or_else(|_| {
                (StatusCode::BAD_GATEWAY, "Failed to build response").into_response()
            })
        }
        Err(e) => {
            tracing::error!("Proxy error: {}", e);
            (StatusCode::BAD_GATEWAY, format!("Backend connection failed: {}", e)).into_response()
        }
    }
}