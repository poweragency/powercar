"use client";

import { Toaster } from "sonner";
import { useTheme } from "./ThemeProvider";

export function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      theme={theme}
      richColors
      closeButton
      toastOptions={{ duration: 4000 }}
    />
  );
}
