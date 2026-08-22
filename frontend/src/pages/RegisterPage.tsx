import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Layout, Button } from "../components/Layout";
import { AlertMessage, FieldError } from "../components/Feedback";
import { PasswordInput } from "../components/PasswordInput";
import { getErrorMessage, useAuth } from "../hooks/useAuth";
import { safeRedirectPath } from "../utils/redirect";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect")) || "/dashboard";
  const loginHref = safeRedirectPath(searchParams.get("redirect"))
    ? `/login?redirect=${encodeURIComponent(searchParams.get("redirect") || "")}`
    : "/login";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = username.trim();
    let nextUsernameError = "";
    let nextPasswordError = "";

    if (!trimmed) nextUsernameError = "Username is required.";
    else if (trimmed.length < 3) nextUsernameError = "Username must be at least 3 characters.";
    else if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      nextUsernameError = "Username may only contain letters, numbers, and underscores.";
    }

    if (!password) nextPasswordError = "Password is required.";
    else if (password.length < 8) nextPasswordError = "Password must be at least 8 characters.";

    setUsernameError(nextUsernameError);
    setPasswordError(nextPasswordError);
    setError("");
    if (nextUsernameError || nextPasswordError) return;

    setBusy(true);
    try {
      await register(trimmed, password);
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Could not create account."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout guest>
      <h1 className="page-title">Register</h1>
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
            autoComplete="new-password"
            error={passwordError}
            onChange={(next) => {
              setPassword(next);
              setPasswordError("");
            }}
          />
          <p className="muted">At least 8 characters. Letters, numbers, and underscores only in the username.</p>
          <AlertMessage type="error" message={error} />
          <Button type="submit" className="btn-block" loading={busy} loadingLabel="Registering...">
            Create account
          </Button>
        </form>
      </section>
      <p className="muted">
        Already have an account? <Link to={loginHref}>Login</Link>
      </p>
    </Layout>
  );
}
