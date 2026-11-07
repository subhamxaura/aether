use anyhow::{Context, Result};
use clap::Parser;
use tracing::{error, info, warn};

#[derive(Parser, Debug)]
#[command(name = "aetherd")]
#[command(about = "Aether Control Plane Kernel Daemon")]
struct DaemonArgs {
    #[arg(short, long, default_value_t = 8080)]
    port: u16,

    #[arg(short, long, default_value_t = 9090)]
    grpc_port: u16,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let args = DaemonArgs::parse();

    let rest_addr = format!("0.0.0.0:{}", args.port);
    let grpc_addr = format!("0.0.0.0:{}", args.grpc_port);

    let rest_listener = tokio::net::TcpListener::bind(&rest_addr).await
        .context(format!("Failed to bind REST listener on {}", rest_addr))?;
    info!("REST & SSE Gateway listening on http://{}", rest_addr);

    let grpc_listener = tokio::net::TcpListener::bind(&grpc_addr).await
        .context(format!("Failed to bind gRPC listener on {}", grpc_addr))?;
    info!("gRPC Worker Service listening on {}", grpc_addr);

    println!("aetherd kernel running on {} and {}. Ready for agent swarm execution.", rest_addr, grpc_addr);

    let rest_task = tokio::spawn(async move {
        loop {
            match rest_listener.accept().await {
                Ok((mut socket, _peer)) => {
                    tokio::spawn(async move {
                        use tokio::io::{AsyncReadExt, AsyncWriteExt};
                        let mut buf = [0u8; 1024];
                        if let Ok(n) = socket.read(&mut buf).await && n > 0 {
                            let response = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 15\r\n\r\n{\"status\":\"ok\"}";
                            let _ = socket.write_all(response.as_bytes()).await;
                        }
                    });
                }
                Err(e) => {
                    error!("REST accept error: {}", e);
                    break;
                }
            }
        }
    });

    let grpc_task = tokio::spawn(async move {
        loop {
            match grpc_listener.accept().await {
                Ok((_socket, _peer)) => {}
                Err(e) => {
                    error!("gRPC accept error: {}", e);
                    break;
                }
            }
        }
    });

    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            info!("Received shutdown signal. Gracefully shutting down aetherd...");
        }
        res = rest_task => {
            warn!("REST server task exited: {:?}", res);
        }
        res = grpc_task => {
            warn!("gRPC server task exited: {:?}", res);
        }
    }

    info!("aetherd daemon terminated.");
    Ok(())
}
