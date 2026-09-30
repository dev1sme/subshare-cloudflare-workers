import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { MyWish } from "../../../shared/types";
import type { Provider } from "../../../shared/providers";
import { api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";

const loadWishes = () => api.me.wishes();

// A fulfilled wish is worth telling the member about while its plan is open, has a free seat, they
// have not joined or asked yet, and they have not dismissed the notice (docs/data-model.md).
export function isOpenedNotice(wish: MyWish): boolean {
  return wish.status === "FULFILLED" && !wish.seen && wish.plan !== null && wish.plan.open && wish.plan.free_seats > 0 && !wish.plan.joined;
}

// The member's plan wishes, loaded once for the whole member area: the nav dot, the home banner and
// the Explore list all read this one copy. Mutations resolve true on success and raise their toast.
export function useWishesState() {
  const { t } = useTranslation();
  const { data, error, loading, reload } = useResource(loadWishes);
  const wishes = useMemo(() => data?.wishes ?? [], [data]);
  const notices = useMemo(() => wishes.filter(isOpenedNotice), [wishes]);

  const send = useCallback(
    async (fields: { provider: Provider; service_name: string | null; note: string }) => {
      const result = await api.me.wish({ ...fields, note: fields.note.trim() });
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      toast.success(t("wishes.sentToast"));
      reload();
      return true;
    },
    [reload, t],
  );

  const cancel = useCallback(
    async (code: string) => {
      const result = await api.me.cancelWish(code);
      reload();
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      toast.success(t("wishes.cancelledToast"));
      return true;
    },
    [reload, t],
  );

  // Hiding the notice is the member's call; a failure just leaves it there to try again.
  const dismiss = useCallback(
    async (code: string) => {
      const result = await api.me.dismissWish(code);
      if (!result.ok) toast.error(errorMessage(t, result.code));
      reload();
    },
    [reload, t],
  );

  return { wishes, notices, error, loading: loading && !data, reload, send, cancel, dismiss };
}

export type WishesState = ReturnType<typeof useWishesState>;
