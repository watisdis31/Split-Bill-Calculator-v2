interface LoadingProps {
  message?: string;
  inline?: boolean;
}

export function Loading({ message, inline = false }: LoadingProps) {
  return (
    <div className={inline ? "loading loading-inline" : "loading"} role="status" aria-live="polite" aria-busy="true">
      <span className="loading-blocks" aria-hidden="true">
        <span className="loading-block" />
        <span className="loading-block" />
        <span className="loading-block" />
      </span>
      <p className={message ? "loading-message" : "visually-hidden"}>{message || "Loading"}</p>
    </div>
  );
}
