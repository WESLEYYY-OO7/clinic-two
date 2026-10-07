import type {
  HmoAdapter,
  EligibilityResult,
  ClaimSubmission,
  ClaimResponse,
  ClaimStatusResult
} from "./HmoAdapter";

/**
 * Reliance HMO adapter.
 * Real integration lives here when credentials are available.
 */
export const RelianceHmoAdapter: HmoAdapter = {
  name: "RelianceHMO",

  async verifyEligibility(hmoMemberId: string, planCode?: string): Promise<EligibilityResult> {
    if (!hmoMemberId || hmoMemberId.length < 5) {
      return { eligible: false, reason: "Invalid member ID" };
    }

    return {
      eligible: true,
      plan: "Reliance Standard",
      planCode: planCode ?? "REL-STD",
      memberName: "Verified Member",
      copay: 0.20
    };
  },

  async submitClaim(claim: ClaimSubmission): Promise<ClaimResponse> {
    const claimNumber = `REL-${Date.now().toString().slice(-8)}`;
    return {
      claimNumber,
      status: "submitted",
      message: `Claim submitted for ₦${claim.amount.toLocaleString()}`
    };
  },

  async getClaimStatus(claimNumber: string): Promise<ClaimStatusResult> {
    return {
      claimNumber,
      status: "under_review"
    };
  }
};