"use client";

// Minimal placeholder toast system to satisfy imports at build time.
// In production, replace with a real toast implementation or shadcn/ui toasts.

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | string;
};

export function useToast() {
  function toast({ title, description, variant }: ToastOptions) {
    // eslint-disable-next-line no-console
    console.log(`[toast${variant ? ":" + variant : ""}]`, title ?? "", description ?? "");
  }
  return { toast };
}
