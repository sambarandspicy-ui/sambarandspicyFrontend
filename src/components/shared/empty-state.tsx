export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
      <strong className="text-sm text-foreground">{title}</strong>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
