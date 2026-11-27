import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const distDir = join(root, "..", "dist");
const indexPath = join(distDir, "index.html");

const SITE_URL = "https://ezsplitbill.vercel.app";
const DEFAULT_DESCRIPTION =
  "Enter a receipt once. Share a link. Everyone calculates their own share.";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function staticShell({ title, mainHtml }) {
  return `<div class="shell">
  <header class="header">
    <a class="brand" href="/">EzSplitBill</a>
  </header>
  <main id="main-content">${mainHtml}</main>
</div>`;
}

const homeMain = `
  <h1 class="page-title">EzSplitBill</h1>
  <section class="card">
    <p>Enter a receipt once. Share a link. Everyone calculates their own share.</p>
    <div class="actions" style="margin-top: 1rem">
      <a class="btn" href="/bills/new">Create a bill</a>
      <a class="btn btn-secondary" href="/how-it-works">How It Works</a>
    </div>
  </section>`;

const howItWorksMain = `
  <h1 class="page-title">How It Works</h1>
  <section class="card">
    <h2>Split a bill</h2>
    <p class="muted">Create and save bills, then share them with friends so everyone can calculate their share automatically.</p>
    <h2>Steps to Split a Bill</h2>
    <ol class="howto-list">
      <li>Create a new bill and add a title, restaurant name, and currency.</li>
      <li>Add items from the receipt, or scan a photo to fill them in.</li>
      <li>Add tax, service charge, and any discount.</li>
      <li>Review the bill total and share the link with your friends.</li>
      <li>Each person opens the bill, selects what they ordered, and calculates their share.</li>
    </ol>
  </section>`;

function injectRoot(html, shellHtml) {
  const pattern = /<div id="root">[\s\S]*?<\/div>/;
  if (!pattern.test(html)) {
    throw new Error("Could not find #root container in index.html");
  }
  return html.replace(pattern, `<div id="root">${shellHtml}</div>`);
}

function setTitleAndDescription(html, { title, description, path }) {
  let next = html;
  next = next.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  if (/<meta name="description" content="[^"]*"/.test(next)) {
    next = next.replace(
      /<meta name="description" content="[^"]*"/,
      `<meta name="description" content="${escapeHtml(description)}"`
    );
  }
  if (/<link rel="canonical" href="[^"]*"/.test(next)) {
    next = next.replace(
      /<link rel="canonical" href="[^"]*"/,
      `<link rel="canonical" href="${SITE_URL}${path}"`
    );
  }
  const ogTitle = new RegExp('<meta property="og:title" content="[^"]*"');
  const ogDesc = new RegExp('<meta property="og:description" content="[^"]*"');
  const ogUrl = new RegExp('<meta property="og:url" content="[^"]*"');
  const twTitle = new RegExp('<meta name="twitter:title" content="[^"]*"');
  const twDesc = new RegExp('<meta name="twitter:description" content="[^"]*"');
  next = next.replace(ogTitle, `<meta property="og:title" content="${escapeHtml(title)}"`);
  next = next.replace(ogDesc, `<meta property="og:description" content="${escapeHtml(description)}"`);
  next = next.replace(ogUrl, `<meta property="og:url" content="${SITE_URL}${path}"`);
  next = next.replace(twTitle, `<meta name="twitter:title" content="${escapeHtml(title)}"`);
  next = next.replace(twDesc, `<meta name="twitter:description" content="${escapeHtml(description)}"`);
  return next;
}

let indexHtml = readFileSync(indexPath, "utf8");

indexHtml = setTitleAndDescription(indexHtml, {
  title: "EzSplitBill — Split receipts fairly",
  description: DEFAULT_DESCRIPTION,
  path: "/",
});
indexHtml = injectRoot(indexHtml, staticShell({ title: "home", mainHtml: homeMain }));
writeFileSync(indexPath, indexHtml);

let howHtml = readFileSync(indexPath, "utf8");
howHtml = setTitleAndDescription(howHtml, {
  title: "How It Works — EzSplitBill",
  description:
    "Create a bill from a receipt, share a link, and let everyone calculate their own share—no sign-in required for guests.",
  path: "/how-it-works",
});
howHtml = injectRoot(howHtml, staticShell({ title: "how-it-works", mainHtml: howItWorksMain }));

const howDir = join(distDir, "how-it-works");
mkdirSync(howDir, { recursive: true });
writeFileSync(join(howDir, "index.html"), howHtml);

console.log("Prerendered / and /how-it-works HTML shells");