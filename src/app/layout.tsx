import type { Metadata, Viewport } from "next";
import "./globals.css";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";
import AppTutorial from "@/components/AppTutorial";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://foodies-private-chef-c4jt.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1a1a2e",
};

export const metadata: Metadata = {
  title: { default: "Foodies: Private Chef Services", template: "%s | Foodies" },
  description: "Book vetted private chefs for an elevated in-home dining experience. Browse top-rated chefs, customize your menu, and enjoy a luxury meal at home.",
  keywords: ["private chef", "personal chef", "hire a chef", "in-home dining", "private dining", "meal prep", "catering"],
  authors: [{ name: "Foodies" }],
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    siteName: "Foodies",
    title: "Foodies: Private Chef Services",
    description: "Book vetted private chefs for an elevated in-home dining experience.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Foodies: Private Chef Services",
    description: "Book vetted private chefs for an elevated in-home dining experience.",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-dark text-cream min-h-screen">
        <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
        <AppTutorial />
      </body>
    </html>
  );
}
