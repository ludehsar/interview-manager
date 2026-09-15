pub mod fonts;
pub mod model;
pub mod template;
pub mod world;

use anyhow::Result;
use typst_layout::PagedDocument;

pub use model::ResumeDocument;
pub use template::{build_source, esc};

pub struct Pdf {
    pub bytes: Vec<u8>,
    pub page_count: u32,
}

pub fn compile(source: &str) -> Result<Pdf> {
    let world = world::ResumeWorld::new(source.to_string());
    let result = typst::compile::<PagedDocument>(&world);

    let document = result.output.map_err(|errors| {
        let detail = errors
            .iter()
            .map(|error| error.message.to_string())
            .collect::<Vec<_>>()
            .join("; ");
        anyhow::anyhow!("typst compilation failed: {detail}")
    })?;

    let bytes = typst_pdf::pdf(&document, &typst_pdf::PdfOptions::default())
        .map_err(|errors| anyhow::anyhow!("pdf export failed: {errors:?}"))?;

    Ok(Pdf {
        page_count: document.pages().len() as u32,
        bytes,
    })
}

pub fn render(template: &str, content: &serde_json::Value) -> Result<(String, Pdf)> {
    let doc: ResumeDocument = serde_json::from_value(content.clone())?;
    let source = build_source(template, &doc)?;
    let pdf = compile(&source)?;
    Ok((source, pdf))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn document() -> ResumeDocument {
        serde_json::from_value(serde_json::json!({
            "version": 1,
            "basics": {
                "fullName": "Rashedul Alam",
                "headline": "Senior Backend Engineer",
                "location": "Dhaka, Bangladesh",
                "email": "me@example.com",
                "phone": "+880 1700 000000",
                "links": [{"label": "GitHub", "url": "https://github.com/example"}]
            },
            "summary": {"text": "Backend engineer focused on latency and reliability."},
            "sections": [{
                "id": "sec_exp",
                "heading": "EXPERIENCE",
                "hidden": false,
                "entries": [{
                    "id": "res_ent_a",
                    "title": "Senior Backend Engineer",
                    "organization": "Acme",
                    "location": "Remote",
                    "startDate": "2022-03",
                    "endDate": null,
                    "isCurrent": true,
                    "skills": ["PostgreSQL", "Redis"],
                    "hidden": false,
                    "bullets": [
                        {"id": "b1", "text": "Cut checkout p95 latency from 900 ms to 240 ms", "hidden": false},
                        {"id": "b2", "text": "Hidden bullet that must not reach the page", "hidden": true}
                    ]
                }]
            }]
        }))
        .expect("fixture parses")
    }

    #[test]
    fn renders_a_pdf() {
        let doc = document();
        let source = build_source("ats", &doc).expect("source builds");
        let pdf = compile(&source).expect("compiles");
        assert!(pdf.bytes.starts_with(b"%PDF"));
        assert!(pdf.page_count >= 1);
    }

    #[test]
    fn skips_hidden_bullets_and_entries() {
        let source = build_source("ats", &document()).expect("source builds");
        assert!(source.contains("Cut checkout p95 latency"));
        assert!(!source.contains("Hidden bullet"));
    }

    #[test]
    fn escapes_typst_syntax_so_markup_cannot_leak() {
        assert_eq!(
            esc("cost #1 *bold* $x$ [link]"),
            "cost \\#1 \\*bold\\* \\$x\\$ \\[link\\]"
        );
    }

    #[test]
    fn renders_a_bullet_containing_typst_syntax() {
        let mut doc = document();
        doc.sections[0].entries[0].bullets[0].text =
            "Cut #1 cost centre by 40% using *Redis* and $EXPR$ [see notes]".to_string();
        let source = build_source("ats", &doc).expect("source builds");
        let pdf = compile(&source).expect("compiles");
        assert!(pdf.bytes.starts_with(b"%PDF"));
    }

    #[test]
    fn rejects_an_unknown_template() {
        assert!(build_source("fancy", &document()).is_err());
    }

    #[test]
    fn renders_every_visible_entry_across_sections() {
        let mut doc = document();
        let mut second = doc.sections[0].clone();
        second.id = "sec_proj".to_string();
        second.heading = "PROJECTS".to_string();
        second.entries[0].title = "Open Source Scheduler".to_string();
        doc.sections.push(second);

        let source = build_source("ats", &doc).expect("source builds");
        assert!(source.contains("= EXPERIENCE"));
        assert!(source.contains("= PROJECTS"));
        assert!(source.contains("Open Source Scheduler"));
    }
}
