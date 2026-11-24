import { MockPosApiClient } from "@/services/mock/mockPosApiClient";
import { HttpPosApiClient } from "./httpPosApiClient";
import type { PosApiClient } from "./types";
export const dataMode=process.env.NEXT_PUBLIC_DATA_MODE==="http"?"http":"mock";
export const api:PosApiClient=dataMode==="http"?new HttpPosApiClient():new MockPosApiClient();
export type { PosApiClient } from "./types";
