const TAG_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  technical: { bg: "bg-[#e2e9ff]", text: "text-[#58579c]" },
  skill: { bg: "bg-[#fae6f3]", text: "text-[#855169]" },
  knowledge: { bg: "bg-[#f9f7e6]", text: "text-[#7f6b55]" },
  professional: { bg: "bg-[#def2fd]", text: "text-[#284965]" },
  personal: { bg: "bg-[#f0fdf4]", text: "text-[#166534]" },
  databases: { bg: "bg-[#e0f2fe]", text: "text-[#0c4a6e]" },
  interviews: { bg: "bg-[#fef3c7]", text: "text-[#92400e]" },
  cloud: { bg: "bg-[#ede9fe]", text: "text-[#5b21b6]" },
  security: { bg: "bg-[#fce7f3]", text: "text-[#9d174d]" },
  networking: { bg: "bg-[#d1fae5]", text: "text-[#065f46]" },
  algorithms: { bg: "bg-[#fee2e2]", text: "text-[#991b1b]" },
  web: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]" },
  ai: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]" },
  "machine learning": { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]" },
  devops: { bg: "bg-[#ccfbf1]", text: "text-[#134e4a]" },
  testing: { bg: "bg-[#fff7ed]", text: "text-[#9a3412]" },
};

const FALLBACK_COLORS = [
  { bg: "bg-[#fce4ec]", text: "text-[#880e4f]" },
  { bg: "bg-[#e8eaf6]", text: "text-[#283593]" },
  { bg: "bg-[#e0f7fa]", text: "text-[#00695c]" },
  { bg: "bg-[#fff3e0]", text: "text-[#e65100]" },
  { bg: "bg-[#f3e5f5]", text: "text-[#6a1b9a]" },
  { bg: "bg-[#e8f5e9]", text: "text-[#2e7d32]" },
  { bg: "bg-[#fce4ec]", text: "text-[#ad1457]" },
  { bg: "bg-[#e1f5fe]", text: "text-[#01579b]" },
];

export function getTagColors(name: string) {
  const key = name.toLowerCase();
  if (TAG_TYPE_COLORS[key]) return TAG_TYPE_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}
