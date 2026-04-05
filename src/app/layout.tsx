import type { Metadata, Viewport } from "next";
import "./globals.css";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";
import AppTutorial from "@/components/AppTutorial";
import { Toaster } from "react-hot-toast";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://foodies-private-chef-c4jt.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0B0B0B",
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
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
      </head>
      <body className="bg-dark text-cream min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-gold focus:text-dark focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:rounded"
        >
          Skip to content
        </a>
        <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>
        <AppTutorial />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#1a1a1a", color: "#F5F0E8", border: "1px solid #2a2a2a" },
            success: { iconTheme: { primary: "#C8A96A", secondary: "#0B0B0B" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#0B0B0B" } },
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
