import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { PageMeta } from "../seo/PageMeta";
import { PAGE_SEO } from "../seo/siteMeta";

const SECTIONS = [
  {
    badge: "1",
    title: "Your account",
    body: (
      <>
        EzSplitBill keeps things simple. To sign up you only need a{" "}
        <strong>username and password</strong>. We don't ask for your email, name, or phone number,
        and your account isn't connected to Google, social media, or anything else. Your password is
        encrypted, so even we can't see it.
      </>
    ),
  },
  {
    badge: "2",
    title: "Receipt scans",
    body: (
      <>
        When you scan a receipt, the photo is only used to read the items and is{" "}
        <strong>never saved</strong>.
      </>
    ),
  },
  {
    badge: "3",
    title: "Your bills",
    body: (
      <>
        Bills are only stored if you sign in and save them, and they <strong>stay private</strong>{" "}
        unless you share the link yourself. Anyone with that link can view the bill.
      </>
    ),
  },
  {
    badge: "4",
    title: "Cookies and tracking",
    body: (
      <>
        We use <strong>one cookie</strong> just to keep you logged in. <strong>No ads</strong>,{" "}
        <strong>no tracking</strong>, and we <strong>never sell your data</strong>.
      </>
    ),
  },
] as const;

export function PrivacyPage() {
  return (
    <Layout guest>
      <PageMeta {...PAGE_SEO.privacy} />
      <header className="privacy-hero">
        <h1 className="page-title privacy-hero-title">Privacy</h1>
        <p className="privacy-hero-lead">Short version: we barely know you exist.</p>
      </header>

      <section className="card privacy-summary-card" aria-label="Privacy at a glance">
        <p>
          Username and password only. Receipt photos are not stored. Bills stay private until you
          share. One login cookie, no ads, no tracking, and we never sell your data.
        </p>
      </section>

      {SECTIONS.map((section) => (
        <section className="card" key={section.title}>
          <div className="privacy-card-head">
            <span className="privacy-badge" aria-hidden="true">
              {section.badge}
            </span>
            <h2>{section.title}</h2>
          </div>
          <p className="muted">{section.body}</p>
        </section>
      ))}

      <p className="muted">
        <Link to="/">Back to home</Link>
      </p>
    </Layout>
  );
}