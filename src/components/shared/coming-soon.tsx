import Link from "next/link";
import { ArrowLeft, BarChart3, Boxes, Clock3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ComingSoon({ section }: { section: "Inventory" | "Reports" }) {
  const Icon = section === "Inventory" ? Boxes : BarChart3;

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center py-6 sm:py-10">
      <Card className="relative w-full max-w-2xl overflow-hidden px-6 py-10 text-center sm:px-12 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden="true" className="relative mx-auto mb-8 grid size-36 place-items-center sm:size-40">
          <div className="absolute inset-0 rotate-6 rounded-[2rem] border border-primary/15 bg-primary/5" />
          <div className="absolute inset-3 -rotate-6 rounded-[1.75rem] border border-primary/20 bg-card shadow-sm" />
          <div className="relative grid size-20 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Icon size={38} strokeWidth={1.7} />
          </div>
          <span className="absolute right-0 top-2 grid size-10 place-items-center rounded-2xl border border-border bg-card text-primary shadow-sm"><Sparkles size={19} /></span>
          <span className="absolute bottom-1 left-0 grid size-10 place-items-center rounded-2xl border border-border bg-card text-primary shadow-sm"><Clock3 size={19} /></span>
        </div>
        <span className="relative inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" /> Coming soon
        </span>
        <h1 className="relative mt-5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{section} {section === "Reports" ? "are" : "is"} coming soon</h1>
        <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
          We’re working on this section. Check back later for updates.
        </p>
        <Button asChild size="lg" className="relative mt-8 min-h-11 inline-flex items-center gap-2">
          <Link href="/billing"><ArrowLeft className="size-4 shrink-0" aria-hidden="true" /> <span>Back to billing</span></Link>
        </Button>
      </Card>
    </div>
  );
}
