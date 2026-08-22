import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Layout, Button } from "../components/Layout";
import { AlertMessage, FieldError } from "../components/Feedback";
import { PasswordInput } from "../components/PasswordInput";
import { getErrorMessage, useAuth } from "../hooks/useAuth";
import { safeRedirectPath } from "../utils/redirect";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromState = (location.state as { from?: string } | null)?.from;
  const from = safeRedirectPath(searchParams.get("redirect")) || safeRedirectPath(fromState) || "/dashboard";
  const redirectQuery = safeRedirectPath(searchParams.get("redirect"));
  const registerHref = redirectQuery
    ? `/register?redirect=${encodeURIComponent(redirectQuery)}`
    : "/register";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextUsernameError = username.trim() ? "" : "Username is required.";
    const nextPasswordError = password ? "" : "Password is required.";
    setUsernameError(nextUsernameError);
    setPasswordError(nextPasswordError);
    setError("");
    if (nextUsernameError || nextPasswordError) return;

    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Invalid username or password."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout guest>
      <h1 className="page-title">Login</h1>
      <section className="card">
        <form className="stack" onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className={`input${usernameError ? " input-invalid" : ""}`}
              autoComplete="username"
              value={username}
              aria-invalid={Boolean(usernameError)}
              aria-describedby={usernameError ? "username-error" : undefined}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError("");
              }}
            />
            <FieldError id="username-error" message={usernameError} />
          </div>
          <PasswordInput
            id="password"
            label="Password"
            value={password}
            autoComplete="current-password"
            error={passwordError}
            onChange={(next) => {
              setPassword(next);
              setPasswordError("");
            }}
          />
          <AlertMessage type="error" message={error} />
          <Button type="submit" className="btn-block" loading={busy} loadingLabel="Logging in...">
            Login
          </Button>
        </form>
      </section>
      <p className="muted">
        No account? <Link to={registerHref}>Register</Link>
      </p>
    </Layout>
  );
}
