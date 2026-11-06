// typo-js ships no types: only what the overview scan's spell-check uses (ODY-791)
declare module "typo-js" {
  export default class Typo {
    constructor(dictionary: string, affData: string, wordsData: string);
    check(word: string): boolean;
  }
}
