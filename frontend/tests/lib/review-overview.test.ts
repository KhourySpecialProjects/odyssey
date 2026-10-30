import { overviewFieldHtml } from "@/lib/review-overview";

describe("overviewFieldHtml", () => {
  const source = {
    name: "Loops & <More>",
    description: "<p>Learn <b>loops</b></p>",
    overview: "<p>Body</p>",
    objectives: ["Use a for loop", "Avoid <infinite> ones"],
  };

  it("builds each field's HTML as the page shows it", () => {
    expect(overviewFieldHtml(source, { titleClass: "title" })).toEqual({
      name: '<h1 class="title">Loops &amp; &lt;More&gt;</h1>',
      description: "<p>Learn loops</p>",
      overview: "<p>Body</p>",
      objective:
        '<ul class="list-disc pl-5"><li>Use a for loop</li><li>Avoid &lt;infinite&gt; ones</li></ul>',
    });
  });

  it("copes with missing fields", () => {
    expect(
      overviewFieldHtml({ name: null, overview: undefined, objectives: [] }),
    ).toMatchObject({
      name: '<h1 class=""></h1>',
      description: "<p></p>",
      overview: "",
      objective: '<ul class="list-disc pl-5"></ul>',
    });
  });
});
