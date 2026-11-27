export const SITE_URL = "https://ezsplitbill.vercel.app";
export const SITE_NAME = "EzSplitBill";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export const DEFAULT_DESCRIPTION =
  "Enter a receipt once. Share a link. Everyone calculates their own share.";

export type PageSeo = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
};

export const PAGE_SEO: Record<string, PageSeo> = {
  home: {
    title: "EzSplitBill — Split receipts fairly",
    description: DEFAULT_DESCRIPTION,
    path: "/",
  },
  howItWorks: {
    title: "How It Works — EzSplitBill",
    description:
      "Create a bill from a receipt, share a link, and let everyone calculate their own share—no sign-in required for guests.",
    path: "/how-it-works",
  },
  login: {
    title: "Login — EzSplitBill",
    description: "Sign in to save bills, manage your dashboard, and share splits with friends.",
    path: "/login",
  },
  register: {
    title: "Create account — EzSplitBill",
    description: "Register for free to save bills, scan receipts, and share split calculations.",
    path: "/register",
  },
  notFound: {
    title: "Page not found — EzSplitBill",
    description: "The page you requested could not be found.",
    path: "",
    noindex: true,
  },
};

export function canonicalUrl(path: string) {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}