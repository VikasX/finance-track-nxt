/*
 * src/lib/api-cache.ts
 * An in-memory browser store shared by useApi callers. URL keys deduplicate reads; subscriptions update React, and successful writes invalidate cached reads so affected UI reloads.
 * "use client" marks the browser-interactive entry point: hooks/events or browser APIs
 * need JavaScript after hydration. Next may still prerender its initial HTML on the server.
 * Beginner syntax: @/ means src/ (tsconfig paths); import type is compile-time only.
 */
"use client";
// Import React hooks for local state/lifecycle/subscriptions and React types where needed. Hooks run at the component top level; type-only names disappear from the browser JavaScript.
import { useEffect, useState, useSyncExternalStore } from "react";
// Reuse URL, HTTP, or error helpers instead of duplicating fetch/parsing rules in this file. Browser /api paths are forwarded by the Next proxy.
import { request } from "./api-client";
// Describe one read result: optional data/error plus loading/stale flags. Optional ? fields may be absent before the request succeeds.
interface Snapshot {
  data?: unknown;
  error?: Error;
  loading: boolean;
  stale: boolean;
}
// Describe a cache entry: snapshot, subscribed callbacks, active AbortController, and version counter. Set holds each listener once.
interface Entry {
  snapshot: Snapshot;
  listeners: Set<() => void>;
  controller?: AbortController;
  version: number;
}
// A stable initial snapshot is reused until data arrives. Stable identity matters because useSyncExternalStore compares snapshots between renders.
const initial: Snapshot = { loading: true, stale: true };
// One in-memory Map stores entries by full request URL. It is shared between hook calls in this browser module, not persisted financial storage.
const entries = new Map<string, Entry>();
// Return the one cache entry for a URL, creating an empty loading snapshot on first use. A Map lets several components share one request/result.
function entry(key: string) {
  let item = entries.get(key);
  if (!item) {
    item = { snapshot: initial, listeners: new Set(), version: 0 };
    entries.set(key, item);
  }
  return item;
}
// Replace the snapshot object and notify listeners. useSyncExternalStore notices the new object identity and rerenders subscribed components.
function emit(item: Entry, next: Snapshot) {
  item.snapshot = next;
  item.listeners.forEach((listener) => listener());
}
// Deduplicate reads unless forced. Abort an older request and increment its version; only the current version may publish results, so slow old responses cannot overwrite newer data.
async function load(key: string, force = false) {
  const item = entry(key);
  // Skip a duplicate in-flight read or an already-fresh result. force=true is reserved for retry/invalidation, where the old result must be replaced.
  if ((item.controller && !force) || (!force && !item.snapshot.stale)) return;
  // Optional chaining calls abort only when an older controller exists; the first load has nothing to cancel.
  item.controller?.abort();
  // AbortController lets a newer forced read cancel this request; cancellation is not shown as an ordinary user-facing API failure.
  const controller = new AbortController();
  item.controller = controller;
  // Remember which request started this work. Compare it before publishing so an older asynchronous response cannot replace a newer one.
  const version = ++item.version;
  emit(item, { ...item.snapshot, loading: true, error: undefined });
  try {
    // all: is an internal cache convention: remove it before fetching. Dynamic import returns a Promise for the helper module; .then selects its fetchAll function.
    const data = key.startsWith("all:")
      ? await import("./api-client").then((module) =>
          module.fetchAll(key.slice(4), controller.signal),
        )
      : await request(key, { signal: controller.signal });
    // Only the newest read may publish success. Cancellation alone is insufficient because an older response might finish near the same time a replacement begins.
    if (version === item.version)
      emit(item, { data, loading: false, stale: false });
  // Report a genuine failure for the current read, but ignore aborted/obsolete work. unknown errors are normalized to Error for predictable display.
  } catch (error) {
    if (version === item.version && !controller.signal.aborted)
      emit(item, {
        error: error instanceof Error ? error : new Error("Request failed."),
        loading: false,
        stale: false,
      });
  // Finally runs after success or failure. Clear only this request controller; an older read must not erase a newer request controller.
  } finally {
    if (version === item.version) item.controller = undefined;
  }
}
// Mark every cached query stale after a successful write. Active subscribers refetch immediately; inactive URLs wait until they are used again.
export function invalidateApi() {
  for (const [key, item] of entries) {
    // Keep existing data while marking it outdated. An active forced load emits a loading snapshot; an inactive query loads when mounted again.
    item.snapshot = { ...item.snapshot, stale: true };
    if (item.listeners.size) void load(key, true);
  }
}
// Subscribe a component to the URL-keyed cache. T describes the expected data; null disables a request, and the internal all: prefix asks fetchAll to traverse collection pages (it is not sent to FastAPI).
export function useApi<T>(key: string | null) {
  // A cache snapshot holds data plus loading/error/stale flags; React subscribes to replacement objects rather than mutating component-local copies.
  const snapshot = useSyncExternalStore(
    (listener) => {
      if (!key) return () => {};
      const item = entry(key);
      item.listeners.add(listener);
      // The subscription returns cleanup. Remove this component listener on unsubscribe so future cache changes do not notify an unmounted component.
      return () => {
        item.listeners.delete(listener);
      };
    },
    () => (key ? entry(key).snapshot : initial),
    () => initial,
  );
  // Run this side effect after rendering when its dependency values change. Any returned function cleans up the previous timer/listener/DOM change before rerunning or unmounting.
  useEffect(() => {
    if (key) void load(key);
  // The dependency array reruns the effect when the URL key changes, not on every render. Requests are managed by the shared cache rather than cancelled whenever one subscriber unmounts.
  }, [key]);
  return {
    data: snapshot.data as T | undefined,
    error: snapshot.error,
    loading: key !== null && snapshot.loading,
    refreshing: snapshot.loading && snapshot.data !== undefined,
    retry: () => {
      if (key) void load(key, true);
    },
  };
}
// Wait briefly after typing before exposing the settled value. The effect cleanup cancels the previous timer, preventing a request for every keystroke.
export function useDebounced<T>(value: T, delay = 250) {
  // Debounce the search text before using it in the URL, reducing requests while the user is still typing.
  const [settled, setSettled] = useState(value);
  // Run this side effect after rendering when its dependency values change. Any returned function cleans up the previous timer/listener/DOM change before rerunning or unmounting.
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    // Cancel the pending debounce whenever value/delay changes or the component unmounts; otherwise old keystrokes could trigger late searches.
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
// Send a write through the same HTTP helper, then invalidate reads only after success. Errors bubble to the form/delete dialog; a successful DELETE may return undefined.
export async function mutate<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
) {
  const result = await request<T>(path, {
    method,
    // Conditionally spread a body property only when a body exists. JSON.stringify converts the writable object to HTTP text; DELETE normally sends no body.
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  invalidateApi();
  return result;
}
