import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EnviroWatch — Live Environmental Dashboard",
  description: "Homes.ai-style environmental dashboard for live air quality & anomalies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-gradient-to-b from-slate-950 to-slate-900 text-slate-50`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
