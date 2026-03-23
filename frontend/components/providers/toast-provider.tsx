"use client";

import { createContext, useContext, ReactNode } from "react";
import { useToast, ToastType } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, showToast, removeToast } = useToast();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within ToastProvider");
  }
  return context;
}
