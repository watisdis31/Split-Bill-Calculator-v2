import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { PageMeta } from "../seo/PageMeta";
import { PAGE_SEO } from "../seo/siteMeta";

export function PrivacyPage() {
  return (
    <Layout guest>
      <PageMeta {...PAGE_SEO.privacy} />
      <h1 className="page-title">Privacy</h1>

      <section className="card">
        <p className="muted">
          EzSplitBill keeps things simple. To sign up you only need a username and password. We
          don't ask for your email, name, or phone number, and your account isn't connected to
          Google, social media, or anything else. Your password is encrypted, so even we can't see
          it.
        </p>
      </section>

      <section className="card">
        <p className="muted">
          When you scan a receipt, the photo is only used to read the items and is never saved.
          Bills are only stored if you sign in and save them, and they stay private unless you share
          the link yourself. Anyone with that link can view the bill.
        </p>
      </section>

      <section className="card">
        <p className="muted">
          We use one cookie just to keep you logged in. No ads, no tracking, and we never sell your
          data.
        </p>
      </section>

      <p className="muted">
        <Link to="/">Back to home</Link>
      </p>
    </Layout>
  );
}