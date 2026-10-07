import type { HmoAdapter } from "./HmoAdapter";
import { HygeiaAdapter } from "./HygeiaAdapter";
import { RelianceHmoAdapter } from "./RelianceHmoAdapter";

export * from "./HmoAdapter";

export const HMO_ADAPTERS: Record<string, HmoAdapter> = {
  Hygeia: HygeiaAdapter,
  RelianceHMO: RelianceHmoAdapter
};

export const SUPPORTED_HMOS = Object.keys(HMO_ADAPTERS);

export const getHmoAdapter = (hmoName: string): HmoAdapter => {
  const adapter = HMO_ADAPTERS[hmoName];
  if (!adapter) {
    throw new Error(
      `Unsupported HMO: ${hmoName}. Supported: ${SUPPORTED_HMOS.join(", ")}`
    );
  }
  return adapter;
};