import { Skeleton } from "../../../components/Skeleton";

// Same shape as the loaded screen: hero card, a heading, three rows.
export function PaymentListSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-36 rounded-card" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-20 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
