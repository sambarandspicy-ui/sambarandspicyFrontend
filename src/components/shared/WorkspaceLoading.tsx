import Image from "next/image";

export function WorkspaceLoading({
  message = "Loading workspace...",
}: {
  message?: string;
}) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-6 text-foreground">
      {/* Subtle botanical radial aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(235,201,111,0.18),rgba(23,85,47,0.06)_38%,transparent_72%)] dark:bg-[radial-gradient(circle_at_50%_42%,rgba(235,201,111,0.14),rgba(34,118,67,0.12)_40%,transparent_72%)]"
      />

      <div
        className="relative flex w-full max-w-xs flex-col items-center text-center"
        role="status"
        aria-live="polite"
      >
        {/* Animated circular crest medallion */}
        <div className="animate-workspace-float relative grid size-44 place-items-center sm:size-48">
          {/* Breathing outer aura */}
          <span
            aria-hidden="true"
            className="animate-workspace-halo absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(235,201,111,0.45)_0%,rgba(23,85,47,0.18)_55%,transparent_75%)]"
          />

          {/* Orbiting gold-emerald ring */}
          <span
            aria-hidden="true"
            className="animate-workspace-orbit absolute inset-2 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_215deg,rgba(181,138,39,0.85)_295deg,#ebc96f_340deg,transparent_360deg)] p-[2.5px] dark:bg-[conic-gradient(from_0deg,transparent_0deg,transparent_215deg,rgba(235,201,111,0.85)_305deg,#fff3cc_345deg,transparent_360deg)]"
            style={{
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          {/* Crisp circular logo container (clips square PNG corners cleanly) */}
          <div className="relative size-36 overflow-hidden rounded-full border-2 border-[#d6b45e]/80 bg-[#092b16] shadow-[0_14px_38px_-10px_rgba(9,43,22,0.55)] ring-4 ring-[#ebc96f]/15 sm:size-40">
            <Image
              src="/images/Sambar&SpicyRestaurantLogo.png"
              width={192}
              height={192}
              alt="Sambar & Spicy"
              className="size-full scale-110 object-cover"
              priority
            />
          </div>
        </div>

        {/* Brand caption */}
        <p className="mt-5 text-xs font-bold tracking-[0.22em] text-[#8a681f] uppercase dark:text-[#ebc96f]">
          Sambar &amp; Spicy
        </p>

        {/* Smooth animated shimmer progress bar */}
        <div
          aria-hidden="true"
          className="mt-4 h-1.5 w-44 overflow-hidden rounded-full border border-[#b58a27]/25 bg-muted/90 shadow-inner"
        >
          <div className="animate-workspace-shimmer h-full w-2/5 rounded-full bg-gradient-to-r from-[#17552f] via-[#d6b45e] to-[#17552f] dark:from-[#227643] dark:via-[#ebc96f] dark:to-[#227643]" />
        </div>

        {/* Status message + subtle pulsing dots */}
        <div className="mt-3.5 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <span>{message}</span>
          <span aria-hidden="true" className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-[#b58a27] animate-bounce [animation-delay:0ms] dark:bg-[#ebc96f]" />
            <span className="size-1.5 rounded-full bg-[#b58a27] animate-bounce [animation-delay:150ms] dark:bg-[#ebc96f]" />
            <span className="size-1.5 rounded-full bg-[#b58a27] animate-bounce [animation-delay:300ms] dark:bg-[#ebc96f]" />
          </span>
        </div>
      </div>
    </main>
  );
}
