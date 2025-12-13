use axum::{
    Router,
    routing::get,
    extract::{State, WebSocketUpgrade, ws::{Message, WebSocket}},
    http::{HeaderMap, HeaderName, HeaderValue, StatusCode, Uri, Method, Request, header},
    response::{IntoResponse, Response, Html},
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

    // Optimized HTTPS connector with faster TLS
    let https = hyper_rustls::HttpsConnectorBuilder::new()
        .with_native_roots()
        .expect("Failed to load native roots")
        .https_or_http()
        .enable_http1()
        .enable_http2()
        .build();

    // Optimized connection pool
    let client = HyperClient::builder(TokioExecutor::new())
        .pool_idle_timeout(Duration::from_secs(90))  // Keep connections longer
        .pool_max_idle_per_host(200)                 // More idle connections
        .retry_canceled_requests(true)
        .build(https);

    let state = Arc::new(AppState { client, target_url, hf_token });

    // Public routes (decoy landing page)
    let public_routes = Router::new()
        .route("/", get(landing_page))
        .route("/robots.txt", get(robots_txt));

    // WebSocket route (no middleware for speed)
    let ws_routes = Router::new()
        .route("/notifications", get(websocket_handler))
        .with_state(state.clone());

    // API routes with compression
    let api_routes = Router::new()
        .route("/gateway-health", get(gateway_health))
        .fallback(proxy_handler)
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .with_state(state);

    // Merge routes - order matters
    let app = public_routes.merge(ws_routes).merge(api_routes);

    let port = env::var("PORT").unwrap_or_else(|_| "7860".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await.expect("Failed to bind");

    tracing::info!("🚀 Gateway v3.0 (optimized) on http://{}", addr);

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

// Decoy landing page - looks like a generic coming soon page
async fn landing_page() -> Html<&'static str> {
    Html(r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coming Soon</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            background: linear-gradient(to right, #e94560, #f39c12);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p {
            font-size: 1.2rem;
            color: #a0a0a0;
            max-width: 400px;
            margin: 0 auto 2rem;
        }
        .dots {
            display: flex;
            gap: 8px;
            justify-content: center;
        }
        .dot {
            width: 12px;
            height: 12px;
            background: #e94560;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.3s; }
        .dot:nth-child(3) { animation-delay: 0.6s; }
        @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Coming Soon</h1>
        <p>We're working on something amazing. Stay tuned for updates.</p>
        <div class="dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    </div>
</body>
</html>"#)
}

// Robots.txt to discourage indexing
async fn robots_txt() -> &'static str {
    "User-agent: *\nDisallow: /"
}

// Health check (hidden from casual visitors)
async fn gateway_health() -> impl IntoResponse {
    (
        StatusCode::OK,
        [(HeaderName::from_static("content-type"), HeaderValue::from_static("application/json"))],
        Bytes::from_static(b"{\"status\":\"ok\",\"version\":\"3.0\"}"),
    )
}

// OPTIMIZED WebSocket handler
async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Response {
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

    // Upgrade immediately for speed
    ws.on_upgrade(move |socket| websocket_proxy(socket, state, token))
}

// OPTIMIZED bidirectional WebSocket proxy
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

    // Build request with all headers at once (avoid multiple allocations)
    use tokio_tungstenite::tungstenite::handshake::client::generate_key;
    
    let url = match url::Url::parse(&ws_url) {
        Ok(u) => u,
        Err(_) => return,
    };

    let host = url.host_str().unwrap_or("localhost");
    let ws_key = generate_key();
    
    let mut builder = tokio_tungstenite::tungstenite::http::Request::builder()
        .uri(ws_url.as_str())
        .header("Host", host)
        .header("Connection", "Upgrade")
        .header("Upgrade", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", ws_key);
    
    if let Some(ref t) = token {
        builder = builder.header("Sec-WebSocket-Protocol", format!("access_token, {}", t));
    }
    
    if !state.hf_token.is_empty() {
        builder = builder.header("Authorization", format!("Bearer {}", state.hf_token));
    }

    let request = match builder.body(()) {
        Ok(r) => r,
        Err(_) => return,
    };

    // Connect to upstream with optimized settings
    let upstream_ws = match connect_async(request).await {
        Ok((ws, _)) => ws,
        Err(_) => return,
    };

    // Split connections for concurrent handling
    let (mut client_sink, mut client_stream) = client_ws.split();
    let (mut upstream_sink, mut upstream_stream) = upstream_ws.split();

    // Forward client -> upstream (optimized: minimal matching)
    let client_to_upstream = async {
        while let Some(Ok(msg)) = client_stream.next().await {
            let tung_msg = match msg {
                Message::Text(t) => TungMessage::Text(t),
                Message::Binary(b) => TungMessage::Binary(b),
                Message::Ping(p) => TungMessage::Ping(p),
                Message::Pong(p) => TungMessage::Pong(p),
                Message::Close(_) => break,
            };
            if upstream_sink.send(tung_msg).await.is_err() {
                break;
            }
        }
        let _ = upstream_sink.close().await;
    };

    // Forward upstream -> client (optimized)
    let upstream_to_client = async {
        while let Some(Ok(msg)) = upstream_stream.next().await {
            let axum_msg = match msg {
                TungMessage::Text(t) => Message::Text(t),
                TungMessage::Binary(b) => Message::Binary(b),
                TungMessage::Ping(p) => Message::Ping(p),
                TungMessage::Pong(p) => Message::Pong(p),
                TungMessage::Close(_) => break,
                TungMessage::Frame(_) => continue,
            };
            if client_sink.send(axum_msg).await.is_err() {
                break;
            }
        }
        let _ = client_sink.close().await;
    };

    // Run both directions concurrently
    tokio::select! {
        _ = client_to_upstream => {}
        _ = upstream_to_client => {}
    }
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
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Invalid target URL").into_response(),
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
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Failed to build request").into_response(),
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
            (StatusCode::BAD_GATEWAY, format!("Backend error: {}", e)).into_response()
        }
    }
}