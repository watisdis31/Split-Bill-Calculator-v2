import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { PageMeta } from "../seo/PageMeta";
import { PAGE_SEO } from "../seo/siteMeta";

export function NotFoundPage() {
  const seo = PAGE_SEO.notFound;

  return (
    <Layout guest>
      <PageMeta {...seo} />
      <h1 className="page-title">Page not found</h1>
      <section className="card">
        <p className="muted">We could not find that page. It may have moved or the link may be wrong.</p>
        <div className="actions" style={{ marginTop: "1rem" }}>
          <Link className="btn" to="/">
            Back to home
          </Link>
          <Link className="btn btn-secondary" to="/how-it-works">
            How It Works
          </Link>
        </div>
      </section>
    </Layout>
  );
}