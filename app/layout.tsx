import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "삼신사주 — 세 신이 읽는 당신의 천명",
  description: "청운, 태을, 루나가 사주팔자·자미두수·서양 점성술 세 가지 이론으로 당신의 운명을 읽습니다.",
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
