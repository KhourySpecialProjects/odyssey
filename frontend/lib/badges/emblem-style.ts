/**
 * Style guide for generated badge emblems (used in ODY-989's prompt). Emblems
 * picture what the droplet teaches as one white line icon on the black medal
 * face; the Odyssey look comes from the badge frame. The format rules mirror
 * the contract enforced by `sanitizeEmblem` in ./emblem.ts.
 */
export const EMBLEM_STYLE_GUIDE = `Draw a badge emblem as one simple line icon, like a UI icon set, of one key idea from the droplet's content: read its name, learning goals and lesson main points, then pick the idea that best stands for what it teaches. Use an object or diagram from the subject itself, such as speech bubbles for communication or a database for SQL.
- Options: when drawing 3 options, each shows a different key idea from the content.
- Icon: a single glyph, with no scene and no background, in white #FFFFFF outline strokes about 3-4 wide with round caps and joins. Optionally add one soft white fill at about 16% opacity. No other fills: no dark or coloured fills, gradients or shadows.
- Canvas: a square viewBox="0 0 100 100" with a transparent background, since the black medal face shows through. Centre the glyph within about 10-90 on both axes. Keep it readable when shown small.
- No text: no words, letters or numbers anywhere, since the ribbon carries the title.
- Format: presentation attributes only. No <style>, style= attributes, filters, <use>, <image>, links, <foreignObject> or scripts. Stay under 12 KB (aim for under 2 KB). Return one root <svg> that has xmlns="http://www.w3.org/2000/svg".`;
