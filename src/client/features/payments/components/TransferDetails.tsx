import { ScanLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BankTransfer } from "../../../../shared/types";
import { CopyRow } from "../../../components/CopyRow";
import { QrCode } from "../../../components/QrCode";
import { formatMoney } from "../../../format";
import { bankName } from "../../../lib/banks";

export function TransferDetails({ transfer }: { transfer: BankTransfer }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-5 rounded-card bg-surface-container-low p-5">
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <ScanLine className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm text-on-surface-variant">{t("payments.howTo")}</p>
      </div>
      {/* White tile around the code so it scans on any surface colour. */}
      <div className="mx-auto w-full max-w-72 rounded-3xl bg-surface-container-lowest p-3 shadow-sm">
        <QrCode
          value={transfer.qr}
          label={t("payments.qrLabel", { amount: formatMoney(transfer.amount), account: transfer.account_no })}
          className="aspect-square w-full"
        />
      </div>
      <dl className="divide-y divide-outline-variant/60">
        <div className="py-2.5">
          <dt className="text-xs font-medium text-on-surface-variant">{t("payments.bank")}</dt>
          <dd className="text-base font-semibold">{bankName(transfer.bank_bin)}</dd>
        </div>
        <CopyRow label={t("payments.accountNo")} value={transfer.account_no} />
        {transfer.account_name && <CopyRow label={t("payments.accountName")} value={transfer.account_name} />}
        <CopyRow label={t("payments.amount")} value={String(transfer.amount)} display={formatMoney(transfer.amount)} />
        <CopyRow label={t("payments.note")} value={transfer.note} />
      </dl>
    </section>
  );
}
