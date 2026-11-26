import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-accent-foreground">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
