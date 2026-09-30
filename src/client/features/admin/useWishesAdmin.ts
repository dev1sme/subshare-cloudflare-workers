import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Wish } from "../../../shared/types";
import type { Provider } from "../../../shared/providers";
import { api } from "../../api";
import { errorMessage } from "../../errors";
import { useInFlight } from "../../hooks/useInFlight";
import { useResource } from "../../hooks/useResource";

const loadWishes = () => api.admin.wishes();

// One service's open wishes: a listed provider, or an OTHER service by its normalised name — the
// same key the server groups and counts by (docs/data-model.md#yêu-cầu-mở-gói).
export type WishGroup = { key: string; provider: Provider; serviceName: string | null; wishes: Wish[] };

const groupKey = (wish: Wish) => `${wish.provider}:${(wish.service_name ?? "").toLowerCase().replace(/\s+/g, " ")}`;

export function useWishesAdmin() {
  const { t } = useTranslation();
  const { data, error, loading, reload, setData } = useResource(loadWishes);
  const { busy, start, finish } = useInFlight();

  // Most wanted first; within a service, who asked first first (the API's order).
  const groups = useMemo(() => {
    const byKey = new Map<string, WishGroup>();
    for (const wish of data?.wishes ?? []) {
      const key = groupKey(wish);
      const group = byKey.get(key) ?? { key, provider: wish.provider, serviceName: wish.service_name, wishes: [] };
      group.wishes.push(wish);
      byKey.set(key, group);
    }
    return [...byKey.values()].sort((a, b) => b.wishes.length - a.wishes.length);
  }, [data]);

  const decline = useCallback(
    async (wish: Wish) => {
      if (!start(wish.code)) return false;
      const result = await api.admin.declineWish(wish.code);
      finish(wish.code);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        reload();
        return false;
      }
      setData((current) => ({ wishes: current.wishes.filter((other) => other.code !== wish.code) }));
      toast.success(t("wishesAdmin.declinedToast", { user: wish.user.display_name }));
      return true;
    },
    [finish, reload, setData, start, t],
  );

  return { groups, total: data?.wishes.length ?? 0, error, loading: loading && !data, reload, busy, decline };
}
