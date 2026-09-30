import type {
  HmoAdapter,
  EligibilityResult,
  ClaimSubmission,
  ClaimResponse
} from "./HmoAdapter";

export const RelianceHmoAdapter: HmoAdapter = {
  name: "RelianceHMO",
  async verifyEligibility(memberNumber: string): Promise<EligibilityResult> {
    return { eligible: true, memberNumber };
  },
  async submitClaim(claim: ClaimSubmission): Promise<ClaimResponse> {
    return {
      claimId: `REL-${Date.now()}`,
      status: "submitted",
      message: `Submitted ₦${claim.amount} for ${claim.patientName}`
    };
  },
  async getClaimStatus(claimId: string): Promise<string> {
    return `pending (${claimId})`;
  }
};