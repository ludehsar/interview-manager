use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use typst_render_lambda::render;

#[derive(Debug, Deserialize)]
struct RenderRequest {
    resume_id: String,
    #[serde(default = "default_template")]
    template: String,
    content: serde_json::Value,
    bucket: String,
    pdf_key: String,
    typst_key: String,
}

fn default_template() -> String {
    "ats".to_string()
}

#[derive(Debug, Serialize)]
struct RenderResponse {
    resume_id: String,
    pdf_key: String,
    typst_key: String,
    page_count: u32,
    bytes: usize,
}

async fn handler(event: LambdaEvent<RenderRequest>) -> Result<RenderResponse, Error> {
    let req = event.payload;
    let (source, pdf) = render(&req.template, &req.content)?;

    let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
    let s3 = aws_sdk_s3::Client::new(&config);

    s3.put_object()
        .bucket(&req.bucket)
        .key(&req.typst_key)
        .content_type("text/plain")
        .body(source.into_bytes().into())
        .send()
        .await?;

    s3.put_object()
        .bucket(&req.bucket)
        .key(&req.pdf_key)
        .content_type("application/pdf")
        .body(pdf.bytes.clone().into())
        .send()
        .await?;

    Ok(RenderResponse {
        resume_id: req.resume_id,
        pdf_key: req.pdf_key,
        typst_key: req.typst_key,
        page_count: pdf.page_count,
        bytes: pdf.bytes.len(),
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
