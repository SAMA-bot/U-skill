import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import GlobalCommandPalette from "@/components/search/GlobalCommandPalette";

/**
 * Search affordance for dashboard headers. Mounts the palette itself and
 * listens for the global Cmd/Ctrl+K shortcut.
 */
const CommandPaletteTrigger = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "/" && !open) {
        const target = e.target as HTMLElement | null;
        const typing =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (!typing) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open global search"
        className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-[210px]"
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>
      <GlobalCommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
};

export default CommandPaletteTrigger;
