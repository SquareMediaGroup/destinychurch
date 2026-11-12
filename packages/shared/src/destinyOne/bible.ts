// Destiny One — Bible references (the pure half of the Bible connection).
//
// Finds references in ordinary writing ("John 3:16", "1 Cor 13:4-7", "Rom
// 8:28-30", "Psalm 23") and turns them into YouVersion passage ids (USFM:
// "JHN.3.16", "1CO.13.4-7", "PSA.23"). Shared by the app and the server, so the
// verse a message shows is the one its sender typed, whichever side looks.
//
// Kept careful about false alarms, because it runs over every message:
//   * a book's full name may stand alone with a chapter ("Psalm 23", "Romans 8"),
//     but only capitalised: "numbers 3" in a sentence isn't Numbers 3;
//   * an abbreviation ("Rom", "1 Cor", "Ps") needs a capital and chapter:verse
//     ("Rom 8:28"), and so does a book that is also a name or a word ("Mark",
//     "Job", "James", "Numbers"), so "Mark 2 people" never becomes a verse;
//   * no abbreviation is an everyday short word ("Is", "Am"), so "Meeting is 3:30"
//     is a time, not Isaiah;
//   * the chapter must exist (no "John 99"), and a verse is 1 to 176.
// One-chapter books take a lone number as the verse ("Jude 3" is Jude 1:3).
// A range across chapters ("Rom 8:28-9:2") is cut to where it starts: the API
// can't return one passage across a chapter break.

export interface BibleBook {
  /** USFM book id, as YouVersion uses it. */
  id: string;
  /** How the app writes it ("1 Corinthians", "Psalm" for one psalm). */
  name: string;
  chapters: number;
  /** Other full names people write. */
  names?: string[];
  /** Short forms, which need chapter:verse to count. */
  abbr: string[];
  /** Also an everyday word or first name ("Mark", "Job", "James"): needs chapter:verse even written out. */
  strict?: boolean;
}

