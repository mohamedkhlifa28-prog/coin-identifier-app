import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mirror — Your AI Alter Ego",
  description:
    "Mirror learns exactly how you think, write, and see the world — and over time responds as you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-[#f0f0f0] antialiased">
        {children}
      </body>
    </html>
  );
}
