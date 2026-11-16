"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { request } from "./api-client";
interface Snapshot {
  data?: unknown;
  error?: Error;
  loading: boolean;
  stale: boolean;
}
interface Entry {
  snapshot: Snapshot;
  listeners: Set<() => void>;
  controller?: AbortController;
  version: number;
}
const initial: Snapshot = { loading: true, stale: true };
const entries = new Map<string, Entry>();
function entry(key: string) {
  let item = entries.get(key);
  if (!item) {
    item = { snapshot: initial, listeners: new Set(), version: 0 };
    entries.set(key, item);
  }
  return item;
}
function emit(item: Entry, next: Snapshot) {
  item.snapshot = next;
  item.listeners.forEach((listener) => listener());
}
async function load(key: string, force = false) {
  const item = entry(key);
  if ((item.controller && !force) || (!force && !item.snapshot.stale)) return;
  item.controller?.abort();
  const controller = new AbortController();
  item.controller = controller;
  const version = ++item.version;
  emit(item, { ...item.snapshot, loading: true, error: undefined });
  try {
    const data = key.startsWith("all:")
      ? await import("./api-client").then((module) =>
          module.fetchAll(key.slice(4), controller.signal),
        )
      : await request(key, { signal: controller.signal });
    if (version === item.version)
      emit(item, { data, loading: false, stale: false });
  } catch (error) {
    if (version === item.version && !controller.signal.aborted)
      emit(item, {
        error: error instanceof Error ? error : new Error("Request failed."),
        loading: false,
        stale: false,
      });
  } finally {
    if (version === item.version) item.controller = undefined;
  }
}
export function invalidateApi() {
  for (const [key, item] of entries) {
    item.snapshot = { ...item.snapshot, stale: true };
    if (item.listeners.size) void load(key, true);
  }
}
export function useApi<T>(key: string | null) {
  const snapshot = useSyncExternalStore(
    (listener) => {
      if (!key) return () => {};
      const item = entry(key);
      item.listeners.add(listener);
      return () => {
        item.listeners.delete(listener);
      };
    },
    () => (key ? entry(key).snapshot : initial),
    () => initial,
  );
  useEffect(() => {
    if (key) void load(key);
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
export function useDebounced<T>(value: T, delay = 250) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
export async function mutate<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
) {
  const result = await request<T>(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  invalidateApi();
  return result;
}
