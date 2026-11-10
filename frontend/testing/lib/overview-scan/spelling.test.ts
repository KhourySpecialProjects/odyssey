/** @jest-environment node */
import {
  likelyTypos,
  spellingContext,
  unknownWords,
} from "@/lib/overview-scan/spelling";

const typos = (text: string, code: string[] = [], droplet = text) =>
  likelyTypos(text, spellingContext([droplet], code));

describe("unknownWords", () => {
  it("knows dictionary, tech and mixed-case words", () => {
    expect(unknownWords("We use useState and the API in typescript.")).toEqual(
      [],
    );
  });

  it("lists words in no dictionary, once each", () => {
    expect(unknownWords("teh cat and teh dog")).toEqual(["teh"]);
  });

  it("ignores words in the block's inline code", () => {
    expect(unknownWords("Call frobnicate now", ["frobnicate"])).toEqual([]);
  });
});

describe("likelyTypos (ODY-924)", () => {
  it.each([
    ["teh", "Open teh file."],
    ["recieve", "We recieve the data."],
    ["seperate", "Keep them seperate."],
    ["accomodate", "It can accomodate more."],
    ["definately", "This is definately true."],
    ["occured", "An error occured today."],
    ["untill", "Wait untill noon."],
  ])("flags %s", (word, sentence) => {
    expect(typos(sentence)).toEqual([word]);
  });

  it("passes names, products and made-up identifiers", () => {
    expect(
      typos(
        "Then Ada Lovelace used Frobnicator with zorblat and totalscore, plus Kubernetes.",
      ),
    ).toEqual([]);
  });

  it("flags a capitalised typo at the start of a sentence, not mid-sentence", () => {
    expect(typos("Teh end. Ask Teh later.")).toEqual(["Teh"]);
  });

  it("passes a word that appears in code anywhere in the droplet", () => {
    const ctx = spellingContext(["Run it"], ["teh"]);
    expect(likelyTypos("Open teh file.", ctx)).toEqual([]);
  });

  it("passes a word used three or more times in the droplet", () => {
    const all = "teh one. teh two. teh three.";
    expect(typos("Open teh file.", [], all)).toEqual([]);
    expect(typos("Open teh file.", [], "teh one. teh two.")).toEqual(["teh"]);
  });

  it("makes no network call", () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch");
    typos("Open teh file.");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
