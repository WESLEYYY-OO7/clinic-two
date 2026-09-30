export interface EligibilityResult {
  eligible: boolean;
  plan?: string;
  memberNumber?: string;
  reason?: string;
}

export interface ClaimSubmission {
  patientName: string;
  memberNumber: string;
  amount: number;
  diagnosisCodes: string[];
  serviceDate: string;
}

export interface ClaimResponse {
  claimId: string;
  status: "submitted" | "rejected";
  message?: string;
}

export interface HmoAdapter {
  name: string;
  verifyEligibility(memberNumber: string): Promise<EligibilityResult>;
  submitClaim(claim: ClaimSubmission): Promise<ClaimResponse>;
  getClaimStatus(claimId: string): Promise<string>;
}