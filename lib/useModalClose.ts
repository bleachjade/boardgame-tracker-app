"use client";

import { useEffect } from "react";

type ModalCloseProps = {
  overlayProps: { onClick?: () => void };
  panelProps: { onClick?: (event: React.MouseEvent) => void };
};

// Shared modal behavior: Escape always closes the dialog.
// Pass { backdrop: true } for modals where clicking the backdrop should close it too.
export function useModalClose(onClose: () => void, options?: { backdrop?: boolean }): ModalCloseProps {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Don't hijack Escape while the user is typing — let the browser blur first
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!options?.backdrop) return { overlayProps: {}, panelProps: {} };

  return {
    overlayProps: { onClick: onClose },
    panelProps: { onClick: (event: React.MouseEvent) => event.stopPropagation() },
  };
}