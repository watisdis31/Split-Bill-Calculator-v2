export const SITE_URL = "https://ezsplitbill.vercel.app";
export const SITE_NAME = "EzSplitBill";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export const DEFAULT_DESCRIPTION =
  "A free split bill app for friends. Scan a receipt or enter items, share a link, and everyone calculates their share. Guests don't need an account.";

export type JsonLd = Record<string, unknown>;

export type PageSeo = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  jsonLd?: JsonLd;
};

export const HOW_IT_WORKS_FAQS = [
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
] as const;

export const HOME_JSON_LD: JsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: DEFAULT_DESCRIPTION,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
};

export const HOW_IT_WORKS_JSON_LD: JsonLd = {
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

const PRIVACY_DESCRIPTION =
  "Short version: we barely know you exist. Username and password only, receipt scans are not stored, and bills stay private until you share. No ads or tracking.";

export const PRIVACY_JSON_LD: JsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Privacy | EzSplitBill",
  url: `${SITE_URL}/privacy`,
  description: PRIVACY_DESCRIPTION,
};

export const PAGE_SEO: Record<string, PageSeo> = {
  home: {
    title: "EzSplitBill | Split bills with friends, scan receipts",
    description: DEFAULT_DESCRIPTION,
    path: "/",
    jsonLd: HOME_JSON_LD,
  },
  howItWorks: {
    title: "Split a bill with friends, step by step | EzSplitBill",
    description:
      "How to split a bill with friends. Create a bill, scan a receipt or add items, share a link, and each person picks what they ordered. No account needed.",
    path: "/how-it-works",
    jsonLd: HOW_IT_WORKS_JSON_LD,
  },
  privacy: {
    title: "Privacy | EzSplitBill",
    description: PRIVACY_DESCRIPTION,
    path: "/privacy",
    jsonLd: PRIVACY_JSON_LD,
  },
  login: {
    title: "Login | EzSplitBill",
    description: "Sign in to save bills, manage your dashboard, and share splits with friends.",
    path: "/login",
    noindex: true,
  },
  register: {
    title: "Create account | EzSplitBill",
    description: "Register for free to save bills, scan receipts, and share split calculations.",
    path: "/register",
    noindex: true,
  },
  notFound: {
    title: "Page not found | EzSplitBill",
    description: "The page you requested could not be found.",
    path: "",
    noindex: true,
  },
};

export function canonicalUrl(path: string) {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
