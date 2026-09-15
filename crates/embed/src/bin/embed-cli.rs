use anyhow::{Context, Result};
use embed_lambda::{Embedder, DIMENSIONS};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};

#[derive(Debug, Deserialize)]
struct Request {
    texts: Vec<String>,
}

#[derive(Debug, Serialize)]
struct Response {
    dimensions: usize,
    vectors: Vec<Vec<f32>>,
}

fn main() -> Result<()> {
    let mut input = String::new();
    std::io::stdin()
        .read_to_string(&mut input)
        .context("failed to read stdin")?;

    let request: Request =
        serde_json::from_str(&input).context("stdin is not {\"texts\":[...]}")?;

    let mut model = Embedder::new()?;
    let vectors = model.embed_batch(&request.texts)?;

    let response = Response {
        dimensions: DIMENSIONS,
        vectors,
    };

    let mut stdout = std::io::stdout().lock();
    serde_json::to_writer(&mut stdout, &response).context("failed to write stdout")?;
    stdout.write_all(b"\n")?;
    Ok(())
}
