import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Dock from "@/components/Dock";
import StoreInitializer from "@/components/StoreInitializer";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "NightHub",
  description: "Decentralized Social Media PWA",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-night-bg text-white min-h-screen selection:bg-neon-blue/30`}>
        <StoreInitializer />
        <main className="pb-24 min-h-screen relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-purple/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/10 rounded-full blur-[100px]" />
          </div>
          
          <div className="relative z-10">
            {children}
          </div>
        </main>
        <Dock />
      </body>
    </html>
  );
}
