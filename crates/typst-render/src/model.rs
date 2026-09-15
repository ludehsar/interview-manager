use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Link {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Basics {
    #[serde(rename = "fullName")]
    pub full_name: String,
    pub headline: String,
    pub location: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    #[serde(default)]
    pub links: Vec<Link>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Summary {
    pub text: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Bullet {
    pub id: String,
    pub text: String,
    #[serde(default)]
    pub hidden: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Entry {
    pub id: String,
    pub title: String,
    pub organization: Option<String>,
    pub location: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
    #[serde(rename = "isCurrent", default)]
    pub is_current: bool,
    #[serde(default)]
    pub skills: Vec<String>,
    #[serde(default)]
    pub hidden: bool,
    #[serde(default)]
    pub bullets: Vec<Bullet>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Section {
    pub id: String,
    pub heading: String,
    #[serde(default)]
    pub hidden: bool,
    #[serde(default)]
    pub entries: Vec<Entry>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ResumeDocument {
    pub basics: Basics,
    pub summary: Summary,
    #[serde(default)]
    pub sections: Vec<Section>,
}
