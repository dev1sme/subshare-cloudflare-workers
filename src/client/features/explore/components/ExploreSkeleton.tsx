import { Skeleton } from "../../../components/Skeleton";

export function ExploreSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-full" />
      {[0, 1].map((card) => (
        <Skeleton key={card} className="h-52 rounded-card" />
      ))}
    </div>
  );
}
