import { useEffect, useState } from "react";

/**
 * Sidebar state with persistent collapsed state (desktop) and
 * swipe-to-open / swipe-to-close gestures on mobile.
 *
 * - Collapsed state persists in localStorage per `storageKey`.
 * - Mobile "open" is transient (session-level UX).
 * - Swipe right from left edge opens the drawer; swipe left anywhere closes it.
 */
export function useSidebarState(storageKey: string) {
  const collapsedKey = `${storageKey}:collapsed`;

  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(collapsedKey);
      return raw ? JSON.parse(raw) === true : false;
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const setCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    setCollapsedState((prev) => {
      const next = typeof value === "function" ? (value as (p: boolean) => boolean)(prev) : value;
      try {
        window.localStorage.setItem(collapsedKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === collapsedKey && e.newValue) {
        try {
          setCollapsedState(JSON.parse(e.newValue) === true);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [collapsedKey]);

  // Touch swipe gestures (mobile only)
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const EDGE_ZONE = 28; // px from left edge to trigger open
    const MIN_DIST = 60; // px horizontal to count as a swipe
    const MAX_OFFAXIS = 60; // max vertical drift
    const MAX_DURATION = 600; // ms

    const isMobileWidth = () => window.innerWidth < 768;

    const onStart = (e: TouchEvent) => {
      if (!isMobileWidth() || e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      // Open swipe must start from left edge; close swipe can start anywhere while open
      tracking = mobileOpen || startX <= EDGE_ZONE;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startTime;
      if (dt > MAX_DURATION) return;
      if (Math.abs(dy) > MAX_OFFAXIS) return;
      if (Math.abs(dx) < MIN_DIST) return;
      if (dx > 0 && !mobileOpen) setMobileOpen(true);
      else if (dx < 0 && mobileOpen) setMobileOpen(false);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [mobileOpen]);

  // Close mobile drawer when resizing to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768 && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOpen]);

  return { collapsed, setCollapsed, mobileOpen, setMobileOpen };
}

export default useSidebarState;
