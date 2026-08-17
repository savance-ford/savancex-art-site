"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePortalRoot } from "@/components/overlays/usePortalRoot";

interface ToastContextValue {
  readonly showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const removeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const animationFrame = useRef<number>(undefined);
  const toastRoot = usePortalRoot("toast-root");

  const clearTimers = useCallback(() => {
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (removeTimer.current) clearTimeout(removeTimer.current);
  }, []);

  const showToast = useCallback(
    (nextMessage: string) => {
      clearTimers();
      setMessage(nextMessage);
      setIsVisible(false);

      animationFrame.current = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      hideTimer.current = setTimeout(() => setIsVisible(false), 2600);
      removeTimer.current = setTimeout(() => setMessage(null), 3000);
    },
    [clearTimers],
  );

  useEffect(() => clearTimers, [clearTimers]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toastRoot && message
        ? createPortal(
            <div className={`toast${isVisible ? " is-visible" : ""}`}>
              {message}
            </div>,
            toastRoot,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
