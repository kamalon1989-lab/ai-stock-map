import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";

export const metadata: Metadata = {
  title: "AI Stock Map",
  description: "내 AI 종목 노트북 — AI 생태계 맵 + 회사별 자유 블록 노트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
