import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Academic Works",
  description: "Academic works and research platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}
