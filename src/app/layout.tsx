import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";

export const metadata: Metadata = {
  title: "AI Stock Map",
  description: "내 AI 종목 노트북 — AI 생태계 맵 + 회사별 자유 블록 노트",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// SSR 깜빡임 방지 — 페이지 렌더 전에 저장된 테마 적용
const themeInitScript = `
(function() {
  try {
    var s = localStorage.getItem('theme');
    var t = (s === 'light' || s === 'dark') ? s :
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    if (t === 'light') document.documentElement.classList.add('light');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>{children}</ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
