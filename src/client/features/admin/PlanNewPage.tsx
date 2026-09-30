import { BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { PROVIDERS, type Provider } from "../../../shared/providers";
import { LoadError } from "../../components/LoadError";
import { Skeleton } from "../../components/Skeleton";
import { useSession } from "../../hooks/useSession";
import { BackLink } from "./components/BackLink";
import { PlanForm } from "./components/PlanForm";
import { usePlanEditor } from "./usePlanEditor";

export default function PlanNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useSession();
  const { admins, error, loading, reload, fieldErrors, saving, save } = usePlanEditor(null);
  // Opened from "Mở gói" on the wishes list: the service is chosen, and those wishes go along.
  const [params] = useSearchParams();
  const wishCodes = (params.get("wishes") ?? "").split(",").filter((code) => /^PW[0-9A-F]{8}$/.test(code));
  const provider = PROVIDERS.includes(params.get("provider") as Provider) ? (params.get("provider") as Provider) : "OTHER";
  const fromWishes = wishCodes.length > 0;

  const submit = async (input: Parameters<typeof save>[0]) => {
    const code = await save(input, wishCodes);
    if (code) navigate(`/admin/plans/${code}`, { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/plans" label={t("nav.plans")} />
      <h1 className="text-3xl font-bold tracking-tight">{t("planEditor.newTitle")}</h1>
      {fromWishes && (
        <p className="flex items-start gap-2 rounded-2xl bg-tertiary-container px-4 py-3 text-sm font-medium text-on-tertiary-container">
          <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("planEditor.fromWishes", { count: wishCodes.length })}
        </p>
      )}
      {loading && <Skeleton className="h-[40rem] rounded-card" />}
      {error && <LoadError code={error} onRetry={reload} />}
      {!loading && !error && (
        <PlanForm
          initial={{
            // A named other service starts as the plan's name; a listed one leaves it to the admin.
            name: params.get("name") ?? "",
            provider,
            price: 0,
            member_amount: 0,
            cycle: "MONTHLY",
            max_slots: 5,
            // The admin creating the plan is the likeliest payer.
            payer_code: session.user?.code ?? admins[0]?.code ?? "",
            bank_bin: null,
            bank_account_no: null,
            bank_account_name: null,
            active: true,
            // A plan opened for wishes exists to be joined.
            accepting_requests: fromWishes,
          }}
          admins={admins}
          errors={fieldErrors}
          saving={saving}
          submitLabel={t("planEditor.create")}
          onSubmit={(input) => void submit(input)}
        />
      )}
    </div>
  );
}
