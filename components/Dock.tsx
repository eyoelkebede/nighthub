"use client";

import { Home, Video, Map as MapIcon, Wallet, Activity } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const DockItem = ({ icon: Icon, label, href, isActive }: { icon: any, label: string, href: string, isActive: boolean }) => {
  return (
    <Link href={href} className="relative flex flex-col items-center justify-center w-14 h-14 group">
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="dock-active"
            className="absolute -bottom-2 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </AnimatePresence>
      <motion.div 
        whileHover={{ y: -5, scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative z-10 p-3 rounded-2xl transition-all duration-300",
          isActive 
            ? "bg-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]" 
            : "text-gray-400 hover:text-white hover:bg-white/5"
        )}
      >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      </motion.div>
      <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg text-xs text-white font-medium shadow-xl">
        {label}
      </span>
    </Link>
  );
};

export default function Dock() {
  const pathname = usePathname();

  const items = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Video, label: "Wormhole", href: "/wormhole" },
    { icon: MapIcon, label: "Stories", href: "/stories" },
    { icon: Activity, label: "Activity", href: "/activity" },
    { icon: Wallet, label: "Vault", href: "/vault" },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      {/* Glass Dock Container */}
      <div className="relative px-6 py-4 rounded-[2rem] flex items-center gap-6 
        bg-black/40 backdrop-blur-xl border border-white/10 
        shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]
        before:absolute before:inset-0 before:rounded-[2rem] before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none"
      >
        {items.map((item) => (
          <DockItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isActive={pathname === item.href}
          />
        ))}
      </div>
    </div>
  );
}
