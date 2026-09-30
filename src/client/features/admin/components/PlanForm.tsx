import { Save } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Account, Cycle } from "../../../../shared/types";
import type { PlanInput } from "../../../api";
import { Button } from "../../../components/ui/button";
import { SelectField } from "../../../components/ui/select-field";
import { Switch } from "../../../components/ui/switch";
import { TextField } from "../../../components/ui/text-field";
import { formatMoney } from "../../../format";
import { BANKS } from "../../../lib/banks";
import type { FieldErrors } from "../usePlanEditor";
import { ProviderPicker } from "./ProviderPicker";

type PlanFormProps = {
  initial: PlanInput;
  admins: Account[];
  errors: FieldErrors;
  saving: boolean;
  submitLabel: string;
  onSubmit: (input: PlanInput) => void;
};

// Money is typed as digits only and sent as an integer (VND); the formatted amount is echoed
// under the field so a missing zero is caught before saving.
const digits = (value: string) => value.replace(/\D/g, "");
const toInt = (value: string) => (value === "" ? Number.NaN : Number(value));

export function PlanForm({ initial, admins, errors: serverErrors, saving, submitLabel, onSubmit }: PlanFormProps) {
  const { t } = useTranslation();
  const activeId = useId();
  const acceptingId = useId();
  // Form state: strings as typed, converted on submit.
  const [form, setForm] = useState({
    ...initial,
    price: initial.price ? String(initial.price) : "",
    member_amount: initial.member_amount ? String(initial.member_amount) : "",
    max_slots: String(initial.max_slots),
    bank_bin: initial.bank_bin ?? "",
    bank_account_no: initial.bank_account_no ?? "",
    bank_account_name: initial.bank_account_name ?? "",
  });
  // A server error stays on its field only until that field is edited.
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setEdited((current) => new Set(current).add(key));
  };
  const errors = Object.fromEntries(Object.entries(serverErrors).filter(([field]) => !edited.has(field))) as FieldErrors;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setEdited(new Set());
    onSubmit({
      ...form,
      name: form.name.trim(),
      price: toInt(form.price),
      member_amount: toInt(form.member_amount),
      max_slots: toInt(form.max_slots),
      bank_bin: form.bank_bin || null,
      bank_account_no: form.bank_account_no.trim() || null,
      bank_account_name: form.bank_account_name.trim().toUpperCase() || null,
    });
  };

  const money = (value: string) => (value ? formatMoney(Number(value)) : undefined);

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-6" noValidate>
      <ProviderPicker value={form.provider} onChange={(provider) => set("provider", provider)} />

      <section className="flex flex-col gap-4">
        <TextField label={t("planEditor.name")} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={64} error={errors.name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <TextField
              label={t("planEditor.price")}
              inputMode="numeric"
              value={form.price}
              onChange={(e) => set("price", digits(e.target.value))}
              error={errors.price}
            />
            {!errors.price && <p className="mt-1 px-4 text-xs text-on-surface-variant">{money(form.price) ?? t("planEditor.priceHint")}</p>}
          </div>
          <div>
            <TextField
              label={t("planEditor.memberAmount")}
              inputMode="numeric"
              value={form.member_amount}
              onChange={(e) => set("member_amount", digits(e.target.value))}
              error={errors.member_amount}
            />
            {!errors.member_amount && (
              <p className="mt-1 px-4 text-xs text-on-surface-variant">{money(form.member_amount) ?? t("planEditor.memberAmountHint")}</p>
            )}
          </div>
          <SelectField label={t("planEditor.cycle")} value={form.cycle} onChange={(e) => set("cycle", e.target.value as Cycle)} error={errors.cycle}>
            <option value="MONTHLY">{t("cycle.MONTHLY")}</option>
            <option value="YEARLY">{t("cycle.YEARLY")}</option>
          </SelectField>
          <TextField
            label={t("planEditor.maxSlots")}
            inputMode="numeric"
            value={form.max_slots}
            onChange={(e) => set("max_slots", digits(e.target.value))}
            error={errors.max_slots}
          />
        </div>
        <SelectField label={t("planEditor.payer")} value={form.payer_code} onChange={(e) => set("payer_code", e.target.value)} error={errors.payer_code}>
          {admins.map((admin) => (
            <option key={admin.code} value={admin.code}>
              {admin.display_name} (@{admin.username})
            </option>
          ))}
        </SelectField>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="px-1 text-sm font-semibold text-on-surface-variant">{t("planEditor.bankSection")}</h2>
        <SelectField label={t("planEditor.bank")} value={form.bank_bin} onChange={(e) => set("bank_bin", e.target.value)} error={errors.bank_bin}>
          <option value="">{t("planEditor.noBank")}</option>
          {BANKS.map((bank) => (
            <option key={bank.bin} value={bank.bin}>
              {bank.name}
            </option>
          ))}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("planEditor.accountNo")}
            inputMode="numeric"
            value={form.bank_account_no}
            onChange={(e) => set("bank_account_no", digits(e.target.value))}
            error={errors.bank_account_no}
          />
          <TextField
            label={t("planEditor.accountName")}
            value={form.bank_account_name}
            onChange={(e) => set("bank_account_name", e.target.value.toUpperCase())}
            maxLength={64}
            error={errors.bank_account_name}
          />
        </div>
      </section>

      <section className="flex flex-col divide-y divide-outline-variant/50 rounded-card bg-surface-container-low px-5">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <label htmlFor={activeId} className="cursor-pointer">
            <span className="block font-semibold">{t("planEditor.active")}</span>
            <span className="block text-sm text-on-surface-variant">{t("planEditor.activeHint")}</span>
          </label>
          <Switch id={activeId} checked={form.active} onCheckedChange={(checked) => set("active", checked)} />
        </div>
        <div className="flex min-h-16 items-center justify-between gap-4">
          <label htmlFor={acceptingId} className="cursor-pointer">
            <span className="block font-semibold">{t("plansAdmin.accepting")}</span>
            <span className="block text-sm text-on-surface-variant">{t("planEditor.acceptingHint")}</span>
          </label>
          <Switch id={acceptingId} checked={form.accepting_requests} onCheckedChange={(checked) => set("accepting_requests", checked)} />
        </div>
      </section>

      <Button type="submit" size="large" disabled={saving}>
        <Save aria-hidden="true" />
        {submitLabel}
      </Button>
    </form>
  );
}
