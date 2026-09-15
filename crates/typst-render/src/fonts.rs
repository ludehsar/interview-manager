use typst::text::{Font, FontBook};
use typst::utils::LazyHash;

const FACES: [&[u8]; 4] = [
    include_bytes!("../fonts/Inter-Regular.ttf"),
    include_bytes!("../fonts/Inter-Italic.ttf"),
    include_bytes!("../fonts/Inter-SemiBold.ttf"),
    include_bytes!("../fonts/Inter-Bold.ttf"),
];

pub struct Fonts {
    pub book: LazyHash<FontBook>,
    pub fonts: Vec<Font>,
}

pub fn load() -> Fonts {
    let mut book = FontBook::new();
    let mut fonts = Vec::new();

    for face in FACES {
        let bytes = typst::foundations::Bytes::new(face.to_vec());
        for font in Font::iter(bytes) {
            book.push(font.info().clone());
            fonts.push(font);
        }
    }

    Fonts {
        book: LazyHash::new(book),
        fonts,
    }
}
