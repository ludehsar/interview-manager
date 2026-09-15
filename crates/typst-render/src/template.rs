use crate::model::{Entry, ResumeDocument, Section};

const PRELUDE: &str = include_str!("../templates/ats.typ");

pub fn esc(text: &str) -> String {
    let mut out = String::with_capacity(text.len() + 8);
    for ch in text.chars() {
        match ch {
            '#' | '*' | '_' | '`' | '<' | '>' | '@' | '$' | '\\' | '[' | ']' => {
                out.push('\\');
                out.push(ch);
            }
            _ => out.push(ch),
        }
    }
    out
}

fn period(entry: &Entry) -> String {
    let start = entry.start_date.clone().unwrap_or_default();
    let end = if entry.is_current {
        "Present".to_string()
    } else {
        entry.end_date.clone().unwrap_or_default()
    };

    match (start.is_empty(), end.is_empty()) {
        (true, true) => String::new(),
        (true, false) => end,
        (false, true) => start,
        (false, false) => format!("{start} -- {end}"),
    }
}

fn contact_line(doc: &ResumeDocument) -> String {
    let mut parts: Vec<String> = Vec::new();
    if let Some(location) = doc.basics.location.as_ref().filter(|v| !v.is_empty()) {
        parts.push(esc(location));
    }
    if let Some(email) = doc.basics.email.as_ref().filter(|v| !v.is_empty()) {
        parts.push(esc(email));
    }
    if let Some(phone) = doc.basics.phone.as_ref().filter(|v| !v.is_empty()) {
        parts.push(esc(phone));
    }
    for link in &doc.basics.links {
        parts.push(esc(&link.url));
    }
    parts.join(" · ")
}

fn visible_entries(section: &Section) -> Vec<&Entry> {
    section
        .entries
        .iter()
        .filter(|entry| !entry.hidden)
        .collect()
}

pub fn build_source(template: &str, doc: &ResumeDocument) -> anyhow::Result<String> {
    if template != "ats" && !template.is_empty() {
        anyhow::bail!("unknown template {template}");
    }

    let mut out = String::from(PRELUDE);
    out.push('\n');

    out.push_str(&format!(
        "#align(center)[#text(size: 18pt, weight: \"bold\")[{}]]\n",
        esc(&doc.basics.full_name)
    ));

    if !doc.basics.headline.is_empty() {
        out.push_str(&format!(
            "#align(center)[#text(size: 10.5pt)[{}]]\n",
            esc(&doc.basics.headline)
        ));
    }

    let contact = contact_line(doc);
    if !contact.is_empty() {
        out.push_str(&format!("#align(center)[#text(size: 9pt)[{contact}]]\n"));
    }

    out.push_str("#v(0.5em)\n");

    if !doc.summary.text.is_empty() {
        out.push_str(&format!("{}\n", esc(&doc.summary.text)));
        out.push_str("#v(0.3em)\n");
    }

    for section in doc.sections.iter().filter(|section| !section.hidden) {
        let entries = visible_entries(section);
        if entries.is_empty() {
            continue;
        }

        out.push_str(&format!("\n= {}\n", esc(&section.heading)));

        for entry in entries {
            let organization = entry
                .organization
                .as_ref()
                .filter(|v| !v.is_empty())
                .map(|v| format!(", {}", esc(v)))
                .unwrap_or_default();

            out.push_str(&format!(
                "*{}*{} #h(1fr) {}\n",
                esc(&entry.title),
                organization,
                esc(&period(entry))
            ));

            if let Some(location) = entry.location.as_ref().filter(|v| !v.is_empty()) {
                out.push_str(&format!(
                    "#text(size: 9pt, fill: rgb(\"#555555\"))[{}]\n",
                    esc(location)
                ));
            }

            let bullets: Vec<&crate::model::Bullet> = entry
                .bullets
                .iter()
                .filter(|bullet| !bullet.hidden)
                .collect();

            if !bullets.is_empty() {
                out.push('\n');
                for bullet in bullets {
                    out.push_str(&format!("- {}\n", esc(&bullet.text)));
                }
            }

            if !entry.skills.is_empty() {
                let skills = entry
                    .skills
                    .iter()
                    .map(|skill| esc(skill))
                    .collect::<Vec<_>>()
                    .join(", ");
                out.push_str(&format!("#text(size: 9pt)[{}]\n", skills));
            }

            out.push_str("#v(0.35em)\n");
        }
    }

    Ok(out)
}
