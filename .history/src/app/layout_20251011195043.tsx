import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // <- allows content under the notch
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: dark)",  color: "#0a0a0a" },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PO Tracker",
  // Not strictly required, but good hygiene
  appleWebApp: {
    capable: true,                              // <meta name="apple-mobile-web-app-capable" content="yes">
    statusBarStyle: "black-translucent",        // or "black" if you prefer an opaque bar
    title: "Your App",
  },

  // manifest: "/manifest.webmanifest",
  // icons: {
  //   apple: [
  //     { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  //   ],
  // },
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
        <div className="relative flex min-h-screen max-h-screen flex-col overflow-hidden bg-[#0a0a0a] text-white">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)]" />
          <main className="relative mx-auto flex h-full w-full max-w-3xl flex-1 flex-col items-center overflow-y-auto px-6 pb-40 pt-16">
            {children}
          </main>
          <NavBar />
        </div>
      </body>
    </html>
  );
}
