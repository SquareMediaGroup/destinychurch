use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Layout {
    LowerThird,
    FullScreen,
    SidePanel,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Reveal {
    /// Show whole stable words as they confirm.
    Phrase,
    /// Same, but the UI may animate each word in.
    WordByWord,
}

/// A caption preset. Switching presets live is just swapping this value.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CaptionFormat {
    pub name: String,
    pub layout: Layout,
    pub lines: usize,
    pub chars_per_line: usize,
    pub font_px: f32,
    pub reveal: Reveal,
}

impl CaptionFormat {
    pub fn lower_third() -> Self {
        Self {
            name: "Lower third, 2 lines".into(),
            layout: Layout::LowerThird,
            lines: 2,
            chars_per_line: 42,
            font_px: 56.0,
            reveal: Reveal::Phrase,
        }
    }

    pub fn full_screen() -> Self {
        Self {
            name: "Full screen verse".into(),
            layout: Layout::FullScreen,
            lines: 3,
            chars_per_line: 30,
            font_px: 96.0,
            reveal: Reveal::Phrase,
        }
    }

    /// Wrap `words` greedily to `chars_per_line` and keep the newest `lines`
    /// lines (roll-up behaviour: older lines scroll off the top).
    pub fn wrap<'a>(&self, words: impl IntoIterator<Item = &'a str>) -> Vec<String> {
        let width = self.chars_per_line.max(1);
        let mut out: Vec<String> = Vec::new();
        let mut line = String::new();
        for word in words {
            let needed = if line.is_empty() { word.len() } else { line.len() + 1 + word.len() };
            if !line.is_empty() && needed > width {
                out.push(std::mem::take(&mut line));
            }
            if !line.is_empty() {
                line.push(' ');
            }
            line.push_str(word);
        }
        if !line.is_empty() {
            out.push(line);
        }
        let keep = self.lines.max(1);
        let start = out.len().saturating_sub(keep);
        out.split_off(start)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wraps_at_width() {
        let mut f = CaptionFormat::lower_third();
        f.chars_per_line = 10;
        f.lines = 5;
        assert_eq!(f.wrap("one two three four five".split(' ')), ["one two", "three four", "five"]);
    }

    #[test]
    fn keeps_newest_lines() {
        let mut f = CaptionFormat::lower_third();
        f.chars_per_line = 10;
        f.lines = 2;
        assert_eq!(f.wrap("one two three four five".split(' ')), ["three four", "five"]);
    }

    #[test]
    fn overlong_word_gets_its_own_line() {
        let mut f = CaptionFormat::lower_third();
        f.chars_per_line = 5;
        f.lines = 3;
        assert_eq!(f.wrap(["hi", "Thessalonians", "ok"]), ["hi", "Thessalonians", "ok"]);
    }

    #[test]
    fn preset_round_trips_json() {
        let f = CaptionFormat::full_screen();
        let back: CaptionFormat = serde_json::from_str(&serde_json::to_string(&f).unwrap()).unwrap();
        assert_eq!(f, back);
    }
}
