"use client";

import { useEffect } from "react";

/** Registers the PWA service worker once, client-side. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failure is non-fatal — the app still works online */
      });
    }
  }, []);
  return null;
}
