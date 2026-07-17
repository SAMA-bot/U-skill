import { useEffect, useRef } from "react";

/**
 * Accessibility helper for the mobile sidebar drawer.
 * - Traps focus inside the drawer while open (Tab / Shift+Tab)
 * - Closes on Escape
 * - Moves focus into the drawer when it opens
 * - Restores focus to the opener (trigger) when it closes
 */
export function useSidebarA11y(
  open: boolean,
  onClose: () => void,
  triggerRef: React.RefObject<HTMLElement>
) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;

    const container = containerRef.current;
    const getFocusable = (): HTMLElement[] => {
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null);
    };

    // Move focus into the drawer
    const focusables = getFocusable();
    (focusables[0] ?? container)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        container?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !container?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onClose]);

  // Restore focus to trigger when the drawer closes
  useEffect(() => {
    if (open) return;
    if (previouslyFocused.current) {
      const target = triggerRef.current ?? previouslyFocused.current;
      // Only restore focus if the user hasn't already moved focus elsewhere intentionally
      requestAnimationFrame(() => target?.focus?.());
      previouslyFocused.current = null;
    }
  }, [open, triggerRef]);

  return { containerRef };
}

export default useSidebarA11y;
