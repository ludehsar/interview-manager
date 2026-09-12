use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};

pub const DIMENSIONS: usize = 384;

#[derive(Debug, Deserialize)]
struct EmbedRequest {
    texts: Vec<String>,
}

#[derive(Debug, Serialize)]
struct EmbedResponse {
    dimensions: usize,
    vectors: Vec<Vec<f32>>,
}

async fn handler(event: LambdaEvent<EmbedRequest>) -> Result<EmbedResponse, Error> {
    let vectors = embed(&event.payload.texts)?;
    Ok(EmbedResponse {
        dimensions: DIMENSIONS,
        vectors,
    })
}

fn embed(_texts: &[String]) -> Result<Vec<Vec<f32>>, Error> {
    Err(Error::from("local embedding model is wired up in phase 1"))
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .json()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();
    run(service_fn(handler)).await
}
