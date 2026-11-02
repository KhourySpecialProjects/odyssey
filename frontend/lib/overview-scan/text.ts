// Text helpers shared by the scan's rules (the prototype's, unchanged).

export const words = (text: string): string[] =>
  String(text || "").match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || [];

export const norm = (text: string): string =>
  String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
