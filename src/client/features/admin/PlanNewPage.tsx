import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
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

  const submit = async (input: Parameters<typeof save>[0]) => {
    const code = await save(input);
    if (code) navigate(`/admin/plans/${code}`, { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/plans" label={t("nav.plans")} />
      <h1 className="text-3xl font-bold tracking-tight">{t("planEditor.newTitle")}</h1>
      {loading && <Skeleton className="h-[40rem] rounded-card" />}
      {error && <LoadError code={error} onRetry={reload} />}
      {!loading && !error && (
        <PlanForm
          initial={{
            name: "",
            provider: "OTHER",
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
            accepting_requests: false,
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
