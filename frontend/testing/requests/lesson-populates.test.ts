import fs from "fs";
import path from "path";
import { LESSON_BLOCKS_POPULATE } from "@/lib/requests/lesson-populates";

const schema = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      "../../../backend/src/api/lesson/content-types/lesson/schema.json",
    ),
    "utf8",
  ),
);

describe("LESSON_BLOCKS_POPULATE", () => {
  it("lists every lesson blocks component under `on` (v5 drops unlisted dynamic-zone components)", () => {
    expect(Object.keys(LESSON_BLOCKS_POPULATE.blocks.on).sort()).toEqual(
      [...schema.attributes.blocks.components].sort(),
    );
  });

  it("populates quiz questions with their answerOptions", () => {
    expect(LESSON_BLOCKS_POPULATE.blocks.on["droplets.quiz"]).toEqual({
      populate: { questions: { populate: ["answerOptions"] } },
    });
  });

  it("populates open-ended quiz questions", () => {
    expect(
      LESSON_BLOCKS_POPULATE.blocks.on["droplets.open-ended-quiz"],
    ).toEqual({ populate: ["questions"] });
  });
});
