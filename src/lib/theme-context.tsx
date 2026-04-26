"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
type Ctx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };

const ThemeCtx = createContext<Ctx>({ theme: "dark", toggle: () => {}, setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // 초기 로드: localStorage 또는 시스템 선호
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    if (saved === "light" || saved === "dark") {
      applyTheme(saved);
      setThemeState(saved);
    } else {
      const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
      const initial: Theme = prefersLight ? "light" : "dark";
      applyTheme(initial);
      setThemeState(initial);
    }
  }, []);

  const setTheme = (t: Theme) => {
    applyTheme(t);
    localStorage.setItem("theme", t);
    setThemeState(t);
  };
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeCtx.Provider>;
}

function applyTheme(t: Theme) {
  const html = document.documentElement;
  if (t === "light") html.classList.add("light");
  else html.classList.remove("light");
}

export const useTheme = () => useContext(ThemeCtx);
