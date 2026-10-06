/*
 * loading.tsx — route-level loading skeleton.
 * Why: every navigation shows structure instantly instead of a blank frame,
 * so perceived performance stays high and layout never shifts (CLS < 0.1).
 */
import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-20 w-full rounded-md" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-60 rounded-md" />
        ))}
      </div>
    </div>
  );
}