export const BIBLE_BOOKS: readonly BibleBook[] = [
  { id: "GEN", name: "Genesis", chapters: 50, abbr: ["Gen", "Gn"] },
  { id: "EXO", name: "Exodus", chapters: 40, abbr: ["Exod", "Exo", "Ex"] },
  { id: "LEV", name: "Leviticus", chapters: 27, abbr: ["Lev", "Lv"] },
  { id: "NUM", name: "Numbers", strict: true, chapters: 36, abbr: ["Num", "Nm"] },
  { id: "DEU", name: "Deuteronomy", chapters: 34, abbr: ["Deut", "Deu", "Dt"] },
  { id: "JOS", name: "Joshua", chapters: 24, abbr: ["Josh", "Jos"] },
  { id: "JDG", name: "Judges", strict: true, chapters: 21, abbr: ["Judg", "Jdg"] },
  { id: "RUT", name: "Ruth", strict: true, chapters: 4, abbr: ["Rth", "Ru"] },
  { id: "1SA", name: "1 Samuel", chapters: 31, abbr: ["1 Sam", "1Sam", "1 Sa", "1Sa"] },
  { id: "2SA", name: "2 Samuel", chapters: 24, abbr: ["2 Sam", "2Sam", "2 Sa", "2Sa"] },
  { id: "1KI", name: "1 Kings", chapters: 22, abbr: ["1 Kgs", "1Kgs", "1 Ki", "1Ki"] },
  { id: "2KI", name: "2 Kings", chapters: 25, abbr: ["2 Kgs", "2Kgs", "2 Ki", "2Ki"] },
  { id: "1CH", name: "1 Chronicles", chapters: 29, abbr: ["1 Chron", "1 Chr", "1Chr", "1 Ch", "1Ch"] },
  { id: "2CH", name: "2 Chronicles", chapters: 36, abbr: ["2 Chron", "2 Chr", "2Chr", "2 Ch", "2Ch"] },
  { id: "EZR", name: "Ezra", chapters: 10, abbr: ["Ezr"] },
  { id: "NEH", name: "Nehemiah", chapters: 13, abbr: ["Neh"] },
  { id: "EST", name: "Esther", chapters: 10, abbr: ["Esth", "Est"] },
  { id: "JOB", name: "Job", strict: true, chapters: 42, abbr: [] },
  { id: "PSA", name: "Psalm", chapters: 150, names: ["Psalms"], abbr: ["Pss", "Psa", "Ps"] },
  { id: "PRO", name: "Proverbs", chapters: 31, abbr: ["Prov", "Pro", "Prv"] },
  { id: "ECC", name: "Ecclesiastes", chapters: 12, abbr: ["Eccl", "Ecc"] },
  { id: "SNG", name: "Song of Songs", chapters: 8, names: ["Song of Solomon"], abbr: ["Song", "SoS"] },
  { id: "ISA", name: "Isaiah", chapters: 66, abbr: ["Isa"] },
  { id: "JER", name: "Jeremiah", chapters: 52, abbr: ["Jer"] },
  { id: "LAM", name: "Lamentations", chapters: 5, abbr: ["Lam"] },
  { id: "EZK", name: "Ezekiel", chapters: 48, abbr: ["Ezek", "Ezk"] },
  { id: "DAN", name: "Daniel", chapters: 12, abbr: ["Dan", "Dn"] },
  { id: "HOS", name: "Hosea", chapters: 14, abbr: ["Hos"] },
  { id: "JOL", name: "Joel", chapters: 3, abbr: ["Jl"] },
  { id: "AMO", name: "Amos", chapters: 9, abbr: ["Amo"] },
  { id: "OBA", name: "Obadiah", chapters: 1, abbr: ["Obad", "Ob"] },
  { id: "JON", name: "Jonah", chapters: 4, abbr: ["Jnh"] },
  { id: "MIC", name: "Micah", chapters: 7, abbr: ["Mic"] },
  { id: "NAM", name: "Nahum", chapters: 3, abbr: ["Nah"] },
  { id: "HAB", name: "Habakkuk", chapters: 3, abbr: ["Hab"] },
  { id: "ZEP", name: "Zephaniah", chapters: 3, abbr: ["Zeph", "Zep"] },
  { id: "HAG", name: "Haggai", chapters: 2, abbr: ["Hag"] },
  { id: "ZEC", name: "Zechariah", chapters: 14, abbr: ["Zech", "Zec"] },
  { id: "MAL", name: "Malachi", chapters: 4, abbr: ["Mal"] },
  { id: "MAT", name: "Matthew", chapters: 28, abbr: ["Matt", "Mat", "Mt"] },
  { id: "MRK", name: "Mark", strict: true, chapters: 16, abbr: ["Mrk", "Mk"] },
  { id: "LUK", name: "Luke", chapters: 24, abbr: ["Luk", "Lk"] },
  { id: "JHN", name: "John", chapters: 21, abbr: ["Jhn", "Jn"] },
  { id: "ACT", name: "Acts", chapters: 28, abbr: ["Act"] },
  { id: "ROM", name: "Romans", chapters: 16, abbr: ["Rom", "Rm"] },
  { id: "1CO", name: "1 Corinthians", chapters: 16, abbr: ["1 Cor", "1Cor", "1 Co", "1Co"] },
  { id: "2CO", name: "2 Corinthians", chapters: 13, abbr: ["2 Cor", "2Cor", "2 Co", "2Co"] },
  { id: "GAL", name: "Galatians", chapters: 6, abbr: ["Gal"] },
  { id: "EPH", name: "Ephesians", chapters: 6, abbr: ["Eph"] },
  { id: "PHP", name: "Philippians", chapters: 4, abbr: ["Phil", "Php"] },
  { id: "COL", name: "Colossians", chapters: 4, abbr: ["Col"] },
  { id: "1TH", name: "1 Thessalonians", chapters: 5, abbr: ["1 Thess", "1Thess", "1 Th", "1Th"] },
  { id: "2TH", name: "2 Thessalonians", chapters: 3, abbr: ["2 Thess", "2Thess", "2 Th", "2Th"] },
  { id: "1TI", name: "1 Timothy", chapters: 6, abbr: ["1 Tim", "1Tim", "1 Ti", "1Ti"] },
  { id: "2TI", name: "2 Timothy", chapters: 4, abbr: ["2 Tim", "2Tim", "2 Ti", "2Ti"] },
  { id: "TIT", name: "Titus", chapters: 3, abbr: ["Tit"] },
  { id: "PHM", name: "Philemon", chapters: 1, abbr: ["Phlm", "Phm"] },
  { id: "HEB", name: "Hebrews", chapters: 13, abbr: ["Heb"] },
  { id: "JAS", name: "James", strict: true, chapters: 5, abbr: ["Jas", "Jm"] },
  { id: "1PE", name: "1 Peter", chapters: 5, abbr: ["1 Pet", "1Pet", "1 Pe", "1Pe"] },
  { id: "2PE", name: "2 Peter", chapters: 3, abbr: ["2 Pet", "2Pet", "2 Pe", "2Pe"] },
  { id: "1JN", name: "1 John", chapters: 5, abbr: ["1 Jn", "1Jn", "1 Jhn"] },
  { id: "2JN", name: "2 John", chapters: 1, abbr: ["2 Jn", "2Jn", "2 Jhn"] },
  { id: "3JN", name: "3 John", chapters: 1, abbr: ["3 Jn", "3Jn", "3 Jhn"] },
  { id: "JUD", name: "Jude", chapters: 1, abbr: ["Jud"] },
  { id: "REV", name: "Revelation", chapters: 22, names: ["Revelations"], abbr: ["Rev", "Rv"] },
];

