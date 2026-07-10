"use client";
import { Portal } from "./config";

// Demo-only client-side "auth". No real credentials — this simply records
// which portal the visitor entered so each login shows only its own modules.
const KEY = "lovaic.session";

export interface Session {
  portal: Portal;
  org: string;
  user: string;
}

export function signIn(session: Session) {
  if (typeof window !== "undefined")
    localStorage.setItem(KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function signOut() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
