import hljs, {
  highlightCodeBlocks,
  loadLanguages,
} from "@/components/droplets/lessons/highlighter";

function codeRoot(className: string, code: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = `<pre><code class="${className}"></code></pre>`;
  root.querySelector("code")!.textContent = code;
  return root;
}

describe("highlighter language aliases", () => {
  it.each([
    ["yml", "yaml", "name: odyssey"],
    ["ps1", "powershell", "Get-ChildItem -Recurse"],
    ["md", "markdown", "# Title"],
    ["docker", "dockerfile", "FROM node:20"],
    ["hs", "haskell", "main = putStrLn 1"],
  ])(
    "loads %s through its alias and registers %s",
    async (alias, canonical, code) => {
      expect(hljs.getLanguage(canonical)).toBeUndefined();
      const root = codeRoot(`language-${alias}`, code);

      await expect(loadLanguages(root)).resolves.toBe(true);

      expect(hljs.getLanguage(canonical)).toBeDefined();
      expect(hljs.getLanguage(alias)).toBeDefined();
      highlightCodeBlocks(root);
      expect(root.querySelector("code")).toHaveAttribute(
        "data-highlighted",
        "yes",
      );
    },
  );

  it("ignores names that are neither a language nor an alias", async () => {
    const root = codeRoot("language-notareallanguage", "x");
    await expect(loadLanguages(root)).resolves.toBe(false);
  });

  it("does not treat an alias claimed by two grammars as loadable", async () => {
    const root = codeRoot("language-ml", "let x = 1");
    await expect(loadLanguages(root)).resolves.toBe(false);
  });
});
