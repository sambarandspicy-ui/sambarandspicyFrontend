import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import type { InventoryItem } from "@/types/domain";
import { getStockStatus } from "@/lib/calculations";
import { formatDecimal, formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
export const unitCost = formatINR;
export const qty = formatDecimal;
export const dateTime = (s: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(s)) + " IST";
export function StockBadge({ item }: { item: InventoryItem }) {
  const status = getStockStatus(
    item.current_qty,
    item.min_limit_qty,
    item.critical_limit_qty,
  );
  return (
    <StatusBadge
      tone={
        status === "CRITICAL"
          ? "critical"
          : status === "LOW"
            ? "warning"
            : "success"
      }
    >
      {status === "CRITICAL"
        ? "Critical"
        : status === "LOW"
          ? "Low stock"
          : "Healthy"}
    </StatusBadge>
  );
}
export function ItemSelect({
  items,
  value,
  onChange,
  label = "Ingredient",
  all = false,
}: {
  items: InventoryItem[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
  all?: boolean;
}) {
  return (
    <label>
      {label}
      <NativeSelect value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all ? "All ingredients" : "Select an item"}</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name} ({i.unit}) - On hand: {qty(i.current_qty)}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}
export function DateFilters({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <>
      <label>
        From
        <Input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
        />
      </label>
      <label>
        To
        <Input type="date" value={to} onChange={(e) => onTo(e.target.value)} />
      </label>
    </>
  );
}
export const inDates = (date: string, from: string, to: string) =>
  (!from || date >= from) && (!to || date <= to);
