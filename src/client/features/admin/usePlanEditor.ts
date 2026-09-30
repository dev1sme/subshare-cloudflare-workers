import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Account, Plan } from "../../../shared/types";
import { type ApiResult, type PlanInput, api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";

export type FieldErrors = Partial<Record<keyof PlanInput, string>>;

type EditorData = { plan: Plan | null; accounts: Account[] };

// One accounts read serves both the payer picker (admins) and the member picker of the plan page.
async function loadEditor(code: string | null): Promise<ApiResult<EditorData>> {
  const [plan, accounts] = await Promise.all([code ? api.admin.plan(code) : Promise.resolve(null), api.admin.accounts()]);
  if (plan && !plan.ok) return plan;
  if (!accounts.ok) return accounts;
  return {
    ok: true,
    data: { plan: plan ? plan.data.plan : null, accounts: accounts.data.accounts },
  };
}

export function toPlanInput(plan: Plan): PlanInput {
  return {
    name: plan.name,
    provider: plan.provider,
    price: plan.price,
    member_amount: plan.member_amount,
    cycle: plan.cycle,
    max_slots: plan.max_slots,
    payer_code: plan.payer.code,
    bank_bin: plan.bank_bin,
    bank_account_no: plan.bank_account_no,
    bank_account_name: plan.bank_account_name,
    active: plan.active,
    accepting_requests: plan.accepting_requests,
  };
}

// Only what changed goes in the PATCH: the server treats every sent field as a change.
function diff(before: PlanInput, after: PlanInput): Partial<PlanInput> {
  const patch: Partial<PlanInput> = {};
  for (const key of Object.keys(after) as (keyof PlanInput)[]) {
    if (after[key] !== before[key]) Object.assign(patch, { [key]: after[key] });
  }
  return patch;
}

// Create (code = null) or edit one plan. Validation stays on the server: its field code comes back
// in `details` and is shown under that field; anything else is a toast.
export function usePlanEditor(code: string | null) {
  const { t } = useTranslation();
  const load = useCallback(() => loadEditor(code), [code]);
  const { data, error, loading, reload, setData } = useResource(load);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const fail = useCallback(
    (result: { code: string; details: Record<string, string[]> | null }) => {
      const field = result.details ? Object.keys(result.details)[0] : undefined;
      setFieldErrors(field ? { [field]: errorMessage(t, result.code) } : {});
      toast.error(errorMessage(t, result.code));
    },
    [t],
  );

  // Resolves the plan's code on success (the new one after a create), null on failure. `wishCodes`
  // (create only): open the plan for these wishes.
  const save = useCallback(
    async (input: PlanInput, wishCodes: string[] = []): Promise<string | null> => {
      const plan = data?.plan ?? null;
      const patch = plan ? diff(toPlanInput(plan), input) : null;
      // Nothing changed: no request (the server would answer NOTHING_TO_UPDATE, which reads as a failure).
      if (plan && patch && Object.keys(patch).length === 0) {
        setFieldErrors({});
        toast.success(t("planEditor.noChanges"));
        return plan.code;
      }
      setSaving(true);
      const result = plan && patch ? await api.admin.updatePlan(plan.code, patch) : await api.admin.createPlan(input, wishCodes);
      setSaving(false);
      if (!result.ok) {
        fail(result);
        return null;
      }
      setFieldErrors({});
      setData((current) => ({ ...current, plan: result.data.plan }));
      const fulfilled = "wishes_fulfilled" in result.data ? (result.data as { wishes_fulfilled: number }).wishes_fulfilled : 0;
      toast.success(
        plan
          ? t("planEditor.savedToast", { plan: result.data.plan.name })
          : fulfilled > 0
            ? t("planEditor.createdForWishesToast", { plan: result.data.plan.name, count: fulfilled })
            : t("planEditor.createdToast", { plan: result.data.plan.name }),
      );
      return result.data.plan.code;
    },
    [data, fail, setData, t],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    const plan = data?.plan;
    if (!plan) return false;
    const result = await api.admin.deletePlan(plan.code);
    if (!result.ok) {
      // A plan with seats or periods is kept by the FKs: say what to do instead.
      toast.error(result.code === "RELATED_DATA_EXISTS" ? t("planEditor.cannotDelete") : errorMessage(t, result.code));
      return false;
    }
    toast.success(t("planEditor.deletedToast", { plan: plan.name }));
    return true;
  }, [data, t]);

  return {
    plan: data?.plan ?? null,
    accounts: data?.accounts ?? [],
    // Payers must be admins, so the payer picker lists only them.
    admins: (data?.accounts ?? []).filter((account) => account.role === "ADMIN"),
    error,
    loading: loading && !data,
    reload,
    fieldErrors,
    saving,
    save,
    remove,
  };
}
