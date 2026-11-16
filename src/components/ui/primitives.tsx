/*
 * src/components/ui/primitives.tsx
 * Small shared building blocks: buttons, cards, tabs, metrics, dialogs, forms, and delete confirmation. ResourceEditor uses RecordForm, while screens compose the visual pieces.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";

// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
// Resolve existing design icon names through the shared Lucide mapping, keeping icon rendering consistent.
import { Icon } from "./icon";
// Reuse URL, HTTP, or error helpers instead of duplicating fetch/parsing rules in this file. Browser /api paths are forwarded by the Next proxy.
import { errorMessage } from "@/lib/api-client";
// This store never changes after hydration. The no-op subscribe returns a no-op cleanup; client=true/server=false snapshots let React detect browser readiness.
const subscribeReady = () => () => {};

// Extend native button props while adding shared variants/icons. The hydration check disables clicks until React handlers are attached, preventing lost clicks during startup.
export function Button({
  children,
  icon,
  variant = "secondary",
  className = "",
  // Rest syntax gathers remaining native button props (onClick, disabled, type, aria attributes). JSX spread forwards them, so this wrapper behaves like an ordinary button.
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  // Use different server/client snapshots to know when hydration has attached event handlers; avoid enabling a button whose click cannot yet be handled.
  const ready = useSyncExternalStore(
    subscribeReady,
    () => true,
    () => false,
  );
  return (
    <button
      type="button"
      className={`button button-${variant} ${className}`}
      {...props}
      disabled={!ready || props.disabled}
    >
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}
// Wrap supplied content in a small status label. A limited tone union keeps the class names aligned with the existing stylesheet.
export function Badge({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: "purple" | "green" | "amber" | "red" | "gray";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
// Provide the shared section surface and optional heading/action slots. children carries the page-specific content so layouts do not need repeated card markup.
export function Card({
  children,
  className = "",
  title,
  subtitle,
  action,
  id,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={`card ${className}`}>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {title && (
        <div className="card-heading">
          <div>
            <h2>{title}</h2>
            {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
            {subtitle && <p className="muted text-xs mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
// Render a page title/description and optional actions. Optional props let screens use one heading layout without inserting unused empty blocks.
export function PageHeading({
  title,
  description,
  eyebrow,
  badge,
  actions,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
        {eyebrow && (
          <div className="eyebrow">
            {eyebrow}
            {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
            {badge && (
              <span className="live-label">
                <span />
                {badge}
              </span>
            )}
          </div>
        )}
        <h1>{title}</h1>
        <p className="muted mt-1.5">{description}</p>
      </div>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
// Display an already-calculated metric with icon, detail, and footer slots. Calculation belongs to the API/page, keeping this component reusable.
export function Metric({
  label,
  value,
  icon,
  detail,
  footer,
  tone = "",
}: {
  label: string;
  value: ReactNode;
  icon: string;
  detail?: ReactNode;
  footer?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="card metric">
      <div className="flex items-center justify-between gap-2">
        <span className="metric-label">{label}</span>
        <Icon name={icon} className={tone || "text-violet-600"} size={20} />
      </div>
      <div className={`metric-value ${tone}`}>{value}</div>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {detail && <div className="metric-detail">{detail}</div>}
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {footer && <div className="metric-footer">{footer}</div>}
    </div>
  );
}
// Render controlled tab buttons. The parent supplies the selected value and onChange; items may be plain strings or separate machine-value/human-label objects.
export function Tabs({
  items,
  value,
  onChange,
  label = "View",
}: {
  items: (string | { label: string; value: string })[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
      {items.map((item) => {
        const itemValue = typeof item === "string" ? item : item.value;
        const itemLabel = typeof item === "string" ? item : item.label;
        return (
          <button
            type="button"
            role="tab"
            key={itemValue}
            aria-selected={value === itemValue}
            className={value === itemValue ? "active" : ""}
            onClick={() => onChange(itemValue)}
          >
            {itemLabel}
          </button>
        );
      })}
    </div>
  );
}
// Render the usage bar and accessible numeric information. Clamp the visual width to 0-100 so overspending cannot overflow the track.
export function Progress({
  value,
  tone = "purple",
}: {
  value: number;
  tone?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Allocation used"
      className={`progress progress-${tone}`}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
// Show a deliberate no-results message after loading succeeds. An empty result is different from an API failure or a request still in progress.
export function EmptyState({
  text = "No records match your selection.",
}: {
  text?: string;
}) {
  return (
    <div className="empty-state">
      <Icon name="search" size={28} />
      <p>{text}</p>
    </div>
  );
}
// Bridge React open state to the native dialog API via a ref/effect. Lock background scroll while open, restore it on cleanup, and let the caller prevent closing during a write.
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
  busy?: boolean;
}) {
  // ref is a mutable ref: .current survives renders without causing a rerender. It is used for a DOM element or an immediate in-flight guard rather than visible state.
  const ref = useRef<HTMLDialogElement>(null);
  // Run this side effect after rendering when its dependency values change. Any returned function cleans up the previous timer/listener/DOM change before rerunning or unmounting.
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog?.open) {
      dialog.close();
    }
    if (open) {
      // Remember the prior body overflow rather than assuming its value. Cleanup restores it when open changes or the dialog unmounts.
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={(event) => {
        // Native dialog cancel is typically Escape. Prevent it while busy; otherwise notify the parent so its open state matches the actual dialog.
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <div>
          <h2>{title}</h2>
          {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
          {subtitle && <p className="muted text-xs mt-1">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={busy}
        >
          <Icon name="close" />
        </button>
      </div>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {open && <div className="modal-content">{children}</div>}
    </dialog>
  );
}
// Describe one input for RecordForm. name becomes the submitted JSON key, label is human text, and optional rules become native browser validation attributes.
// defaultValue seeds the initial uncontrolled select value. The browser owns later selection changes; FormData reads the current choice at submission.
// Unless the definition explicitly says false, the control is required. Generated field definitions carry the API required/nullable decisions.
export interface FormField {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "email" | "tel" | "select" | "checkbox";
  options?: (string | { value: string; label: string; disabled?: boolean })[];
  value?: string | number | boolean;
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
  placeholder?: string;
}
// Render inputs from field definitions, collect browser FormData on submit, and await the caller save function. A ref blocks duplicate submissions immediately; state drives pending/error UI.
export function RecordForm({
  fields,
  onSave,
  onCancel,
  submit = "Save",
  children,
  onPendingChange,
  onFieldChange,
}: {
  fields: FormField[];
  onSave: (values: Record<string, string>) => void | Promise<void>;
  onCancel: () => void;
  submit?: string;
  children?: ReactNode;
  onPendingChange?: (pending: boolean) => void;
  onFieldChange?: (name: string, value: string) => void;
}) {
  // Track an in-flight action for disabled controls and progress text. Finally resets it on both success and failure.
  const [pending, setPending] = useState(false);
  // React state stores the latest failed form/action message; it is cleared before another submission. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [error, setError] = useState("");
  // A ref changes immediately without waiting for a rerender, preventing two quick submit events from issuing duplicate writes.
  const saving = useRef(false);
  return (
    <form
      onSubmit={
        // Handle the browser form submit asynchronously; prevent the normal navigation, block duplicates, await the save callback, and retain validation/API failure text.
        async (event) => {
          // This runs on a valid form submission, including Enter. Native required/min/max/input-type checks happen before submit; the API still validates the authoritative contract.
          // Stop the browser default page navigation. This application submits JSON asynchronously and keeps the current screen/dialog mounted.
          event.preventDefault();
          if (saving.current) return;
          saving.current = true;
          setPending(true);
          setError("");
          onPendingChange?.(true);
          // Capture the submitted DOM inputs by their name attributes. These are uncontrolled fields seeded with defaultValue, not individual useState values.
          const form = new FormData(event.currentTarget);
          try {
            await onSave(
              // Convert [fieldName, value] pairs into an object for ResourceEditor. String(value) normalizes FormData entries; the editor handles integer/null API conversions.
              Object.fromEntries(
                Array.from(form.entries()).map(([key, value]) => [
                  key,
                  String(value),
                ]),
              ),
            );
          // The awaited onSave rejects on HTTP/validation failure. Show the message and keep inputs in place so the user can correct or retry instead of losing their work.
          } catch (error) {
            setError(errorMessage(error));
          // Release the immediate ref guard and visible pending state regardless of outcome. The optional callback also lets the parent re-enable closing.
          } finally {
            saving.current = false;
            setPending(false);
            onPendingChange?.(false);
          }
        }
      }
    >
      <fieldset disabled={pending} className="contents">
        <div className="form-grid">
          {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
          {fields.map((field) => (
            <label
              className={field.type === "checkbox" ? "checkbox-field" : "field"}
              key={field.name}
            >
              <span>{field.label}</span>
              {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
              {field.type === "select" ? (
                <select
                  aria-label={field.label}
                  name={field.name}
                  onChange={(event) =>
                    onFieldChange?.(field.name, event.target.value)
                  }
                  defaultValue={String(
                    field.value ??
                      (typeof field.options?.[0] === "string"
                        ? field.options[0]
                        : field.options?.[0]?.value) ??
                      "",
                  )}
                  required={field.required !== false}
                >
                  {/* Turn matching items into JSX with map. Each repeated element needs a stable key so React preserves the right row/control when data changes. */}
                  {field.options?.map((option) =>
                    typeof option === "string" ? (
                      <option key={option}>{option}</option>
                    ) : (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              ) : field.type === "checkbox" ? (
                <input
                  name={field.name}
                  type="checkbox"
                  defaultChecked={Boolean(field.value)}
                />
              ) : (
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  defaultValue={String(field.value ?? "")}
                  min={field.min}
                  max={field.max}
                  step={
                    field.step ?? (field.type === "number" ? "0.01" : undefined)
                  }
                  required={field.required !== false}
                  placeholder={field.placeholder}
                />
              )}
            </label>
          ))}
        </div>
        {children}
        {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
        {error && (
          <p role="alert" className="api-error mt-4">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" icon="check">
            {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
            {pending ? "Saving…" : submit}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
// Ask for confirmation and await the caller DELETE action. Keep failures visible instead of closing as if deletion succeeded; pending state disables repeated submissions.
export function ConfirmDelete({
  open,
  onClose,
  onConfirm,
  title = "Delete record?",
  description = "This permanently deletes the record from your finance account.",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
}) {
  // Track an in-flight action for disabled controls and progress text. Finally resets it on both success and failure.
  const [pending, setPending] = useState(false);
  // React state stores the latest failed form/action message; it is cleared before another submission. The setter (second array value) schedules a rerender when a control/event changes it; ordinary local variables would reset on each render.
  const [error, setError] = useState("");
  // Remember the record chosen for deletion so the confirmation dialog can target it. Clearing the selection closes the dialog.
  const deleting = useRef(false);
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={title}
      busy={pending}
    >
      <p className="muted">{description}</p>
      {/* Conditional JSX: render the following block only when the left-hand condition is truthy; otherwise React leaves it out. */}
      {error && (
        <p role="alert" className="api-error mt-4">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <Button onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={async () => {
            if (deleting.current) return;
            deleting.current = true;
            setPending(true);
            setError("");
            try {
              // Wait for the caller actual DELETE. Close only after success; the surrounding catch keeps the confirmation/error visible when deletion fails.
              await onConfirm();
              onClose();
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              deleting.current = false;
              setPending(false);
            }
          }}
          icon="delete"
        >
          {/* Choose one of two UI branches with condition ? trueBranch : falseBranch. This keeps selected/empty/alternate states in the same layout position. */}
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}