const BY_ID = new Map(BIBLE_BOOKS.map((b) => [b.id, b]));
const MAX_VERSE = 176;

export interface BibleReference {
  /** The passage id YouVersion takes: "JHN.3.16", "JHN.3.16-18", "PSA.23". */
  passageId: string;
  /** How the app writes it: "John 3:16-18", "Psalm 23". */
  label: string;
  book: string;
  chapter: number;
  /** Null for a whole chapter. */
  verseStart: number | null;
  verseEnd: number | null;
  /** Where in the text it was found, and how long the match was. */
  index: number;
  length: number;
}

/** "1 Corinthians" also as "1st Corinthians", "First Corinthians", "I Corinthians" (and the same for 2 and 3). */
function numberedForms(name: string): string[] {
  const m = /^([123]) (.+)$/.exec(name);
  if (!m) return [name];
  const [, n, rest] = m;
  const words = { "1": ["1st", "First", "I"], "2": ["2nd", "Second", "II"], "3": ["3rd", "Third", "III"] }[n as "1" | "2" | "3"];
  return [name, `${n}${rest}`, ...words.map((w) => `${w} ${rest}`)];
}

interface Alias {
  text: string;
  book: BibleBook;
  /** A full name (may stand alone with a chapter) rather than a short form (needs chapter:verse). */
  full: boolean;
}

const ALIASES: Alias[] = BIBLE_BOOKS.flatMap((b) => [
  ...[b.name, ...(b.names ?? [])].flatMap(numberedForms).map((text) => ({ text, book: b, full: true })),
  ...b.abbr.map((text) => ({ text, book: b, full: false })),
])
  // Longest first, so "1 John" wins over "John" and "Song of Songs" over "Song".
  .sort((a, b) => b.text.length - a.text.length);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");

