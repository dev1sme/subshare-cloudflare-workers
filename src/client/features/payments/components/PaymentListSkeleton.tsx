import { Skeleton } from "../../../components/Skeleton";

// Same shape as the loaded screen: title, the two figures, two plan cards, a history row.
export function PaymentListSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-3xl" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1].map((card) => (
          <Skeleton key={card} className="h-32 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-3xl" />
    </div>
  );
}
