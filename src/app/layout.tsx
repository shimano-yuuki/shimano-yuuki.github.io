import type { Metadata } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { AquariumBackground } from "@/components/webgl/AquariumBackground";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.fullName} — ${site.role}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.fullName,
    title: `${site.fullName} — ${site.role}`,
    description: site.description,
    // scripts/generate-og.tsx が書き出した実ファイル。拡張子つきで置くことで、
    // GitHub Pages でも Content-Type が image/png になる。
    images: [{ url: "/og.png", width: 1200, height: 630, alt: site.fullName }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col text-fg">
        {/* 背景の水槽。WebGL 不可なら bg-bg のまま */}
        <AquariumBackground />
        <a
          href="#main"
          className="label sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
        >
          本文へ
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
