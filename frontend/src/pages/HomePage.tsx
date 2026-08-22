import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { Loading } from "../components/Loading";
import { useAuth } from "../hooks/useAuth";

export function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Layout guest>
        <Loading message="Loading..." />
      </Layout>
    );
  }

  return (
    <Layout guest>
      <h1 className="page-title">EzSplitBill</h1>
      <section className="card">
        <p>Enter a receipt once. Share a link. Everyone calculates their own share.</p>
        <div className="actions" style={{ marginTop: "1rem" }}>
          {user ? (
            <Link className="btn" to="/dashboard">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link className="btn" to="/register">
                Create account
              </Link>
              <Link className="btn btn-secondary" to="/login">
                Login
              </Link>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
