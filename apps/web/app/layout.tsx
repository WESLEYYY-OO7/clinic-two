import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cura Health",
  description: "The clinical record, cured."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
