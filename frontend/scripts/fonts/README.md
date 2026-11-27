# Fonts for OG image generation

The live app uses `"Segoe UI", Tahoma, Geneva, Verdana, sans-serif` (`frontend/src/index.css`).

Headless `npm run og:image` bundles **Liberation Sans** (SIL Open Font License) and registers it as `"Segoe UI"` in the generated SVG so Resvg renders with the same stack name and a neutral sans glyph set on any machine. The receipt mark is copied verbatim from `public/favicon.svg` (vector paths, not redrawn).