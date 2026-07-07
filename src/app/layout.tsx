import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Future Route Planner",
  description: "A supportive prototype for comparing education and career routes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
