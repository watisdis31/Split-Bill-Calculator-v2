import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { PageMeta } from "../seo/PageMeta";
import { HOW_IT_WORKS_FAQS, PAGE_SEO } from "../seo/siteMeta";

export function HowItWorksPage() {
  return (
    <Layout guest>
      <PageMeta {...PAGE_SEO.howItWorks} />
      <h1 className="page-title">How to split a bill with friends</h1>

      <section className="card">
        <h2>Split a bill with friends</h2>
        <p className="muted">
          Had a friend forget what they owe you for last week's boba? Yeah, us too. Create a bill,
          scan the receipt or add the items, then share a link so everyone can calculate their own
          share.
        </p>

        <h2>Steps to Split a Bill</h2>
        <ol className="howto-list">
          <li>Create a new bill and add a title, restaurant name, and currency.</li>
          <li>Add the items from the receipt, or scan a photo to fill them in.</li>
          <li>Add tax, service charge, and any discount.</li>
          <li>Review the bill total.</li>
          <li>
            Press calculate on the bill and share the link with your friends. After that it should
            have saved the bill to your account automatically.
          </li>
          <li>
            Each person opens the bill, selects what they ordered, and calculates their share. The
            best part is: Your friends don't need to sign in!
          </li>
        </ol>
      </section>

      <section className="card">
        <h2>Tips and tricks</h2>
        <p className="muted">
          Scanning your bills is a great way to save time for your bills! If there are any mistakes,
          you can always edit or add the items manually.
        </p>
        <p className="muted">
          Your friends can also save the bills you shared with them, so both of you can access them
          again anytime later.
        </p>
        <p className="muted">
          There is a multiples toggle while adding an item. Using it means the item is shared by
          multiple people, and the price will be split evenly between them. It can also mean it's
          the item's total price, and the app will calculate the price per item for you.
        </p>
      </section>

      {HOW_IT_WORKS_FAQS.map((item) => (
        <section className="card" key={item.question}>
          <h2>{item.question}</h2>
          <p className="muted">{item.answer}</p>
        </section>
      ))}

      <p className="muted">
        <Link to="/">Back to home</Link>
      </p>
    </Layout>
  );
}
