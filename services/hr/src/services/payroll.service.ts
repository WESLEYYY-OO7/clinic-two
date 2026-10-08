export interface PayrollInput {
  employeeId: string;
  month: number;
  year: number;
  gross: number;
  deductions: number;
}

export const computeNet = (input: PayrollInput) => ({
  ...input,
  net: input.gross - input.deductions
});