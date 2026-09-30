import { Check, Copy } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { springExpressive } from "../lib/motion";
import { Button } from "./ui/button";

type CopyRowProps = {
  label: string;
  // What goes to the clipboard. For money this is the raw integer ("120000"), never `display`:
  // a formatted "120.000 đ" pasted into a banking app transfers the wrong amount or is rejected.
  value: string;
  display?: string;
};

// A real button per line: on a phone there is no hover tooltip to discover.
export function CopyRow({ label, value, display }: CopyRowProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t("copy.done", { label: label.toLowerCase() }));
    } catch {
      toast.error(t("copy.failed"));
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <dt className="text-xs font-medium text-on-surface-variant">{label}</dt>
        <dd className="text-base font-semibold break-all tabular-nums select-all">{display ?? value}</dd>
      </div>
      <Button
        variant="tonal"
        size="icon"
        onClick={() => void copy()}
        aria-label={t("copy.action", { label: label.toLowerCase() })}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={copied ? "done" : "copy"}
            initial={{ scale: 0.4, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0, transition: springExpressive }}
            exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.1 } }}
            className="flex"
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </m.span>
        </AnimatePresence>
      </Button>
    </div>
  );
}
