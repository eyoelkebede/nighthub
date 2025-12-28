"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useStore";

export default function StoreInitializer() {
  const { fetchData, subscribeToRealtime } = useAppStore();

  useEffect(() => {
    fetchData();
    subscribeToRealtime();
  }, []);

  return null;
}
