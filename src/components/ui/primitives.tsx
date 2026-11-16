"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Icon } from "./icon";
import { errorMessage } from "@/lib/api-client";
const subscribeReady = () => () => {};

export function Button({
  children,
  icon,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
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
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: "purple" | "green" | "amber" | "red" | "gray";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
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
      {title && (
        <div className="card-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted text-xs mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
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
        {eyebrow && (
          <div className="eyebrow">
            {eyebrow}
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
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
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
      {detail && <div className="metric-detail">{detail}</div>}
      {footer && <div className="metric-footer">{footer}</div>}
    </div>
  );
}
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
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog?.open) {
      dialog.close();
    }
    if (open) {
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
      {open && <div className="modal-content">{children}</div>}
    </dialog>
  );
}
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving.current) return;
        saving.current = true;
        setPending(true);
        setError("");
        onPendingChange?.(true);
        const form = new FormData(event.currentTarget);
        try {
          await onSave(
            Object.fromEntries(
              Array.from(form.entries()).map(([key, value]) => [
                key,
                String(value),
              ]),
            ),
          );
        } catch (error) {
          setError(errorMessage(error));
        } finally {
          saving.current = false;
          setPending(false);
          onPendingChange?.(false);
        }
      }}
    >
      <fieldset disabled={pending} className="contents">
        <div className="form-grid">
          {fields.map((field) => (
            <label
              className={field.type === "checkbox" ? "checkbox-field" : "field"}
              key={field.name}
            >
              <span>{field.label}</span>
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
        {error && (
          <p role="alert" className="api-error mt-4">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" icon="check">
            {pending ? "Saving…" : submit}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
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
          {pending ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}
