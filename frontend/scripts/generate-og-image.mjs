import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(root, "og-image.svg"));
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
});
const png = resvg.render().asPng();
writeFileSync(join(root, "..", "public", "og-image.png"), png);
console.log("Wrote public/og-image.png");