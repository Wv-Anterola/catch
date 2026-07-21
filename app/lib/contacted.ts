"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { contactStoreKey } from "./paths";

// Which patients a case worker has marked contacted. This is workflow state, not clinical
// data, so it lives in localStorage (no server, no write to the deployed filesystem).
// useSyncExternalStore keeps hydration clean (empty on the server) and every access is
// guarded so a disabled or corrupted store never breaks the page.

function parse(raw: string): string[] {
  try {
    const p: unknown = JSON.parse(raw);
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function makeStore(key: string) {
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const getSnapshot = () => {
    try {
      return localStorage.getItem(key) ?? "[]";
    } catch {
      return "[]";
    }
  };
  return {
    getSnapshot,
    subscribe(cb: () => void) {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) emit();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    toggle(id: string) {
      const cur = new Set(parse(getSnapshot()));
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      try {
        localStorage.setItem(key, JSON.stringify([...cur]));
      } catch {
        /* storage unavailable or over quota; the in-memory set still drives this session */
      }
      emit();
    },
    reset() {
      try {
        localStorage.removeItem(key);
      } catch {
        /* nothing to clear if storage is unavailable */
      }
      emit();
    },
  };
}

export function useContacted(version: string) {
  const store = useMemo(() => makeStore(contactStoreKey(version)), [version]);
  // Empty server snapshot so the prerender matches; localStorage is read after hydration.
  const raw = useSyncExternalStore(store.subscribe, store.getSnapshot, () => "[]");
  const contacted = useMemo(() => new Set(parse(raw)), [raw]);
  const toggle = useCallback((id: string) => store.toggle(id), [store]);
  const reset = useCallback(() => store.reset(), [store]);
  return { contacted, toggle, reset };
}
