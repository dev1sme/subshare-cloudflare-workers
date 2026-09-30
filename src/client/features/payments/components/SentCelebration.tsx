import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { springExpressive } from "../../../lib/motion";

// Shown once, right after the member reports a transfer: a check that draws itself inside a
// shape that pops in. Purely a confirmation of the action; the status note says what is next.
export function SentCelebration() {
  const { t } = useTranslation();
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, transition: springExpressive }}
      className="flex flex-col items-center gap-3 rounded-card bg-primary-container px-6 py-8 text-center text-on-primary-container"
    >
      <svg viewBox="0 0 64 64" className="size-20" aria-hidden="true">
        <m.path
          d="M32 4c14 0 28 10 28 28S46 60 32 60 4 48 4 32 18 4 32 4z"
          className="fill-primary"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0, transition: springExpressive }}
          style={{ transformOrigin: "32px 32px" }}
        />
        <m.path
          d="M20 33l8 8 16-17"
          fill="none"
          className="stroke-on-primary"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1, transition: { duration: 0.45, delay: 0.25, ease: [0.05, 0.7, 0.1, 1] } }}
        />
      </svg>
      <p className="text-2xl font-bold">{t("payments.sentThanks")}</p>
      <p className="text-sm">{t("payments.sentNext")}</p>
    </m.div>
  );
}
