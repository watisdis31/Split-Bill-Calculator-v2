import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

const MONTHS = [
  { value: "1", label: "January", short: "Jan" },
  { value: "2", label: "February", short: "Feb" },
  { value: "3", label: "March", short: "Mar" },
  { value: "4", label: "April", short: "Apr" },
  { value: "5", label: "May", short: "May" },
  { value: "6", label: "June", short: "Jun" },
  { value: "7", label: "July", short: "Jul" },
  { value: "8", label: "August", short: "Aug" },
  { value: "9", label: "September", short: "Sep" },
  { value: "10", label: "October", short: "Oct" },
  { value: "11", label: "November", short: "Nov" },
  { value: "12", label: "December", short: "Dec" },
] as const;

const CLOSE_MS = 180;
const OPEN_EVENT = "easysplitbill:month-picker-open";

export function MonthPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef(0);
  const [rendered, setRendered] = useState(false);
  const [shown, setShown] = useState(false);
  const [above, setAbove] = useState(false);

  const selected = MONTHS.find((month) => month.value === value);
  const triggerLabel = selected?.label ?? "All Months";

  function openPanel() {
    window.clearTimeout(hideTimer.current);
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    if (rendered) {
      setShown(true);
      return;
    }
    setRendered(true);
  }

  function closePanel(restoreFocus = false) {
    setShown(false);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setRendered(false);
      setAbove(false);
      if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
    }, CLOSE_MS);
  }

  function selectMonth(next: string) {
    onChange(next);
    closePanel(true);
  }

  function placePanel() {
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return;

    const margin = 16;
    const triggerBox = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerBox.bottom - margin;
    const spaceAbove = triggerBox.top - margin;
    setAbove(spaceBelow < panel.offsetHeight && spaceAbove > spaceBelow);
  }

  useLayoutEffect(() => {
    if (!rendered) return;
    placePanel();
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShown(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [rendered]);

  useEffect(() => {
    if (!shown) return;
    const selectedButton = panelRef.current?.querySelector<HTMLButtonElement>(".is-selected");
    selectedButton?.focus({ preventScroll: true });
  }, [shown]);

  useEffect(() => {
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => {
    if (!rendered) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      closePanel();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closePanel(true);
    }

    function onOtherOpen(event: Event) {
      if ((event as CustomEvent<string>).detail === id) return;
      closePanel();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOtherOpen);
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOtherOpen);
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [id, rendered]);

  return (
    <div ref={rootRef} className={`month-picker${rendered ? " is-open" : ""}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="month-picker-trigger"
        aria-expanded={shown}
        aria-haspopup="dialog"
        aria-controls={`${id}-panel`}
        onClick={() => (shown ? closePanel() : openPanel())}
      >
        {triggerLabel}
      </button>
      {rendered ? (
        <div
          ref={panelRef}
          id={`${id}-panel`}
          className={`month-picker-panel${shown ? " is-open" : ""}${above ? " is-above" : ""}`}
          role="dialog"
          aria-labelledby={titleId}
        >
          <p id={titleId} className="month-picker-title">
            Select month
          </p>
          <div className="month-picker-grid">
            {MONTHS.map((month) => {
              const isSelected = value === month.value;
              return (
                <button
                  key={month.value}
                  type="button"
                  className={`month-picker-option${isSelected ? " is-selected" : ""}`}
                  aria-pressed={isSelected}
                  aria-label={month.label}
                  onClick={() => selectMonth(month.value)}
                >
                  {month.short}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={`month-picker-all${value === "" ? " is-selected" : ""}`}
            aria-pressed={value === ""}
            onClick={() => selectMonth("")}
          >
            All Months
          </button>
        </div>
      ) : null}
    </div>
  );
}
