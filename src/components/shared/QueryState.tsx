import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function QueryError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="warning" role="alert">
      <AlertTitle>Unable to load this section</AlertTitle>
      <AlertDescription>Check your connection and try again.</AlertDescription>
      <Button variant="outline" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </Alert>
  );
}
export function QuerySkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
