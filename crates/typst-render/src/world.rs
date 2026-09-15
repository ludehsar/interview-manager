use typst::diag::{FileError, FileResult};
use typst::foundations::{Bytes, Datetime, Duration};
use typst::syntax::{FileId, RootedPath, Source, VirtualPath, VirtualRoot};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, LibraryExt, World};

use crate::fonts::{self, Fonts};

pub struct ResumeWorld {
    library: LazyHash<Library>,
    fonts: Fonts,
    main: FileId,
    source: Source,
}

impl ResumeWorld {
    pub fn new(text: String) -> Self {
        let vpath = VirtualPath::new("resume.typ").expect("resume.typ is a valid virtual path");
        let main = FileId::new(RootedPath::new(VirtualRoot::Project, vpath));
        Self {
            library: LazyHash::new(Library::default()),
            fonts: fonts::load(),
            main,
            source: Source::new(main, text),
        }
    }
}

impl World for ResumeWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.fonts.book
    }

    fn main(&self) -> FileId {
        self.main
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.main {
            Ok(self.source.clone())
        } else {
            Err(FileError::NotFound(id.vpath().get_without_slash().into()))
        }
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        Err(FileError::NotFound(id.vpath().get_without_slash().into()))
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.fonts.get(index).cloned()
    }

    fn today(&self, _offset: Option<Duration>) -> Option<Datetime> {
        None
    }
}
