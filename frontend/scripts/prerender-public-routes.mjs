import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const distDir = join(root, "..", "dist");
const indexPath = join(distDir, "index.html");

const SITE_URL = "https://ezsplitbill.vercel.app";
const HOME_TITLE = "EzSplitBill | Split bills with friends, scan receipts";
const HOME_DESCRIPTION =
  "A free split bill app for friends. Scan a receipt or enter items, share a link, and everyone calculates their share. Guests don't need an account.";
const HOW_TITLE = "Split a bill with friends, step by step | EzSplitBill";
const HOW_DESCRIPTION =
  "How to split a bill with friends. Create a bill, scan a receipt or add items, share a link, and each person picks what they ordered. No account needed.";
const PRIVACY_TITLE = "Privacy | EzSplitBill";
const PRIVACY_DESCRIPTION =
  "Short version: we barely know you exist. Username and password only, receipt scans are not stored, and bills stay private until you share. No ads or tracking.";

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "EzSplitBill",
  url: `${SITE_URL}/`,
  description: HOME_DESCRIPTION,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
};

const HOW_IT_WORKS_FAQS = [
  {
    question: "How do I split a bill with friends?",
    answer:
      "Create a bill, add the items or scan the receipt, then share it. Friends can open the share link or scan the QR code the app generates for the bill. Each person picks what they ordered and calculates their share.",
  },
  {
    question: "Can I scan a receipt to split the bill?",
    answer:
      "Yes. Take a photo of the receipt and the app fills in the items. You can fix anything that looks off before you share. The photo is only used to read the items and is never saved.",
  },
  {
    question: "Do my friends need an account?",
    answer:
      "No. They can open the shared link and calculate their share without signing in. An account is only if you want to save bills.",
  },
];

const HOW_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOW_IT_WORKS_FAQS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const PRIVACY_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: PRIVACY_TITLE,
  url: `${SITE_URL}/privacy`,
  description: PRIVACY_DESCRIPTION,
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function replaceOrThrow(html, regex, replacement, label) {
  if (!regex.test(html)) {
    throw new Error(`Could not find ${label} in prerender HTML`);
  }
  return html.replace(regex, replacement);
}

function replaceMeta(html, keyType, key, content) {
  const re = new RegExp(`<meta\\s+[^<>]*?${keyType}="${key}"[^<>]*?>`, "i");
  const attr = `${keyType}="${key}"`;
  return replaceOrThrow(
    html,
    re,
    `<meta ${attr} content="${escapeHtml(content)}" />`,
    `meta ${attr}`
  );
}

function replaceJsonLd(html, data) {
  const re = /<script\b[^<>]*type="application\/ld\+json"[^<>]*>[\s\S]*?<\/script>/i;
  const body = JSON.stringify(data, null, 2).replaceAll(/^/gm, "      ").trimStart();
  return replaceOrThrow(
    html,
    re,
    `<script id="ld-json" type="application/ld+json">\n      ${body}\n    </script>`,
    "JSON-LD script"
  );
}

function staticShell({ mainHtml }) {
  return `<div class="shell">
  <header class="header">
    <a class="brand" href="/">EzSplitBill</a>
  </header>
  <main id="main-content">${mainHtml}</main>
</div>`;
}

const homeMain = `
  <h1 class="page-title">Split a bill with friends</h1>
  <section class="card">
    <p>EzSplitBill is a free split bill app. Enter a receipt or scan one, share a link, and everyone calculates their own share.</p>
    <div class="actions" style="margin-top: 1rem">
      <a class="btn" href="/bills/new">Create a bill</a>
      <a class="btn btn-secondary" href="/dashboard">Open dashboard</a>
      <a class="btn btn-secondary" href="/how-it-works">How It Works</a>
      <a class="btn btn-secondary" href="/privacy">Privacy</a>
    </div>
  </section>`;

const howItWorksFaqHtml = HOW_IT_WORKS_FAQS.map(
  (item) => `
  <section class="card">
    <h2>${escapeHtml(item.question)}</h2>
    <p class="muted">${escapeHtml(item.answer)}</p>
  </section>`
).join("");

const howItWorksMain = `
  <h1 class="page-title">How to split a bill with friends</h1>
  <section class="card">
    <h2>Split a bill with friends</h2>
    <p class="muted">Had a friend forget what they owe you for last week's boba? Yeah, us too. Create a bill, scan the receipt or add the items, then share a link so everyone can calculate their own share.</p>
    <h2>Steps to Split a Bill</h2>
    <ol class="howto-list">
      <li>Create a new bill and add a title, restaurant name, and currency.</li>
      <li>Add the items from the receipt, or scan a photo to fill them in.</li>
      <li>Add tax, service charge, and any discount.</li>
      <li>Review the bill total.</li>
      <li>Press calculate on the bill and share the link with your friends. After that it should have saved the bill to your account automatically.</li>
      <li>Each person opens the bill, selects what they ordered, and calculates their share. The best part is: Your friends don't need to sign in!</li>
    </ol>
  </section>
  <section class="card">
    <h2>Tips and tricks</h2>
    <p class="muted">Scanning your bills is a great way to save time for your bills! If there are any mistakes, you can always edit or add the items manually.</p>
    <p class="muted">Your friends can also save the bills you shared with them, so both of you can access them again anytime later.</p>
    <p class="muted">There is a multiples toggle while adding an item. Using it means the item is shared by multiple people, and the price will be split evenly between them. It can also mean it's the item's total price, and the app will calculate the price per item for you.</p>
  </section>${howItWorksFaqHtml}
  <p class="muted"><a href="/">Back to home</a></p>`;

