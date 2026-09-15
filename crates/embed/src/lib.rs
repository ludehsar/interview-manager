use anyhow::{Context, Result};
use fastembed::{
    InitOptionsUserDefined, Pooling, QuantizationMode, TextEmbedding, TokenizerFiles,
    UserDefinedEmbeddingModel,
};

pub const DIMENSIONS: usize = 384;
pub const MAX_BATCH: usize = 64;

const ONNX: &[u8] = include_bytes!("../models/bge-small-en-v1.5/model_quantized.onnx");
const TOKENIZER: &[u8] = include_bytes!("../models/bge-small-en-v1.5/tokenizer.json");
const CONFIG: &[u8] = include_bytes!("../models/bge-small-en-v1.5/config.json");
const SPECIAL_TOKENS: &[u8] = include_bytes!("../models/bge-small-en-v1.5/special_tokens_map.json");
const TOKENIZER_CONFIG: &[u8] = include_bytes!("../models/bge-small-en-v1.5/tokenizer_config.json");

pub struct Embedder {
    model: TextEmbedding,
}

impl Embedder {
    pub fn new() -> Result<Self> {
        let definition = UserDefinedEmbeddingModel {
            onnx_file: ONNX.to_vec(),
            tokenizer_files: TokenizerFiles {
                tokenizer_file: TOKENIZER.to_vec(),
                config_file: CONFIG.to_vec(),
                special_tokens_map_file: SPECIAL_TOKENS.to_vec(),
                tokenizer_config_file: TOKENIZER_CONFIG.to_vec(),
            },
            pooling: Some(Pooling::Cls),
            quantization: QuantizationMode::None,
            external_initializers: Default::default(),
            output_key: None,
        };

        let model =
            TextEmbedding::try_new_from_user_defined(definition, InitOptionsUserDefined::default())
                .context("failed to initialise the bge-small-en-v1.5 embedder")?;

        Ok(Self { model })
    }

    pub fn embed_batch(&mut self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        let mut vectors = Vec::with_capacity(texts.len());
        for chunk in texts.chunks(MAX_BATCH) {
            let batch: Vec<&str> = chunk.iter().map(String::as_str).collect();
            let embedded = self
                .model
                .embed(batch, None)
                .context("embedding a batch failed")?;
            vectors.extend(embedded);
        }

        for vector in &vectors {
            if vector.len() != DIMENSIONS {
                anyhow::bail!(
                    "expected {DIMENSIONS} dimensions, model returned {}",
                    vector.len()
                );
            }
        }

        Ok(vectors)
    }
}

pub fn cosine(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot / (norm_a * norm_b)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn embedder() -> Embedder {
        Embedder::new().expect("embedder initialises")
    }

    #[test]
    fn produces_384_dimensions() {
        let mut model = embedder();
        let vectors = model
            .embed_batch(&["a backend engineer".to_string()])
            .expect("embeds");
        assert_eq!(vectors.len(), 1);
        assert_eq!(vectors[0].len(), DIMENSIONS);
    }

    #[test]
    fn is_deterministic() {
        let mut model = embedder();
        let text = vec!["kubernetes autoscaling".to_string()];
        let first = model.embed_batch(&text).expect("embeds");
        let second = model.embed_batch(&text).expect("embeds");
        assert!(cosine(&first[0], &second[0]) > 0.999);
    }

    #[test]
    fn ranks_related_text_above_unrelated_text() {
        let mut model = embedder();
        let texts = vec![
            "postgres database tuning".to_string(),
            "relational database indexes".to_string(),
            "a fluffy kitten sleeping".to_string(),
        ];
        let vectors = model.embed_batch(&texts).expect("embeds");
        let related = cosine(&vectors[0], &vectors[1]);
        let unrelated = cosine(&vectors[0], &vectors[2]);
        assert!(
            related > unrelated,
            "related {related} should beat unrelated {unrelated}"
        );
    }

    #[test]
    fn embeds_an_empty_slice() {
        assert!(embedder().embed_batch(&[]).expect("embeds").is_empty());
    }
}
