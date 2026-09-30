import { CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../../components/ui/card";
import { formatMoney } from "../../../format";

export function DueSummary({ totalDue }: { totalDue: number }) {
  const { t } = useTranslation();
  if (totalDue === 0) {
    return (
      <Card className="border-paid/20 bg-paid-soft">
        <CardContent className="flex items-center gap-3 text-paid">
          <CircleCheck className="size-6 shrink-0" aria-hidden="true" />
          <p className="font-medium">{t("payments.nothingDue")}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{t("payments.totalDue")}</p>
        <p className="text-3xl font-semibold text-owed tabular-nums">{formatMoney(totalDue)}</p>
      </CardContent>
    </Card>
  );
}
