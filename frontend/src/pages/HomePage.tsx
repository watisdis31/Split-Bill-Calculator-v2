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
      <h1 className="page-title">EzSplitBill</h1>
      <section className="card">
        <p>Enter a receipt once. Share a link. Everyone calculates their own share.</p>
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