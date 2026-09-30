import { useTranslation } from "react-i18next";
import type { BankTransfer } from "../../../../shared/types";
import { CopyRow } from "../../../components/CopyRow";
import { QrCode } from "../../../components/QrCode";
import { Card, CardContent } from "../../../components/ui/card";
import { formatMoney } from "../../../format";
import { bankName } from "../../../lib/banks";

export function TransferDetails({ transfer }: { transfer: BankTransfer }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t("payments.howTo")}</p>
        <QrCode
          value={transfer.qr}
          label={t("payments.qrLabel", { amount: formatMoney(transfer.amount), account: transfer.account_no })}
          className="mx-auto aspect-square w-full max-w-64 rounded-lg"
        />
        <dl className="divide-y divide-border">
          <div className="py-2">
            <dt className="text-xs text-muted-foreground">{t("payments.bank")}</dt>
            <dd className="font-medium">{bankName(transfer.bank_bin)}</dd>
          </div>
          <CopyRow label={t("payments.accountNo")} value={transfer.account_no} />
          {transfer.account_name && <CopyRow label={t("payments.accountName")} value={transfer.account_name} />}
          <CopyRow label={t("payments.amount")} value={String(transfer.amount)} display={formatMoney(transfer.amount)} />
          <CopyRow label={t("payments.note")} value={transfer.note} />
        </dl>
      </CardContent>
    </Card>
  );
}
