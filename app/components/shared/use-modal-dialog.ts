import { useEffect, useRef } from "react";

// Opens and closes a native <dialog> as a modal to match `open`
export function useModalDialog(open: boolean) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return dialogRef;
}
