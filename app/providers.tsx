"use client";

import { useEffect } from "react";
import { restoreInitData } from "@telegram-apps/sdk-react";

/**
 * Client-side providers shared across the app.
 *
 * In SDK v3 the Telegram context is signal-based rather than React
 * context-based, so there is no Provider component to wrap the tree.
 * Instead we call `restoreInitData()` on mount to populate the SDK's
 * init-data signals, making them available to hooks like
 * `useSignal(initDataUser)` anywhere in the component tree.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      restoreInitData();
    } catch {
      // Not running inside the Telegram client — safe to ignore.
    }
  }, []);

  return <>{children}</>;
}
