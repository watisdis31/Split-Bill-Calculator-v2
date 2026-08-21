import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../services/api";
import { getErrorMessage } from "../hooks/useAuth";
import { Button } from "./Layout";
import { AlertMessage, useToast } from "./Feedback";

function buildShareUrl(token: string) {
  const base = (import.meta.env.VITE_FRONTEND_URL || window.location.origin).replace(/\/$/, "");
  return `${base}/bill/s/${token}`;
}

export function ShareBillPanel({ billId, shareToken }: { billId: number; shareToken?: string | null }) {
  const { notify } = useToast();
  const [token, setToken] = useState(shareToken || "");
  const [apiShareUrl, setApiShareUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(shareToken || "");
    setApiShareUrl("");
    setError("");
  }, [billId]);

  useEffect(() => {
    if (shareToken) setToken(shareToken);
  }, [shareToken]);

  const shareUrl = apiShareUrl || (token ? buildShareUrl(token) : "");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await api.shareBill(billId);
      const nextToken = res.data.shareToken;
      const nextUrl = res.data.shareUrl || (nextToken ? buildShareUrl(nextToken) : "");
      if (!nextToken || !nextUrl) {
        setError("Failed to generate share link.");
        return;
      }
      setToken(nextToken);
      setApiShareUrl(res.data.shareUrl || "");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to generate share link."));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    notify("success", "Link copied.");
  }

  return (
    <div className="stack">
      {shareUrl ? (
        <>
          <p className="muted">Share this link with your friends:</p>
          <input className="input share-url" readOnly value={shareUrl} />
          <Button className="btn-block" onClick={() => void copy()}>
            Copy link
          </Button>
          <p className="muted">Scan to open</p>
          <div className="share-qr-wrap">
            <QRCodeSVG
              value={shareUrl}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              marginSize={4}
              title="Bill share QR code"
              className="share-qr"
            />
          </div>
        </>
      ) : (
        <Button
          className="btn-block"
          loading={busy}
          loadingLabel="Generating share link..."
          onClick={() => void generate()}
        >
          Generate share link
        </Button>
      )}
      <AlertMessage type="error" message={error} />
    </div>
  );
}
