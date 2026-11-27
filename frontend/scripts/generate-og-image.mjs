import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = dirname(fileURLToPath(import.meta.url));
const faviconPath = join(root, "..", "public", "favicon.svg");
const fontsDir = join(root, "fonts");
const regularFont = join(fontsDir, "LiberationSans-Regular.ttf");
const boldFont = join(fontsDir, "LiberationSans-Bold.ttf");

/** Matches frontend/src/index.css :root font-family */
const UI_FONT_FAMILY = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';

function faviconMarkup() {
  const raw = readFileSync(faviconPath, "utf8");
  const match = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  if (!match) throw new Error("Could not parse public/favicon.svg");
  return match[1].trim();
}

function buildOgSvg() {
  const favicon = faviconMarkup();
  // 512 viewBox scaled to 112px wide receipt icon
  const logoScale = 112 / 512;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <style type="text/css"><![CDATA[
      @font-face {
        font-family: "Segoe UI";
        font-style: normal;
        font-weight: 400;
        src: url("fonts/LiberationSans-Regular.ttf") format("truetype");
      }
      @font-face {
        font-family: "Segoe UI";
        font-style: normal;
        font-weight: 700;
        src: url("fonts/LiberationSans-Bold.ttf") format("truetype");
      }
      .ui {
        font-family: ${UI_FONT_FAMILY};
        fill: #111111;
      }
    ]]></style>
  </defs>
  <rect width="1200" height="630" fill="#f4f1ea"/>
  <g transform="translate(100 95)">
    <rect x="4" y="4" width="996" height="440" fill="#111111"/>
    <rect width="996" height="440" fill="#ffffff" stroke="#111111" stroke-width="4"/>
    <g transform="translate(48 48)">
      <g transform="scale(${logoScale})">
        ${favicon}
      </g>
      <text class="ui" x="140" y="52" font-size="64" font-weight="700">EzSplitBill</text>
      <g transform="translate(0 88)">
        <rect x="4" y="4" width="884" height="196" fill="#111111"/>
        <rect width="884" height="196" fill="#fffcd5" stroke="#111111" stroke-width="4"/>
        <text class="ui" x="32" y="68" font-size="34" font-weight="700">Enter a receipt once. Share a link.</text>
        <text class="ui" x="32" y="122" font-size="34" font-weight="700">Everyone calculates their own share.</text>
      </g>
      <text class="ui" x="0" y="348" font-size="26" font-weight="400" opacity="0.75">ezsplitbill.vercel.app</text>
    </g>
  </g>
</svg>`;
}

if (!existsSync(regularFont) || !existsSync(boldFont)) {
  throw new Error(
    "Missing bundled fonts in scripts/fonts/. Add LiberationSans-Regular.ttf and LiberationSans-Bold.ttf."
  );
}

const svgPath = join(root, "og-image.svg");
const svg = buildOgSvg();
writeFileSync(svgPath, svg);

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    loadSystemFonts: false,
    fontFiles: [regularFont, boldFont],
    defaultFontFamily: "Segoe UI",
  },
});
const png = resvg.render().asPng();
writeFileSync(join(root, "..", "public", "og-image.png"), png);
console.log("Wrote scripts/og-image.svg and public/og-image.png");