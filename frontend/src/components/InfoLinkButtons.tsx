import { Link } from "react-router-dom";

export function InfoLinkButtons() {
  return (
    <>
      <Link className="btn btn-secondary" to="/how-it-works">
        How It Works
      </Link>
      <Link className="btn btn-secondary" to="/privacy">
        Privacy
      </Link>
    </>
  );
}