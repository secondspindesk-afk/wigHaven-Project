# Multi-stage build for minimal image size
FROM rust:1.83-slim as builder

WORKDIR /app

# Install build dependencies (including ring/rustls requirements)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first for dependency caching
COPY Cargo.toml ./

# Create dummy main to cache dependencies
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release 2>/dev/null || true && \
    rm -rf src target/release/.fingerprint/wighaven*

# Copy real source code
COPY src ./src

# Build release binary with all optimizations
RUN cargo build --release

# Runtime stage - ultra-minimal with distroless alternative
FROM gcr.io/distroless/cc-debian12

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/wighaven-gateway /app/gateway

# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 7860

ENV PORT=7860
ENV RUST_LOG=info

# Run as non-root (distroless default user is 65532)
USER 65532

CMD ["/app/gateway"]