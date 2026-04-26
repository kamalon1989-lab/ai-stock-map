"use client";
import { useTheme } from "@/lib/theme-context";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
      aria-label="테마 전환"
    >
      {theme === "dark" ? "☀" : "🌙"}
    </button>
  );
}
