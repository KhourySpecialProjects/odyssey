// The maintenance page as one self-contained HTML document. The middleware
// serves it directly, so it must not depend on the app's layouts, Strapi or
// any script: inline styles and SVG only (the CSP allows both), plus
// /logo.svg, which the middleware matcher leaves to the static file server.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The boat from components/ui/animated-sailboat.tsx, with CSS animations in
// place of SMIL so prefers-reduced-motion can switch them off.
const SAILBOAT_SVG = `<svg class="boat" width="300" height="283" viewBox="20 10 190 180" fill="none" aria-hidden="true">
  <defs>
    <radialGradient id="pond-glow" cx="50%" cy="40%" rx="52%" ry="48%">
      <stop offset="0%" stop-color="white"/>
      <stop offset="50%" stop-color="white"/>
      <stop offset="75%" stop-color="white" stop-opacity="0.6"/>
      <stop offset="90%" stop-color="white" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="black"/>
    </radialGradient>
    <mask id="pond-mask"><ellipse cx="115" cy="172" rx="90" ry="22" fill="url(#pond-glow)"/></mask>
  </defs>
  <g class="bob">
    <g mask="url(#pond-mask)">
      <ellipse cx="115" cy="172" rx="95" ry="24" fill="#83C1E1" opacity="0.7"/>
      <path opacity="0.6" fill="#6BAEC8" d="M0 159 Q25 155,50 159 T100 158 T150 160 T200 158 T240 159 L240 200 L0 200 Z"/>
      <path opacity="0.5" fill="#5BA8CA" d="M0 163 Q30 159,60 163 T120 162 T180 164 T240 163 L240 200 L0 200 Z"/>
      <path opacity="0.35" fill="#4A96B8" d="M0 167 Q35 163,70 167 T140 166 T210 168 T240 167 L240 200 L0 200 Z"/>
    </g>
    <g class="rock">
      <path class="hull" d="M42.9597 142.397C65.2693 115.837 75.9204 63.5456 78.6662 39.0664C78.7191 38.5946 79.3377 38.4809 79.5848 38.887C103.772 78.6532 94.7779 126.739 87.016 146.448C86.9157 146.703 86.6347 146.813 86.3784 146.716C71.5974 141.123 52.4669 141.962 43.4307 143.241C42.9659 143.306 42.658 142.757 42.9597 142.397Z"/>
      <path class="hull" d="M93.3006 148.372C115.912 95.4475 93.7047 44.9461 78.1555 25.3824C77.8401 24.9855 78.2695 24.4296 78.7475 24.5983C152.982 50.8002 173.648 112.382 174.778 140.831C174.792 141.189 174.431 141.421 174.096 141.294C144.219 129.982 109.155 141.328 93.9998 149.045C93.5761 149.261 93.1138 148.809 93.3006 148.372Z"/>
      <path class="hull" d="M185.15 149.731L39.9206 154.446C39.5241 154.459 39.2998 154.906 39.5266 155.232L50.1328 170.452C50.2263 170.587 50.3795 170.666 50.5431 170.666H163.011C163.071 170.666 163.133 170.655 163.19 170.633C180.461 164.047 185.292 154.612 185.645 150.227C185.668 149.945 185.433 149.722 185.15 149.731Z"/>
    </g>
  </g>
</svg>`;

export function renderMaintenancePage({
  until,
}: { until?: string } = {}): string {
  const backBy = until?.trim()
    ? `<p class="until">Expected back by <strong>${escapeHtml(until.trim())}</strong></p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="60">
<meta name="robots" content="noindex">
<title>Odyssey is under maintenance</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
  :root {
    --bg: #f3f9fc; --card: #ffffff; --ink: #101828; --muted: #475467;
    --faint: #667085; --line: #dbe8ef; --accent: #287697; --tint: #e6f2f7;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0e171d; --card: #13232c; --ink: #e8eef2; --muted: #a6b4bf;
      --faint: #8796a2; --line: #22343f; --accent: #5fb4e5; --tint: #17303b;
      color-scheme: dark;
    }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0; display: grid; place-items: center; padding: 24px 16px;
    background: radial-gradient(120% 80% at 50% 0%, var(--tint), var(--bg) 60%);
    color: var(--ink);
    font: 400 16px/1.6 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  main {
    width: 100%; max-width: 520px; background: var(--card);
    border: 1px solid var(--line); border-radius: 20px;
    padding: 32px 28px 28px; text-align: center;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05), 0 16px 40px rgba(16, 24, 40, 0.06);
  }
  .logo { display: block; margin: 0 auto; height: 34px; width: auto; }
  .boat { display: block; margin: 8px auto 4px; width: min(300px, 80%); height: auto; }
  .hull { fill: #297496; }
  @media (prefers-color-scheme: dark) { .hull { fill: #5fb4e5; } }
  .bob { animation: bob 4s ease-in-out infinite; }
  .rock { transform-origin: 110px 158px; animation: rock 4s ease-in-out infinite; }
  @keyframes bob { 0%, 50%, 100% { transform: translateY(0); } 25% { transform: translateY(-3px); } 75% { transform: translateY(1.5px); } }
  @keyframes rock { 0%, 50%, 100% { transform: rotate(0deg); } 25% { transform: rotate(1.5deg); } 75% { transform: rotate(-1deg); } }
  @media (prefers-reduced-motion: reduce) { .bob, .rock { animation: none; } }
  .eyebrow {
    display: inline-block; margin: 0 0 10px; padding: 3px 10px; border-radius: 999px;
    background: var(--tint); color: var(--accent);
    font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  }
  h1 { margin: 0; font-size: 28px; line-height: 1.2; font-weight: 800; letter-spacing: -0.01em; text-wrap: balance; }
  p { margin: 12px 0 0; color: var(--muted); }
  .until { color: var(--ink); }
  .until strong { color: var(--accent); }
  .note { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 13px; color: var(--faint); }
</style>
</head>
<body>
<main>
  <img class="logo" src="/logo.svg" alt="Khoury Odyssey">
  ${SAILBOAT_SVG}
  <div class="eyebrow">Scheduled maintenance</div>
  <h1>Odyssey is getting an update</h1>
  <p>We're making some improvements right now, so Odyssey is unavailable for a little while. Your progress, notes and enrollments are safe.</p>
  ${backBy}
  <p class="note">This page checks again every minute and will take you back to Odyssey when it's ready.</p>
</main>
</body>
</html>`;
}
