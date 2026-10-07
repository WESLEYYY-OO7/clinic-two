export interface EligibilityResult {
  eligible: boolean;
  plan?: string;
  planCode?: string;
  memberName?: string;
  reason?: string;
  copay?: number;
}

export interface ClaimSubmission {
  hmoMemberId: string;
  patientName: string;
  serviceDate: string;             // ISO date
  amount: number;
  diagnosisCodes: string[];        // ICD-10
  procedureDescription: string;
  planCode?: string;
}

export interface ClaimResponse {
  claimNumber: string;             // HMO's reference
  status: "submitted" | "rejected" | "pending";
  message?: string;
}

export interface ClaimStatusResult {
  claimNumber: string;
  status: "pending" | "under_review" | "approved" | "partially_approved" | "denied" | "paid";
  approvedAmount?: number;
  rejectionReason?: string;
}

export interface HmoAdapter {
  name: string;
  verifyEligibility(hmoMemberId: string, planCode?: string): Promise<EligibilityResult>;
  submitClaim(claim: ClaimSubmission): Promise<ClaimResponse>;
  getClaimStatus(claimNumber: string): Promise<ClaimStatusResult>;
}