import Testing
@testable import LiveCaption

struct VocabularyPromptTests {
    @Test func combinesPreambleAndVocabulary() {
        let prompt = VocabularyPrompt.build(preamble: "A sermon at Destiny Church.", vocabulary: ["Malachi", "Zephaniah"])
        #expect(prompt.contains("Destiny"))
        #expect(prompt.contains("Malachi"))
        #expect(prompt.contains("Zephaniah"))
    }

    @Test func truncatesToMaxWordCount() {
        let hugeVocabulary = (0..<200).map { "Word\($0)" }
        let prompt = VocabularyPrompt.build(preamble: "", vocabulary: hugeVocabulary)
        let wordCount = prompt.split(separator: " ").count
        #expect(wordCount <= VocabularyPrompt.maxWordCount)
    }

    @Test func dropsEmptyVocabularyEntries() {
        let prompt = VocabularyPrompt.build(preamble: "", vocabulary: ["", "  ", "Genesis"])
        #expect(prompt.trimmingCharacters(in: .whitespaces) == "Genesis")
    }
}
