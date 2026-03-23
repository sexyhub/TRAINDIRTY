"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-8 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="w-full max-w-sm bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                    variant === "danger" && "bg-red-500/15",
                    variant === "warning" && "bg-yellow-500/15",
                    variant === "default" && "bg-primary/15"
                  )}
                >
                  {variant === "danger" ? (
                    <Trash2 className={cn("w-5 h-5", variant === "danger" && "text-red-400")} />
                  ) : (
                    <AlertTriangle
                      className={cn(
                        "w-5 h-5",
                        variant === "warning" && "text-yellow-400",
                        variant === "default" && "text-primary"
                      )}
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base">{title}</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-[52px]">
                {message}
              </p>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3.5 rounded-2xl bg-secondary text-foreground font-bold text-sm active:scale-95 transition-transform"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  "flex-1 py-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-transform",
                  variant === "danger" && "bg-red-500 text-white",
                  variant === "warning" && "bg-yellow-500 text-black",
                  variant === "default" && "bg-primary text-primary-foreground"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
