import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { Providers } from "@/components/providers";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Pantry - Smart Grocery Tracker",
  description: "Track your groceries, scan barcodes, and get AI-powered meal ideas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pantry",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased bg-background min-h-screen">
        <Providers>
          <main className={session ? "pb-20" : ""}>
            {children}
          </main>
          {session && <BottomNav />}
        </Providers>
      </body>
    </html>
  );
}


