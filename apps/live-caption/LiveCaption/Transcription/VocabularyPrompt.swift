import Foundation

/// Builds whisper.cpp's `initial_prompt` string from user-supplied vocabulary.
/// This is prompt-biasing, not fine-tuning — whisper.cpp uses the prompt text
/// purely to bias decoding toward likely-next-tokens, so it must stay short
/// (tens of words, not paragraphs): a bloated prompt eats into the model's
/// available context and can measurably hurt accuracy rather than help it.
enum VocabularyPrompt {
    /// Practical ceiling on prompt length. Not a hard whisper.cpp limit (that
    /// depends on the model's context window), but a deliberately
    /// conservative default so the prompt never crowds out real audio
    /// context.
    static let maxWordCount = 60

    /// Comma-separated names, with no framing sentence and no full stop.
    /// Measured with `make pipeline-check` against alternatives:
    /// - A bare space-separated list ("Genesis Exodus Leviticus") nudged
    ///   captions Into Title Case.
    /// - A sentence-style prompt ("Welcome to the service... Names you may
    ///   hear today include ...") reads to Whisper like the start of a talk,
    ///   so it skipped the half-sentence each window opens on — roughly
    ///   doubling the word error rate on fast speech.
    static func build(preamble: String, vocabulary: [String]) -> String {
        let cleanedVocabulary = vocabulary
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        let trimmedPreamble = preamble.trimmingCharacters(in: .whitespacesAndNewlines)

        var wordCount = trimmedPreamble.split(separator: " ").count
        var terms: [String] = []
        for term in cleanedVocabulary {
            let termWords = term.split(separator: " ").count
            guard wordCount + termWords <= maxWordCount else { break }
            terms.append(term)
            wordCount += termWords
        }

        return ([trimmedPreamble] + [terms.joined(separator: ", ")])
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }

    /// v1 default vocabulary — church name, common local place names, and the
    /// standard 66 books of the Bible. Editable via Settings from Phase 5;
    /// this hardcoded default exists so the plumbing (`WhisperEngine`'s
    /// `initialPrompt` parameter) is exercised from Phase 1 onward.
    static let defaultVocabulary: [String] = bibleBooks

    static let bibleBooks: [String] = [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
        "Samuel", "Kings", "Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
        "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
        "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah",
        "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
        "Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "Thessalonians",
        "Timothy", "Titus", "Philemon", "Hebrews", "James", "Peter", "Jude", "Revelation",
    ]
}
