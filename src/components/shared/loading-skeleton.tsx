import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton() {
  return <Skeleton className="h-4 w-full" aria-label="Loading" role="status" />;
}
