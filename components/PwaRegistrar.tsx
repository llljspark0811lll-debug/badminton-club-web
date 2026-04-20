"use client";

import { useEffect } from "react";

export default function PwaRegistrar() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
      } catch (error) {
        console.error("PWA service worker registration failed", error);
      }
    };

    registerServiceWorker().catch(() => undefined);
  }, []);

  return null;
}
