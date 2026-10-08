import "dotenv/config";

console.log("🔧 Cura Health worker started");

// Worker currently runs in-process via @cura/emr/services/reminder.service.ts
// This standalone process is a placeholder for future background jobs.

setInterval(() => {
  // Keep-alive tick
}, 60_000);