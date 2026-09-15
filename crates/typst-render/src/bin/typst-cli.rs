use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use typst_render_lambda::render;

#[derive(Debug, Deserialize)]
struct Request {
    #[serde(default = "default_template")]
    template: String,
    content: serde_json::Value,
}

fn default_template() -> String {
    "ats".to_string()
}

#[derive(Debug, Serialize)]
struct Response {
    page_count: u32,
    bytes: usize,
    pdf_base64: String,
    source: String,
}

fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);

    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = *chunk.get(1).unwrap_or(&0) as u32;
        let b2 = *chunk.get(2).unwrap_or(&0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;

        out.push(ALPHABET[(triple >> 18) as usize & 63] as char);
        out.push(ALPHABET[(triple >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 {
            ALPHABET[(triple >> 6) as usize & 63] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            ALPHABET[triple as usize & 63] as char
        } else {
            '='
        });
    }

    out
}

fn main() -> Result<()> {
    let mut input = String::new();
    std::io::stdin()
        .read_to_string(&mut input)
        .context("failed to read stdin")?;

    let request: Request =
        serde_json::from_str(&input).context("stdin is not {\"content\":{...}}")?;
    let (source, pdf) = render(&request.template, &request.content)?;

    let response = Response {
        page_count: pdf.page_count,
        bytes: pdf.bytes.len(),
        pdf_base64: base64(&pdf.bytes),
        source,
    };

    let mut stdout = std::io::stdout().lock();
    serde_json::to_writer(&mut stdout, &response).context("failed to write stdout")?;
    stdout.write_all(b"\n")?;
    Ok(())
}
