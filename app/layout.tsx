import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "드롭샷추가";
const siteDescription =
  "배드민턴 클럽 총무를 위한 회원, 회비, 일정, 출석 통합 관리 서비스";

function getMetadataBase() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://badminton-club-web.vercel.app");

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL("https://badminton-club-web.vercel.app");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: `${siteName} | 배드민턴 클럽 운영 SaaS`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "배드민턴",
    "배드민턴 클럽",
    "동호회 관리",
    "총무",
    "회비 관리",
    "출석 관리",
    "운동 일정 관리",
  ],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName,
    title: `${siteName} | 배드민턴 클럽 운영 SaaS`,
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${siteName} 공유 이미지`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | 배드민턴 클럽 운영 SaaS`,
    description: siteDescription,
    images: ["/twitter-image"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
