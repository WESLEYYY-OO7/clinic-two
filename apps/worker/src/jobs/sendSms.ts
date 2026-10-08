export interface SmsJob {
  to: string;
  message: string;
}

export const processSendSms = async (job: SmsJob): Promise<void> => {
  console.log(`📱 SMS → ${job.to}: ${job.message}`);
};