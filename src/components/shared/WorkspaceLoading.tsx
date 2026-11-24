import Image from "next/image";
import { LoaderCircle } from "lucide-react";

export function WorkspaceLoading({ message = "Loading workspace..." }: { message?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
      <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
        <div className="overflow-hidden rounded-3xl  p-3 ">
          <Image src="/images/Sambar&SpicyRestaurantLogo.png" width={192} height={192} alt="Sambar & Spicy" className="size-40 sm:size-48" priority />
        </div>
        <div className="mt-7 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>{message}</span>
        </div>
      </div>
    </main>
  );
}
