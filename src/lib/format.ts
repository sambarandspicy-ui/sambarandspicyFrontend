import { round } from "@/lib/calculations";
import type { ReportDateRange, ReportPeriod } from "@/types/domain";
export function formatDecimal(value: number) { return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(round(value, 2)); }
export function formatINR(amount: number, options: { compact?: boolean } = {}) { void options; if (!Number.isFinite(amount)) throw new RangeError("Amount must be finite"); return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(round(amount, 2)); }
export function getBusinessDateIST(date = new Date()) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); return `${parts.find(p=>p.type === "year")?.value}-${parts.find(p=>p.type === "month")?.value}-${parts.find(p=>p.type === "day")?.value}`; }
export function resolvePeriodRange(period: ReportPeriod, anchorDate: string | Date = new Date()): ReportDateRange { if (period === "LIFETIME") return {from:null,to:null}; const anchor = typeof anchorDate === "string" ? anchorDate : getBusinessDateIST(anchorDate); if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) throw new RangeError("Invalid business date"); const d = new Date(`${anchor}T00:00:00Z`); if (Number.isNaN(d.valueOf()) || d.toISOString().slice(0,10) !== anchor) throw new RangeError("Invalid business date"); const y=d.getUTCFullYear(),m=d.getUTCMonth(); let start=d, end=new Date(d); if(period === "WEEKLY") { start=new Date(d); start.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7); end=new Date(start); end.setUTCDate(start.getUTCDate()+6); } if(period === "MONTHLY") { start=new Date(Date.UTC(y,m,1)); end=new Date(Date.UTC(y,m+1,0)); } if(period === "QUARTERLY") { const q=Math.floor(m/3)*3; start=new Date(Date.UTC(y,q,1)); end=new Date(Date.UTC(y,q+3,0)); } if(period === "YEARLY") { start=new Date(Date.UTC(y,0,1)); end=new Date(Date.UTC(y,11,31)); } return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)}; }
export function resolveAssetUrl(path: string | null | undefined, fallback: string): string {
  if (!path) return fallback;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  if (path.startsWith("/uploads/")) {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
    try {
      const origin = new URL(apiBase).origin;
      return `${origin}${path}`;
    } catch {
      return path;
    }
  }
  return path;
}
