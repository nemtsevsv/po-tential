import "./globals.css";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";

export const metadata: Metadata = {
  title: "PO-tential",
  description: "Market potential by region, country and HS code",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1A1918",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-800 font-sans">{children}</body>
    </html>
  );
}
