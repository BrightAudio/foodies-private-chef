"use client";
import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | Foodies` : "Foodies: Private Chef Services";
  }, [title]);
}