// Book, an optional full stop after a short form, the chapter, and optionally
// :verse (or .verse) with an optional -end (or a cross-chapter -chapter:verse,
// cut to its start). Not glued to a letter or digit on either side.
const PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${ALIASES.map((a) => escape(a.text)).join("|")})\\.?\\s*(\\d{1,3})(?:\\s*[:.]\\s*(\\d{1,3})(?:\\s*[-\u2013\u2014]\\s*(\\d{1,3})(?:\\s*:\\s*(\\d{1,3}))?)?)?(?![\\p{L}\\p{N}])`,
  "giu",
);

const ALIAS_BY_LOWER = new Map<string, Alias[]>();
for (const a of ALIASES) {
  const key = a.text.toLowerCase().replace(/\s+/g, " ");
  ALIAS_BY_LOWER.set(key, [...(ALIAS_BY_LOWER.get(key) ?? []), a]);
}

function resolve(written: string): Alias | null {
  const norm = written.replace(/\s+/g, " ");
  const options = ALIAS_BY_LOWER.get(norm.toLowerCase());
  if (!options) return null;
  // The same letters as written, if one matches exactly ("John" vs "john"), else the first.
  return options.find((o) => o.text === norm) ?? options[0];
}

function build(book: BibleBook, chapter: number, verseStart: number | null, verseEnd: number | null, index: number, length: number): BibleReference | null {
  // A one-chapter book: "Jude 3" is verse 3. "Jude 1:3" is the same verse, written out.
  if (book.chapters === 1 && verseStart === null) {
    if (chapter === 1) return { passageId: `${book.id}.1`, label: book.name, book: book.id, chapter: 1, verseStart: null, verseEnd: null, index, length };
    verseStart = chapter;
    chapter = 1;
  }
  if (chapter < 1 || chapter > book.chapters) return null;
  if (verseStart !== null && (verseStart < 1 || verseStart > MAX_VERSE)) return null;
  if (verseEnd !== null && (verseStart === null || verseEnd <= verseStart || verseEnd > MAX_VERSE)) verseEnd = null;

  const chapterLabel = book.chapters === 1 ? `${book.name} ` : `${book.name} ${chapter}`;
  const label =
    verseStart === null
      ? chapterLabel
      : book.chapters === 1
        ? `${chapterLabel}${verseStart}${verseEnd ? `-${verseEnd}` : ""}`
        : `${chapterLabel}:${verseStart}${verseEnd ? `-${verseEnd}` : ""}`;
  const passageId = verseStart === null ? `${book.id}.${chapter}` : `${book.id}.${chapter}.${verseStart}${verseEnd ? `-${verseEnd}` : ""}`;
  return { passageId, label: label.trim(), book: book.id, chapter, verseStart, verseEnd, index, length };
}

/** Every Bible reference in `text`, in order. */
export function findReferences(text: string | null | undefined): BibleReference[] {
  if (!text) return [];
  const out: BibleReference[] = [];
  for (const m of text.matchAll(PATTERN)) {
    const alias = resolve(m[1]);
    if (!alias) continue;
    const hasVerse = m[3] !== undefined;
    // The first letter, past a book number ("1 Cor", "3 John").
    const letter = /\p{L}/u.exec(m[1])?.[0] ?? "";
    const capital = letter !== letter.toLowerCase();
    // A short form needs a capital and chapter:verse ("Rom 8:28", not "rom 8").
    if (!alias.full && (!hasVerse || !capital)) continue;
    // A name that is also a word or a first name needs chapter:verse ("Mark 4:3", not "Mark 4").
    if (alias.book.strict && !hasVerse) continue;
    // A full name alone with a chapter needs a capital ("Psalm 23", not "psalm 23"); with
    // chapter:verse lower case is fine ("john 3:16").
    if (!hasVerse && !capital) continue;
    // "Rom 8:28-9:2" crosses into chapter 9: keep where it starts.
    const crossesChapter = m[5] !== undefined;
    const ref = build(alias.book, Number(m[2]), hasVerse ? Number(m[3]) : null, m[4] !== undefined && !crossesChapter ? Number(m[4]) : null, m.index ?? 0, m[0].length);
    if (ref) out.push(ref);
  }
  return out;
}

/** The first Bible reference in `text`, if any: the one a message's verse card shows. */
export function findReference(text: string | null | undefined): BibleReference | null {
  return findReferences(text)[0] ?? null;
}

/** A passage id ("1CO.13.4-7") as the app writes it ("1 Corinthians 13:4-7"). Null for an id it doesn't recognise. */
export function passageLabel(passageId: string): string | null {
  const m = /^([1-3]?[A-Z]{2,3})\.(\d{1,3})(?:\.(\d{1,3})(?:-(\d{1,3}))?)?$/.exec(passageId);
  if (!m) return null;
  const book = BY_ID.get(m[1]);
  if (!book) return null;
  const ref = build(book, Number(m[2]), m[3] ? Number(m[3]) : null, m[4] ? Number(m[4]) : null, 0, 0);
  // A one-chapter book's id is BOOK.1.v: build() reads "Jude 1:3" written that way the same.
  if (!ref) return null;
  return ref.label;
}

/** Whether `passageId` is one this module would produce (used to check ids from the app and the API). */
export function isPassageId(passageId: string): boolean {
  return passageLabel(passageId) !== null;
}

/** The passage on bible.com, which opens the YouVersion Bible App when it is installed. */
export function bibleWebUrl(bibleId: number, passageId: string, abbreviation: string): string {
  return `https://www.bible.com/bible/${bibleId}/${passageId}.${abbreviation.replace(/[^A-Za-z0-9]/g, "")}`;
}
