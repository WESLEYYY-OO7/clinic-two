export interface ReceiptJob {
  invoiceId: string;
  tenantId: string;
}

export const processGenerateReceipt = async (
  job: ReceiptJob
): Promise<void> => {
  console.log(`🧾 Generating receipt for invoice ${job.invoiceId}`);
};