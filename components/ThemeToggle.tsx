"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Passa a tema chiaro" : "Passa a tema scuro"}
      title={theme === "dark" ? "Tema chiaro" : "Tema scuro"}
      className={
        "inline-flex items-center justify-center w-9 h-9 rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors " +
        (className ?? "")
      }
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" strokeWidth={2} />
      ) : (
        <Moon className="w-4 h-4" strokeWidth={2} />
      )}
    </button>
  );
}
