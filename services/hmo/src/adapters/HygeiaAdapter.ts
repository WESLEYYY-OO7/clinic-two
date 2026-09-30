import type {
  HmoAdapter,
  EligibilityResult,
  ClaimSubmission,
  ClaimResponse
} from "./HmoAdapter";

/**
 * Stub adapter for Hygeia HMO.
 * Wire to real API when credentials are available.
 */
export const HygeiaAdapter: HmoAdapter = {
  name: "Hygeia",
  async verifyEligibility(memberNumber: string): Promise<EligibilityResult> {
    // TODO: real HTTP call
    return { eligible: true, memberNumber };
  },
  async submitClaim(claim: ClaimSubmission): Promise<ClaimResponse> {
    return {
      claimId: `HYG-${Date.now()}`,
      status: "submitted",
      message: `Submitted ₦${claim.amount} for ${claim.patientName}`
    };
  },
  async getClaimStatus(claimId: string): Promise<string> {
    return `pending (${claimId})`;
  }
};