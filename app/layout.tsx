import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "삼신사주 — 세 관점으로 보는 나의 흐름",
  description: "청운, 태을, 루나가 사주팔자·자미두수·서양 점성술 세 가지 관점으로 지금의 흐름을 쉽게 정리합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
