import { Link } from "react-router-dom";
import { InfoLinkButtons } from "../components/InfoLinkButtons";
import { Layout } from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { PageMeta } from "../seo/PageMeta";
import { PAGE_SEO } from "../seo/siteMeta";

export function HomePage() {
  const { user, loading } = useAuth();
  const seo = PAGE_SEO.home;

  return (
    <Layout guest>
      <PageMeta {...seo} />
      <h1 className="page-title">Split a bill with friends</h1>
      <section className="card">
        <p>EzSplitBill is a free split bill app. Enter a receipt or scan one, share a link, and everyone calculates their own share.</p>
        <div className="actions" style={{ marginTop: "1rem" }}>
          {!loading && user ? (
            <Link className="btn" to="/dashboard">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link className="btn" to="/bills/new">
                Create a bill
              </Link>
              <Link className="btn btn-secondary" to="/dashboard">
                Open dashboard
              </Link>
            </>
          )}
          <InfoLinkButtons />
        </div>
      </section>
    </Layout>
  );
}