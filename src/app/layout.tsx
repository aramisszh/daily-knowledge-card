import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "每日一图流知识学习系统",
  description: "Daily one-image knowledge learning card MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
