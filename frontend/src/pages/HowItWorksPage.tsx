import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";

export function HowItWorksPage() {
  return (
    <Layout guest>
      <h1 className="page-title">How It Works</h1>

      <section className="card">
        <h2>Split a bill</h2>
        <p className="muted">
          Have you ever had a friend who forgets how much they need to pay you for their boba order last week? Worry not! with this app you can easily create and save bills, then share it with your friends to automatically calculate their share!
        </p>

        <h2>Steps to Split a Bill</h2>
        <ol className="howto-list">
          <li>Create a new bill and add a title, restaurant name, and currency.</li>
          <li>Add the items from the receipt, or scan a photo to fill them in.</li>
          <li>Add tax, service charge, and any discount.</li>
          <li>Review the bill total.</li>
          <li>Press calculate on the bill and share the link with your friends. After that it should have saved the bill to your account automatically.</li>
          <li>Each person opens the bill, selects what they ordered, and calculates their share. The best part is: Your friends don't need to sign in!</li>
        </ol>
      </section>

      <section className="card">
        <h2>Tips & Tricks</h2>
          <p className="muted">
            Scanning your bills is a great way to save time for your bills! if there are any mistakes, you can always edit or add the items manually. For any issues please contact us.
          </p>
          <p className="muted">
            Your friends can also save the bills you shared with them, so both you and they can access it again anytime later.
          </p>
          <p className="muted">
            There is a multiples toggle while adding an item, using it will mean that the item is shared by mutiple people, and the price will be split evenly between them. Or it can also mean that its the item's total price, and the app will calculate the price per item for you.
          </p>
      </section>
      <p className="muted">
        <Link to="/">Back to home</Link>
      </p>
    </Layout>
  );
}
