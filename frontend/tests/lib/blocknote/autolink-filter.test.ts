import {
  isAutolinkFalsePositive,
  isSafeLinkHref,
  linkTextLooksLikeRealUrl,
} from "@/lib/blocknote/autolink-filter";

describe("autolink-filter", () => {
  describe("linkTextLooksLikeRealUrl", () => {
    it.each([
      ["https://google.com", true],
      ["http://example.com", true],
      ["www.example.com", true],
      ["mailto:a@b.com", true],
      ["tel:+14155551212", true],
      ["ftp://files.example.com", true],
      ["HTTPS://MIXED.CASE", true],
      ["app.py", false],
      ["requirements.txt", false],
      ["data.csv", false],
      ["click here", false],
      ["", false],
    ])("%s -> %s", (input, expected) => {
      expect(linkTextLooksLikeRealUrl(input)).toBe(expected);
    });
  });

  describe("isSafeLinkHref", () => {
    it.each([
      ["https://google.com", true],
      ["http://example.com", true],
      ["mailto:a@b.com", true],
      ["tel:+14155551212", true],
      ["/relative/path", true],
      ["#anchor", true],
      ["?query=1", true],
      ["javascript:alert(1)", false],
      ["JavaScript:alert(1)", false],
      ["data:text/html,<script>", false],
      ["vbscript:msgbox", false],
      ["file:///etc/passwd", false],
      ["", false],
      [null, false],
      [undefined, false],
    ])("%s -> %s", (input, expected) => {
      expect(isSafeLinkHref(input)).toBe(expected);
    });
  });

  describe("isAutolinkFalsePositive", () => {
    // Autolink false-positives: href equals "scheme://" + text, and text
    // doesn't look like a URL on its own.
    it("strips `app.py` auto-wrapped as https://app.py", () => {
      expect(isAutolinkFalsePositive("app.py", "https://app.py")).toBe(true);
    });

    it("strips `requirements.txt` auto-wrapped", () => {
      expect(
        isAutolinkFalsePositive("requirements.txt", "https://requirements.txt"),
      ).toBe(true);
    });

    it("strips `data.csv` auto-wrapped", () => {
      expect(isAutolinkFalsePositive("data.csv", "https://data.csv")).toBe(
        true,
      );
    });

    // Real URLs with matching text are preserved.
    it("keeps href=text when text already has a scheme", () => {
      expect(
        isAutolinkFalsePositive("https://google.com", "https://google.com"),
      ).toBe(false);
    });

    it("keeps `www.` prefixed text", () => {
      expect(
        isAutolinkFalsePositive("www.example.com", "https://www.example.com"),
      ).toBe(false);
    });

    // Manual links: href differs from text, always kept.
    it("keeps manual link with arbitrary text (click here)", () => {
      expect(isAutolinkFalsePositive("click here", "https://openai.com")).toBe(
        false,
      );
    });

    it("keeps manual mailto link with arbitrary text", () => {
      expect(
        isAutolinkFalsePositive("email the team", "mailto:team@example.com"),
      ).toBe(false);
    });

    it("keeps manual link with scheme-in-text but different href", () => {
      expect(
        isAutolinkFalsePositive(
          "https://short.link",
          "https://actual-target.example.com",
        ),
      ).toBe(false);
    });

    // Guards
    it("returns false when href is empty", () => {
      expect(isAutolinkFalsePositive("app.py", "")).toBe(false);
    });

    it("returns false when href is nullish", () => {
      expect(isAutolinkFalsePositive("app.py", null)).toBe(false);
      expect(isAutolinkFalsePositive("app.py", undefined)).toBe(false);
    });
  });
});
