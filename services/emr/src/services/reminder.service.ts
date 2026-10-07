interface ReminderJob {
  id: string;
  appointmentId: string;
  tenantId: string;
  to: string;
  patientName: string;
  startsAt: Date;
  createdAt: Date;
}

const queue: ReminderJob[] = [];
let processing = false;

export const enqueueReminder = async (data: {
  appointmentId: string;
  tenantId: string;
  to: string;
  patientName: string;
  startsAt: Date;
}): Promise<string> => {
  const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  queue.push({ id, ...data, createdAt: new Date() });
  if (!processing) setTimeout(processQueue, 0);
  return id;
};

const processQueue = async () => {
  processing = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) continue;
      try {
        await sendReminderSms(job);
      } catch (err) {
        console.error(`[reminder] job ${job.id} failed:`, err);
      }
    }
  } finally {
    processing = false;
  }
};

const sendReminderSms = async (job: ReminderJob) => {
  const message =
    `Hi ${job.patientName}, this is a reminder of your appointment ` +
    `on ${job.startsAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}. ` +
    `Reply CANCEL to cancel. — Cura Health`;

  console.log("┌────────────────────────────────────────────┐");
  console.log(`│ 📱 SMS REMINDER`);
  console.log(`│ To:   ${job.to}`);
  console.log(`│ Body: ${message}`);
  console.log(`│ Job:  ${job.id}`);
  console.log("└────────────────────────────────────────────┘");
};