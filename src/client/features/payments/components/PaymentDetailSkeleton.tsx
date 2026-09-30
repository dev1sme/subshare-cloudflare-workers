import { Skeleton } from "../../../components/Skeleton";

// The header part is skipped when the real header already drew from the link state.
export function PaymentDetailSkeleton({ withHeader }: { withHeader: boolean }) {
  return (
    <div className="flex flex-col gap-5" role="status" aria-busy="true">
      {withHeader && (
        <>
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-2xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-12 w-44" />
        </>
      )}
      <Skeleton className="h-[34rem] rounded-card" />
    </div>
  );
}
