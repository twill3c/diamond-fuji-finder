import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ダイヤモンド富士ファインダー",
  description:
    "太陽が富士山頂に重なる「ダイヤモンド富士」がいつ・どこで見られるかを天文計算で導出する",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
