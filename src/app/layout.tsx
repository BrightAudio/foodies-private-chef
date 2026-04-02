import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";
import AppTutorial from "@/components/AppTutorial";

export const metadata: Metadata = {
  title: "Foodies: Private Chef Services",
  description: "Book vetted private chefs for an elevated in-home dining experience",
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
