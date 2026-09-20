import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";

export function HowItWorksPage() {
  return (
    <Layout guest>
      <h1 className="page-title">How It Works</h1>

      <section className="card">
        <h2>Split a bill</h2>
        <ol className="howto-list">
          <li>Create a new bill and add a title, restaurant name, and currency.</li>
          <li>Add the items from the receipt, or scan a photo to fill them in.</li>
          <li>Add tax, service charge, and any discount.</li>
          <li>Review the bill total.</li>
          <li>Sign in to save the bill and share a link with the group.</li>
          <li>Each person opens the bill, selects what they ordered, and calculates their share.</li>
        </ol>
      </section>

      <section className="card">
        <h2>Scan a receipt</h2>
        <ol className="howto-list">
          <li>Tap Scan bill and upload a photo of the restaurant receipt.</li>
          <li>The app reads the items, prices, tax, and service from the image.</li>
          <li>Extracted items and prices are filled into the bill.</li>
          <li>Review and correct anything the scan missed, including notes.</li>
          <li>Continue with the normal split flow.</li>
        </ol>
      </section>

      <p className="muted">
        You can create and calculate a bill as a guest. An account is only needed to save bill
        history and share a link.
      </p>
      <p className="muted">
        <Link to="/">Back to home</Link>
      </p>
    </Layout>
  );
}