const privacyMain = `
  <header class="privacy-hero">
    <h1 class="page-title privacy-hero-title">Privacy</h1>
    <p class="privacy-hero-lead">Short version: we barely know you exist.</p>
  </header>
  <section class="card privacy-summary-card" aria-label="Privacy at a glance">
    <p>Username and password only. Receipt photos are not stored. Bills stay private until you share. One login cookie, no ads, no tracking, and we never sell your data.</p>
  </section>
  <section class="card">
    <div class="privacy-card-head">
      <span class="privacy-badge" aria-hidden="true">1</span>
      <h2>Your account</h2>
    </div>
    <p class="muted">EzSplitBill keeps things simple. To sign up you only need a <strong>username and password</strong>. We don't ask for your email, name, or phone number, and your account isn't connected to Google, social media, or anything else. Your password is encrypted, so even we can't see it.</p>
  </section>
  <section class="card">
    <div class="privacy-card-head">
      <span class="privacy-badge" aria-hidden="true">2</span>
      <h2>Receipt scans</h2>
    </div>
    <p class="muted">When you scan a receipt, the photo is only used to read the items and is <strong>never saved</strong>.</p>
  </section>
  <section class="card">
    <div class="privacy-card-head">
      <span class="privacy-badge" aria-hidden="true">3</span>
      <h2>Your bills</h2>
    </div>
    <p class="muted">Bills are only stored if you sign in and save them, and they <strong>stay private</strong> unless you share the link yourself. Anyone with that link can view the bill.</p>
  </section>
  <section class="card">
    <div class="privacy-card-head">
      <span class="privacy-badge" aria-hidden="true">4</span>
      <h2>Cookies and tracking</h2>
    </div>
    <p class="muted">We use <strong>one cookie</strong> just to keep you logged in. <strong>No ads</strong>, <strong>no tracking</strong>, and we <strong>never sell your data</strong>.</p>
  </section>`;

function injectRoot(html, shellHtml) {
  const startToken = '<div id="root">';
  const start = html.indexOf(startToken);
  if (start === -1) {
    throw new Error("Could not find #root container in index.html");
  }

  let index = start + startToken.length;
  let depth = 1;
  while (index < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", index);
    const nextClose = html.indexOf("</div>", index);
    if (nextClose === -1) {
      throw new Error("Unclosed #root container in index.html");
    }
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      index = nextOpen + 4;
    } else {
      depth -= 1;
      index = nextClose + 6;
    }
  }

  return html.slice(0, start) + `<div id="root">${shellHtml}</div>` + html.slice(index);
}

function setHead(html, { title, description, path, jsonLd }) {
  let next = html;
  next = replaceOrThrow(
    next,
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
    "title"
  );
  next = replaceMeta(next, "name", "description", description);
  next = replaceOrThrow(
    next,
    /<link\s+[^<>]*?rel="canonical"[^<>]*?>/i,
    `<link rel="canonical" href="${SITE_URL}${path}" />`,
    "canonical"
  );
  next = replaceMeta(next, "property", "og:title", title);
  next = replaceMeta(next, "property", "og:description", description);
  next = replaceMeta(next, "property", "og:url", `${SITE_URL}${path}`);
  next = replaceMeta(next, "name", "twitter:title", title);
  next = replaceMeta(next, "name", "twitter:description", description);
  next = replaceJsonLd(next, jsonLd);
  return next;
}

let indexHtml = readFileSync(indexPath, "utf8");

indexHtml = setHead(indexHtml, {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  path: "/",
  jsonLd: HOME_JSON_LD,
});
indexHtml = injectRoot(indexHtml, staticShell({ mainHtml: homeMain }));
writeFileSync(indexPath, indexHtml);

let howHtml = readFileSync(indexPath, "utf8");
howHtml = setHead(howHtml, {
  title: HOW_TITLE,
  description: HOW_DESCRIPTION,
  path: "/how-it-works",
  jsonLd: HOW_JSON_LD,
});
howHtml = injectRoot(howHtml, staticShell({ mainHtml: howItWorksMain }));

const howDir = join(distDir, "how-it-works");
mkdirSync(howDir, { recursive: true });
writeFileSync(join(howDir, "index.html"), howHtml);

let privacyHtml = readFileSync(indexPath, "utf8");
privacyHtml = setHead(privacyHtml, {
  title: PRIVACY_TITLE,
  description: PRIVACY_DESCRIPTION,
  path: "/privacy",
  jsonLd: PRIVACY_JSON_LD,
});
privacyHtml = injectRoot(privacyHtml, staticShell({ mainHtml: privacyMain }));

const privacyDir = join(distDir, "privacy");
mkdirSync(privacyDir, { recursive: true });
writeFileSync(join(privacyDir, "index.html"), privacyHtml);

console.log("Prerendered /, /how-it-works, and /privacy HTML shells");
