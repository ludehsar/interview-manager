use embed_lambda::{Embedder, DIMENSIONS};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tokio::sync::OnceCell;

#[derive(Debug, Deserialize)]
struct EmbedRequest {
    texts: Vec<String>,
}

#[derive(Debug, Serialize)]
struct EmbedResponse {
    dimensions: usize,
    vectors: Vec<Vec<f32>>,
}

static EMBEDDER: OnceCell<Mutex<Embedder>> = OnceCell::const_new();

async fn embedder() -> Result<&'static Mutex<Embedder>, Error> {
    EMBEDDER
        .get_or_try_init(|| async { Embedder::new().map(Mutex::new) })
        .await
        .map_err(Error::from)
}

async fn handler(event: LambdaEvent<EmbedRequest>) -> Result<EmbedResponse, Error> {
    let cell = embedder().await?;
    let vectors = {
        let mut model = cell
            .lock()
            .map_err(|_| Error::from("embedder lock poisoned"))?;
        model.embed_batch(&event.payload.texts)?
    };

    Ok(EmbedResponse {
        dimensions: DIMENSIONS,
        vectors,
    })
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
