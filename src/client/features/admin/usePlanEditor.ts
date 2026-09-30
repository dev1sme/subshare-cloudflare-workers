import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Account, Plan } from "../../../shared/types";
import { type ApiResult, type PlanInput, api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";

export type FieldErrors = Partial<Record<keyof PlanInput, string>>;

type EditorData = { plan: Plan | null; admins: Account[] };

// Payers must be admins, so the payer picker lists only them.
async function loadEditor(code: string | null): Promise<ApiResult<EditorData>> {
  const [plan, accounts] = await Promise.all([code ? api.admin.plan(code) : Promise.resolve(null), api.admin.accounts()]);
  if (plan && !plan.ok) return plan;
  if (!accounts.ok) return accounts;
  return {
    ok: true,
    data: { plan: plan ? plan.data.plan : null, admins: accounts.data.accounts.filter((account) => account.role === "ADMIN") },
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

  // Resolves the plan's code on success (the new one after a create), null on failure.
  const save = useCallback(
    async (input: PlanInput): Promise<string | null> => {
      setSaving(true);
      const plan = data?.plan ?? null;
      const result = plan ? await api.admin.updatePlan(plan.code, diff(toPlanInput(plan), input)) : await api.admin.createPlan(input);
      setSaving(false);
      if (!result.ok) {
        fail(result);
        return null;
      }
      setFieldErrors({});
      if (data) setData({ ...data, plan: result.data.plan });
      toast.success(t(plan ? "planEditor.savedToast" : "planEditor.createdToast", { plan: result.data.plan.name }));
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
    admins: data?.admins ?? [],
    error,
    loading: loading && !data,
    reload,
    fieldErrors,
    saving,
    save,
    remove,
  };
}
