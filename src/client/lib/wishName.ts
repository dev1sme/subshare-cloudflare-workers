import type { MyWish, Wish } from "../../shared/types";
import { PROVIDER_STYLE } from "./providers";

// What a wish is for, as shown: the provider's brand name, or the service the member typed.
export function wishName(wish: Pick<MyWish | Wish, "provider" | "service_name">): string {
  return wish.service_name ?? PROVIDER_STYLE[wish.provider].label ?? "";
}
