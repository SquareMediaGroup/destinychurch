/// Practical ceiling on prompt length. A bloated prompt eats model context and
/// can hurt accuracy, so keep it to tens of words.
pub const MAX_WORD_COUNT: usize = 60;

/// Build the speech model's initial prompt from a preamble plus vocabulary.
pub fn build_prompt(preamble: &str, vocabulary: &[String]) -> String {
    let mut words: Vec<&str> = preamble.split_whitespace().collect();
    for term in vocabulary.iter().map(|t| t.trim()).filter(|t| !t.is_empty()) {
        if words.len() >= MAX_WORD_COUNT {
            break;
        }
        words.push(term);
    }
    words.join(" ")
}

pub const BIBLE_BOOKS: &[&str] = &[
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
    "Samuel", "Kings", "Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
    "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
    "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah",
    "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
    "Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "Thessalonians",
    "Timothy", "Titus", "Philemon", "Hebrews", "James", "Peter", "Jude", "Revelation",
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn caps_prompt_and_skips_blanks() {
        let vocab: Vec<String> = std::iter::once("  ".to_string())
            .chain((0..200).map(|i| format!("w{i}")))
            .collect();
        let prompt = build_prompt("Destiny Church sermon.", &vocab);
        assert_eq!(prompt.split_whitespace().count(), MAX_WORD_COUNT);
        assert!(prompt.starts_with("Destiny Church sermon. w0"));
    }
}
