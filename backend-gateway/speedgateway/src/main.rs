use axum::{
    Router,
    routing::get,
    extract::State,
    http::{HeaderMap, HeaderName, HeaderValue, StatusCode, Uri, Method, Request},
    response::{IntoResponse, Response},
    body::Body,
};
use bytes::Bytes;
use futures_util::StreamExt;
use hyper_util::client::legacy::{Client as HyperClient, connect::HttpConnector};
use hyper_util::rt::TokioExecutor;
use std::sync::Arc;
use std::env;
use std::time::Duration;
use tokio::signal;
use tower_http::compression::CompressionLayer;
use tower_http::timeout::TimeoutLayer;

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
        .pool_idle_timeout(Duration::from_secs(60))  // HF may close after 60s
        .pool_max_idle_per_host(100)  // More connections for concurrent requests
        .retry_canceled_requests(true)
        .build(https);

    let state = Arc::new(AppState {
        client,
        target_url,
        hf_token,
    });

    // Build router with middleware
    let app = Router::new()
        .route("/gateway-health", get(gateway_health))
        .fallback(proxy_handler)
        .layer(CompressionLayer::new())  // Auto gzip/br compression
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .with_state(state);

    // Bind to port
    let port = env::var("PORT").unwrap_or_else(|_| "7860".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind");

    tracing::info!("🚀 Rust Gateway running on http://{}", addr);
    tracing::info!("📡 Proxying to: {}", env::var("PRIVATE_BACKEND_URL").unwrap());

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
        Bytes::from_static(b"{\"status\":\"ok\",\"service\":\"wighaven-gateway-rust\"}"),
    )
}

// Streaming proxy handler - zero-copy where possible
async fn proxy_handler(
    State(state): State<Arc<AppState>>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    body: Body,
) -> Response {
    // Build target URL efficiently
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

    // Forward headers efficiently - skip hop-by-hop headers
    static SKIP_HEADERS: &[&str] = &[
        "host", "connection", "keep-alive", "proxy-authenticate",
        "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"
    ];

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
    // This MUST be the actual Authorization header for HF to accept it
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
            let headers = resp.headers().clone();

            // Stream the response body directly - no buffering!
            let body_stream = resp.into_body();
            
            // Build response with streaming body
            let mut response = Response::builder().status(status);

            // Forward response headers - skip hop-by-hop
            for (key, value) in headers.iter() {
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