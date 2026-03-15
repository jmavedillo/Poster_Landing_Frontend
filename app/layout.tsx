import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AZTE.UNO — Songs, moments, places. Made visual.",
  description: "Turn songs, moments and places into visuals worth sharing.",
  applicationName: "AZTE.UNO",
  metadataBase: new URL("https://azte.uno"),
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
  openGraph: {
    title: "AZTE.UNO — Songs, moments, places. Made visual.",
    description: "Turn songs, moments and places into visuals worth sharing.",
    siteName: "AZTE.UNO",
    type: "website",
    url: "https://azte.uno",
  },
  twitter: {
    card: "summary",
    title: "AZTE.UNO — Songs, moments, places. Made visual.",
    description: "Turn songs, moments and places into visuals worth sharing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
