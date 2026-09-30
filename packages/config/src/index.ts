export const APP_NAME = "Clinic Two";
export const APP_VERSION = "0.1.0";
export const FHIR_VERSION = "R4";

export const LOINC = {
  BODY_TEMP: "8310-5",
  HEART_RATE: "8867-4",
  RESP_RATE: "9279-1",
  BP_SYSTOLIC: "8480-6",
  BP_DIASTOLIC: "8462-4",
  SPO2: "2708-6",
  WEIGHT: "29463-7",
  HEIGHT: "8302-2",
  BMI: "39156-5"
} as const;

export const QUEUE_NAMES = {
  SMS: "sms",
  RECEIPT: "receipt",
  APPOINTMENT_REMINDER: "appointment-reminder",
  PAYROLL: "payroll"
} as const;