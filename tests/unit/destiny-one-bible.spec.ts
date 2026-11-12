import { test, expect } from "@playwright/test";
import { BIBLE_BOOKS, bibleWebUrl, findReference, findReferences, isPassageId, passageLabel } from "../../packages/shared/src/destinyOne/bible";

/**
 * The reference finder runs over every message, so it has to find what people
 * really type and leave alone what isn't a verse (times, names, everyday words).
 */

const ref = (text: string) => {
  const r = findReference(text);
  return r ? { id: r.passageId, label: r.label } : null;
};

test.describe("finding references", () => {
  test("the forms in the scope doc", () => {
    expect(ref("John 3:16")).toEqual({ id: "JHN.3.16", label: "John 3:16" });
    expect(ref("Rom 8:28-30")).toEqual({ id: "ROM.8.28-30", label: "Romans 8:28-30" });
    expect(ref("Psalm 23")).toEqual({ id: "PSA.23", label: "Psalm 23" });
    expect(ref("1 Cor 13:4-7")).toEqual({ id: "1CO.13.4-7", label: "1 Corinthians 13:4-7" });
  });

  test("inside ordinary writing, with punctuation around it", () => {
    expect(ref("This week we're in Philippians 4:6-7, see you Sunday!")).toEqual({ id: "PHP.4.6-7", label: "Philippians 4:6-7" });
    expect(ref("(Isaiah 40:31)")?.id).toBe("ISA.40.31");
    expect(ref("Read Romans 8.")?.id).toBe("ROM.8");
  });

  test("numbered books, every way they're written", () => {
    expect(ref("1 John 4:8")?.id).toBe("1JN.4.8");
    expect(ref("John 4:8")?.id).toBe("JHN.4.8");
    expect(ref("2 Timothy 1:7")?.id).toBe("2TI.1.7");
    expect(ref("2Tim 1:7")?.id).toBe("2TI.1.7");
    expect(ref("First Corinthians 13:13")?.id).toBe("1CO.13.13");
    expect(ref("II Corinthians 5:17")?.id).toBe("2CO.5.17");
    expect(ref("1st Peter 5:7")?.id).toBe("1PE.5.7");
  });

  test("abbreviations, with or without a full stop", () => {
    expect(ref("Ps 46:10")?.id).toBe("PSA.46.10");
    expect(ref("Prov. 3:5-6")?.id).toBe("PRO.3.5-6");
    expect(ref("Matt 6:33")?.id).toBe("MAT.6.33");
    expect(ref("Gen 1:1")?.id).toBe("GEN.1.1");
  });

  test("other spellings and dashes", () => {
    expect(ref("Psalms 121")?.label).toBe("Psalm 121");
    expect(ref("Song of Solomon 2:4")?.id).toBe("SNG.2.4");
    expect(ref("Revelations 21:4")?.id).toBe("REV.21.4");
    expect(ref("John 3:16–18")?.id).toBe("JHN.3.16-18");
    expect(ref("john 3:16")?.id).toBe("JHN.3.16");
  });

  test("one-chapter books take a lone number as the verse", () => {
    expect(ref("Jude 3")).toEqual({ id: "JUD.1.3", label: "Jude 3" });
    expect(ref("Jude 1:24-25")).toEqual({ id: "JUD.1.24-25", label: "Jude 24-25" });
    expect(ref("Philemon 1")).toEqual({ id: "PHM.1", label: "Philemon" });
    expect(ref("3 John 4")?.id).toBe("3JN.1.4");
  });

  test("a range across chapters is cut to where it starts", () => {
    expect(ref("Rom 8:28-9:2")?.id).toBe("ROM.8.28");
  });

  test("references that don't exist give no card", () => {
    expect(ref("John 99:1")).toBeNull();
    expect(ref("Psalm 151")).toBeNull();
    expect(ref("John 3:0")).toBeNull();
    expect(ref("John 3:999")).toBeNull();
  });

  test("a backwards range is read as its first verse", () => {
    expect(ref("John 3:18-16")?.id).toBe("JHN.3.18");
  });

  test("times, names and everyday words are left alone", () => {
    for (const text of [
      "Meeting is 3:30 tomorrow",
      "I am 3 minutes late",
      "Mark 2 people down for Saturday",
      "Job 3 is done",
      "James 4 of us are coming",
      "numbers 3 and 4",
      "my job 3 days a week",
      "see you at 10:30",
      "rom 8:28",
      "psalm 23",
      "Room 12:30",
      "the song 2:40 long",
    ]) {
      expect(ref(text), text).toBeNull();
    }
  });

  test("but a name with chapter:verse is a verse", () => {
    expect(ref("Mark 4:39")?.id).toBe("MRK.4.39");
    expect(ref("James 1:5")?.id).toBe("JAS.1.5");
    expect(ref("Job 19:25")?.id).toBe("JOB.19.25");
  });

  test("every reference in a note, in order, with where it was", () => {
    const text = "Main points: John 3:16 and then Romans 8:28. Also Psalm 23.";
    const all = findReferences(text);
    expect(all.map((r) => r.passageId)).toEqual(["JHN.3.16", "ROM.8.28", "PSA.23"]);
    expect(text.slice(all[1].index, all[1].index + all[1].length)).toBe("Romans 8:28");
    expect(findReferences(null)).toEqual([]);
  });
});

test.describe("passage ids", () => {
  test("label an id the way the app writes it", () => {
    expect(passageLabel("JHN.3.16")).toBe("John 3:16");
    expect(passageLabel("1CO.13.4-7")).toBe("1 Corinthians 13:4-7");
    expect(passageLabel("PSA.23")).toBe("Psalm 23");
    expect(passageLabel("JUD.1.3")).toBe("Jude 3");
    expect(passageLabel("XYZ.1.1")).toBeNull();
    expect(passageLabel("JHN.99.1")).toBeNull();
    expect(passageLabel("JHN.3.16; DROP TABLE")).toBeNull();
  });

  test("only ids the finder makes are accepted", () => {
    expect(isPassageId("ROM.8.28-30")).toBe(true);
    expect(isPassageId("ROM.8.28-9.2")).toBe(false);
    expect(isPassageId("../../etc")).toBe(false);
  });

  test("66 books with their USFM ids", () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(new Set(BIBLE_BOOKS.map((b) => b.id)).size).toBe(66);
    expect(BIBLE_BOOKS.reduce((n, b) => n + b.chapters, 0)).toBe(1189);
  });

  test("the bible.com link", () => {
    expect(bibleWebUrl(113, "JHN.3.16", "NIVUK")).toBe("https://www.bible.com/bible/113/JHN.3.16.NIVUK");
  });
});
