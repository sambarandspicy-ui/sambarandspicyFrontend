import { getBusinessDateIST } from "@/lib/format";
import {
  idbRequest,
  isIndexedDbAvailable,
  META_STORE,
  type MetaEntry,
  withStore,
} from "./indexedDb";

const TERMINAL_ID_KEY = "terminal_id";
const DAILY_COUNTER_KEY = "daily_counter";
const TERMINAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TERMINAL_ID_LENGTH = 3;

interface DailyCounterMeta {
  businessDate: string; // YYMMDD in Asia/Kolkata
  lastSequence: number;
}

let sequenceMutex: Promise<unknown> = Promise.resolve();

function generateRandomTerminalId(): string {
  const chars: string[] = [];
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(TERMINAL_ID_LENGTH);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < TERMINAL_ID_LENGTH; i++) {
      chars.push(TERMINAL_ALPHABET[bytes[i] % TERMINAL_ALPHABET.length]);
    }
    return chars.join("");
  }
  for (let i = 0; i < TERMINAL_ID_LENGTH; i++) {
    const idx = Math.floor(Math.random() * TERMINAL_ALPHABET.length);
    chars.push(TERMINAL_ALPHABET[idx]);
  }
  return chars.join("");
}

function getBusinessDateYYMMDD(date = new Date()): string {
  return getBusinessDateIST(date).replaceAll("-", "").slice(2);
}

function isValidTerminalId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9]{2,8}$/.test(value);
}

function runSerialized<T>(task: () => Promise<T>): Promise<T> {
  const next = sequenceMutex.then(task, task);
  sequenceMutex = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function getOrCreateTerminalId(): Promise<string> {
  if (!isIndexedDbAvailable()) {
    return generateRandomTerminalId();
  }
  return runSerialized(() =>
    withStore(META_STORE, "readwrite", async (store) => {
      const existing = await idbRequest<MetaEntry<string> | undefined>(
        store.get(TERMINAL_ID_KEY),
      );
      if (existing && isValidTerminalId(existing.value)) {
        return existing.value;
      }
      const terminalId = generateRandomTerminalId();
      await idbRequest(store.put({ key: TERMINAL_ID_KEY, value: terminalId }));
      return terminalId;
    }),
  );
}

/**
 * Generates an offline-safe unique bill number in `<TERMINAL_ID>-<YYMMDD>-<0001>` format
 * using an atomic daily counter in IndexedDB keyed by `Asia/Kolkata` date.
 */
export async function generateLocalBillNumber(now = new Date()): Promise<string> {
  const yyMMdd = getBusinessDateYYMMDD(now);

  if (!isIndexedDbAvailable()) {
    const fallbackSeq = String(Math.floor(1 + Math.random() * 9999)).padStart(4, "0");
    return `${generateRandomTerminalId()}-${yyMMdd}-${fallbackSeq}`;
  }

  return runSerialized(() =>
    withStore(META_STORE, "readwrite", async (store) => {
      const [terminalEntry, counterEntry] = await Promise.all([
        idbRequest<MetaEntry<string> | undefined>(store.get(TERMINAL_ID_KEY)),
        idbRequest<MetaEntry<DailyCounterMeta> | undefined>(
          store.get(DAILY_COUNTER_KEY),
        ),
      ]);

      let terminalId = terminalEntry?.value;
      if (!isValidTerminalId(terminalId)) {
        terminalId = generateRandomTerminalId();
        await idbRequest(store.put({ key: TERMINAL_ID_KEY, value: terminalId }));
      }

      const currentCounter = counterEntry?.value;
      const nextSeq =
        currentCounter &&
        currentCounter.businessDate === yyMMdd &&
        Number.isInteger(currentCounter.lastSequence) &&
        currentCounter.lastSequence >= 0
          ? currentCounter.lastSequence + 1
          : 1;

      const updatedCounter: DailyCounterMeta = {
        businessDate: yyMMdd,
        lastSequence: nextSeq,
      };
      await idbRequest(store.put({ key: DAILY_COUNTER_KEY, value: updatedCounter }));

      const paddedSeq = String(nextSeq).padStart(4, "0");
      return `${terminalId}-${yyMMdd}-${paddedSeq}`;
    }),
  );
}
