import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// CLINIC
// ─────────────────────────────────────────────────────────

const TENANT = {
  name: "Ivie Specialist Clinic",
  slug: "ivie-specialist",
  plan: "ENTERPRISE" as const
};

// ─────────────────────────────────────────────────────────
// STAFF
// ─────────────────────────────────────────────────────────

const STAFF = [
  {
    email: "adaeze@ivie-specialist.ng",
    fullName: "Adaeze Okafor",
    role: "CLINIC_ADMIN" as const,
    password: "Lagos2026!"
  },
  {
    email: "dr.obi@ivie-specialist.ng",
    fullName: "Dr. Chukwuemeka Obi",
    role: "DOCTOR" as const,
    password: "Doctor2026!"
  },
  {
    email: "nurse.amaka@ivie-specialist.ng",
    fullName: "Ngozi Amaka",
    role: "NURSE" as const,
    password: "Nurse2026!"
  }
];

// ─────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────

const PATIENTS = [
  {
    firstName: "Adaeze",
    lastName: "Nwosu",
    dateOfBirth: "1991-03-15",
    gender: "FEMALE" as const,
    phone: "+234 803 456 7890",
    email: "adaeze.nwosu@example.ng",
    address: "14 Woji Road, GRA Phase 2, Port Harcourt",
    bloodGroup: "O+",
    allergies: ["penicillin"],
    nextOfKin: {
      name: "Emeka Nwosu",
      phone: "+234 803 456 7891",
      relationship: "Husband"
    }
  },
  {
    firstName: "Ibrahim",
    lastName: "Musa",
    dateOfBirth: "1967-08-22",
    gender: "MALE" as const,
    phone: "+234 706 123 4567",
    email: "ibrahim.musa@example.ng",
    address: "Plot 22, Wuse II, Abuja",
    bloodGroup: "A+",
    allergies: [],
    nextOfKin: {
      name: "Fatima Musa",
      phone: "+234 706 123 4568",
      relationship: "Wife"
    }
  },
  {
    firstName: "Folake",
    lastName: "Adeyemi",
    dateOfBirth: "1998-11-04",
    gender: "FEMALE" as const,
    phone: "+234 815 987 6543",
    email: "folake.adeyemi@example.ng",
    address: "7 Adeola Odeku Street, Victoria Island, Lagos",
    bloodGroup: "B+",
    allergies: [],
    nextOfKin: {
      name: "Tunde Adeyemi",
      phone: "+234 815 987 6544",
      relationship: "Father"
    }
  },
  {
    firstName: "Chinedu",
    lastName: "Okafor",
    dateOfBirth: "1983-05-12",
    gender: "MALE" as const,
    phone: "+234 909 234 5678",
    email: "chinedu.okafor@example.ng",
    address: "3 Ogui Road, Enugu",
    bloodGroup: "O-",
    allergies: [],
    nextOfKin: {
      name: "Ifeoma Okafor",
      phone: "+234 909 234 5679",
      relationship: "Sister"
    }
  },
  {
    firstName: "Halima",
    lastName: "Bello",
    dateOfBirth: "2019-09-30",
    gender: "FEMALE" as const,
    phone: "+234 703 555 1122",
    email: undefined,
    address: "45 Zoo Road, Kano",
    bloodGroup: "A+",
    allergies: [],
    nextOfKin: {
      name: "Aisha Bello",
      phone: "+234 703 555 1123",
      relationship: "Mother"
    }
  },
  {
    firstName: "Tunde",
    lastName: "Bakare",
    dateOfBirth: "1954-02-18",
    gender: "MALE" as const,
    phone: "+234 802 333 4455",
    email: "tunde.bakare@example.ng",
    address: "12 Bourdillon Road, Ikoyi, Lagos",
    bloodGroup: "AB+",
    allergies: [],
    nextOfKin: {
      name: "Yetunde Bakare",
      phone: "+234 802 333 4456",
      relationship: "Daughter"
    }
  },
  {
    firstName: "Ngozi",
    lastName: "Eze",
    dateOfBirth: "1980-07-25",
    gender: "FEMALE" as const,
    phone: "+234 816 222 3344",
    email: "ngozi.eze@example.ng",
    address: "9 Awka Road, Onitsha",
    bloodGroup: "O+",
    allergies: ["sulfa"],
    nextOfKin: {
      name: "Ikenna Eze",
      phone: "+234 816 222 3345",
      relationship: "Husband"
    }
  },
  {
    firstName: "Yusuf",
    lastName: "Ibrahim",
    dateOfBirth: "1995-12-08",
    gender: "MALE" as const,
    phone: "+234 705 777 8899",
    email: "yusuf.ibrahim@example.ng",
    address: "19 Ahmadu Bello Way, Kaduna",
    bloodGroup: "B-",
    allergies: [],
    nextOfKin: {
      name: "Zainab Ibrahim",
      phone: "+234 705 777 8900",
      relationship: "Wife"
    }
  }
];

// ─────────────────────────────────────────────────────────
// DRUG CATALOGUE
// ─────────────────────────────────────────────────────────

const DRUGS = [
  // Penicillins
  { name: "Amoxicillin 500mg", genericName: "amoxicillin", form: "Capsule", strength: "500mg" },
  { name: "Amoxicillin 250mg", genericName: "amoxicillin", form: "Capsule", strength: "250mg" },
  { name: "Ampicillin 500mg", genericName: "ampicillin", form: "Capsule", strength: "500mg" },
  { name: "Penicillin V 500mg", genericName: "penicillin", form: "Tablet", strength: "500mg" },
  { name: "Augmentin 625mg", genericName: "amoxicillin-clavulanate", form: "Tablet", strength: "625mg" },
  { name: "Augmentin 1g", genericName: "amoxicillin-clavulanate", form: "Tablet", strength: "1g" },

  // Sulfonamides
  { name: "Septrin 480mg", genericName: "sulfamethoxazole-trimethoprim", form: "Tablet", strength: "480mg" },
  { name: "Septrin Forte 960mg", genericName: "sulfamethoxazole-trimethoprim", form: "Tablet", strength: "960mg" },

  // NSAIDs
  { name: "Ibuprofen 400mg", genericName: "ibuprofen", form: "Tablet", strength: "400mg" },
  { name: "Diclofenac 50mg", genericName: "diclofenac", form: "Tablet", strength: "50mg" },
  { name: "Voltaren 50mg", genericName: "diclofenac", form: "Tablet", strength: "50mg" },
  { name: "Naproxen 500mg", genericName: "naproxen", form: "Tablet", strength: "500mg" },
  { name: "Aspirin 75mg", genericName: "aspirin", form: "Tablet", strength: "75mg" },
  { name: "Piroxicam 20mg", genericName: "piroxicam", form: "Capsule", strength: "20mg" },

  // Analgesics / Antipyretics
  { name: "Paracetamol 500mg", genericName: "paracetamol", form: "Tablet", strength: "500mg" },
  { name: "PCM 500mg", genericName: "paracetamol", form: "Tablet", strength: "500mg" },
  { name: "Panadol Extra", genericName: "paracetamol-caffeine", form: "Tablet", strength: "500mg/65mg" },
  { name: "Tramadol 50mg", genericName: "tramadol", form: "Capsule", strength: "50mg" },
  { name: "Morphine 10mg", genericName: "morphine", form: "Injection", strength: "10mg" },

  // Cephalosporins
  { name: "Ceftriaxone 1g", genericName: "ceftriaxone", form: "Injection", strength: "1g" },
  { name: "Cefuroxime 500mg", genericName: "cefuroxime", form: "Tablet", strength: "500mg" },
  { name: "Cefixime 400mg", genericName: "cefixime", form: "Tablet", strength: "400mg" },
  { name: "Zinnat 500mg", genericName: "cefuroxime", form: "Tablet", strength: "500mg" },

  // Macrolides
  { name: "Azithromycin 500mg", genericName: "azithromycin", form: "Tablet", strength: "500mg" },
  { name: "Zithromax 500mg", genericName: "azithromycin", form: "Tablet", strength: "500mg" },
  { name: "Erythromycin 500mg", genericName: "erythromycin", form: "Tablet", strength: "500mg" },
  { name: "Clarithromycin 500mg", genericName: "clarithromycin", form: "Tablet", strength: "500mg" },

  // Fluoroquinolones
  { name: "Ciprofloxacin 500mg", genericName: "ciprofloxacin", form: "Tablet", strength: "500mg" },
  { name: "Ciprotab 500mg", genericName: "ciprofloxacin", form: "Tablet", strength: "500mg" },
  { name: "Levofloxacin 500mg", genericName: "levofloxacin", form: "Tablet", strength: "500mg" },

  // Antimalarials
  { name: "Coartem 20/120mg", genericName: "artemether-lumefantrine", form: "Tablet", strength: "20/120mg" },
  { name: "Lonart DS 80/480mg", genericName: "artemether-lumefantrine", form: "Tablet", strength: "80/480mg" },
  { name: "Artesunate 60mg", genericName: "artesunate", form: "Injection", strength: "60mg" },
  { name: "Chloroquine 250mg", genericName: "chloroquine", form: "Tablet", strength: "250mg" },
  { name: "Fansidar 500/25mg", genericName: "sulfadoxine-pyrimethamine", form: "Tablet", strength: "500/25mg" },

  // Antihypertensives
  { name: "Amlodipine 5mg", genericName: "amlodipine", form: "Tablet", strength: "5mg" },
  { name: "Amlodipine 10mg", genericName: "amlodipine", form: "Tablet", strength: "10mg" },
  { name: "Lisinopril 10mg", genericName: "lisinopril", form: "Tablet", strength: "10mg" },
  { name: "Losartan 50mg", genericName: "losartan", form: "Tablet", strength: "50mg" },
  { name: "Hydrochlorothiazide 25mg", genericName: "hydrochlorothiazide", form: "Tablet", strength: "25mg" },
  { name: "Nifedipine 20mg", genericName: "nifedipine", form: "Tablet", strength: "20mg" },
  { name: "Lisinopril-HCTZ 20/25mg", genericName: "lisinopril-hydrochlorothiazide", form: "Tablet", strength: "20/25mg" },

  // Antidiabetics
  { name: "Metformin 500mg", genericName: "metformin", form: "Tablet", strength: "500mg" },
  { name: "Metformin 1g", genericName: "metformin", form: "Tablet", strength: "1g" },
  { name: "Glibenclamide 5mg", genericName: "glibenclamide", form: "Tablet", strength: "5mg" },
  { name: "Insulin (regular)", genericName: "insulin", form: "Injection", strength: "100 IU/mL" },

  // Anticoagulants
  { name: "Warfarin 5mg", genericName: "warfarin", form: "Tablet", strength: "5mg" },
  { name: "Heparin 5000 IU", genericName: "heparin", form: "Injection", strength: "5000 IU" },
  { name: "Clexane 40mg", genericName: "enoxaparin", form: "Injection", strength: "40mg" },
  { name: "Clopidogrel 75mg", genericName: "clopidogrel", form: "Tablet", strength: "75mg" },

  // Statins
  { name: "Atorvastatin 20mg", genericName: "atorvastatin", form: "Tablet", strength: "20mg" },
  { name: "Simvastatin 20mg", genericName: "simvastatin", form: "Tablet", strength: "20mg" },

  // Antifungals
  { name: "Fluconazole 150mg", genericName: "fluconazole", form: "Capsule", strength: "150mg" },
  { name: "Diflucan 150mg", genericName: "fluconazole", form: "Capsule", strength: "150mg" },
  { name: "Ketoconazole 200mg", genericName: "ketoconazole", form: "Tablet", strength: "200mg" },

  // Antivirals
  { name: "Acyclovir 400mg", genericName: "acyclovir", form: "Tablet", strength: "400mg" },
  { name: "Zovirax 400mg", genericName: "acyclovir", form: "Tablet", strength: "400mg" },

  // Antihistamines
  { name: "Chlorpheniramine 4mg", genericName: "chlorpheniramine", form: "Tablet", strength: "4mg" },
  { name: "Piriton 4mg", genericName: "chlorpheniramine", form: "Tablet", strength: "4mg" },
  { name: "Loratadine 10mg", genericName: "loratadine", form: "Tablet", strength: "10mg" },

  // Steroids
  { name: "Prednisolone 5mg", genericName: "prednisolone", form: "Tablet", strength: "5mg" },
  { name: "Dexamethasone 4mg", genericName: "dexamethasone", form: "Injection", strength: "4mg" },
  { name: "Hydrocortisone 100mg", genericName: "hydrocortisone", form: "Injection", strength: "100mg" },

  // PPIs
  { name: "Omeprazole 20mg", genericName: "omeprazole", form: "Capsule", strength: "20mg" },
  { name: "Losec 20mg", genericName: "omeprazole", form: "Capsule", strength: "20mg" },
  { name: "Esomeprazole 40mg", genericName: "esomeprazole", form: "Tablet", strength: "40mg" },

  // Antiemetics / GI
  { name: "Metoclopramide 10mg", genericName: "metoclopramide", form: "Tablet", strength: "10mg" },
  { name: "Maxolon 10mg", genericName: "metoclopramide", form: "Tablet", strength: "10mg" },
  { name: "Ondansetron 4mg", genericName: "ondansetron", form: "Tablet", strength: "4mg" },
  { name: "Zofran 4mg", genericName: "ondansetron", form: "Tablet", strength: "4mg" },
  { name: "Buscopan 10mg", genericName: "hyoscine butylbromide", form: "Tablet", strength: "10mg" },

  // Antibiotics (other)
  { name: "Flagyl 400mg", genericName: "metronidazole", form: "Tablet", strength: "400mg" },
  { name: "Metronidazole 200mg", genericName: "metronidazole", form: "Tablet", strength: "200mg" },
  { name: "Doxycycline 100mg", genericName: "doxycycline", form: "Capsule", strength: "100mg" },
  { name: "Tetracycline 250mg", genericName: "tetracycline", form: "Capsule", strength: "250mg" },

  // Others
  { name: "Ventolin Inhaler", genericName: "salbutamol", form: "Inhaler", strength: "100 mcg/dose" },
  { name: "Furosemide 40mg", genericName: "furosemide", form: "Tablet", strength: "40mg" },
  { name: "Lasix 40mg", genericName: "furosemide", form: "Tablet", strength: "40mg" },
  { name: "Spironolactone 25mg", genericName: "spironolactone", form: "Tablet", strength: "25mg" },

  // Anticonvulsants / Neuro
  { name: "Carbamazepine 200mg", genericName: "carbamazepine", form: "Tablet", strength: "200mg" },
  { name: "Tegretol 200mg", genericName: "carbamazepine", form: "Tablet", strength: "200mg" },
  { name: "Phenytoin 100mg", genericName: "phenytoin", form: "Capsule", strength: "100mg" }
];

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Ivie Specialist Clinic...\n");

  // Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT.slug },
    update: { name: TENANT.name },
    create: TENANT
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.slug})`);

  // Staff
  for (const s of STAFF) {
    const passwordHash = await bcrypt.hash(s.password, 12);
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: s.email } },
      update: {},
      create: {
        tenantId: tenant.id,
        email: s.email,
        passwordHash,
        fullName: s.fullName,
        role: s.role
      }
    });
    console.log(`✅ Staff: ${s.fullName} (${s.role})`);
  }

  // Patients — only seed if none exist yet
  const existingPatients = await prisma.patient.count({
    where: { tenantId: tenant.id }
  });

  if (existingPatients === 0) {
    let mrnCounter = 1;
    for (const p of PATIENTS) {
      const mrn = `MRN-${String(mrnCounter).padStart(6, "0")}`;
      await prisma.patient.create({
        data: {
          tenantId: tenant.id,
          mrn,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: new Date(p.dateOfBirth),
          gender: p.gender,
          phone: p.phone,
          email: p.email,
          address: p.address,
          bloodGroup: p.bloodGroup,
          allergies: p.allergies,
          nextOfKin: p.nextOfKin
        }
      });
      console.log(`✅ Patient: ${p.firstName} ${p.lastName} (${mrn})`);
      mrnCounter++;
    }
  } else {
    console.log(`⏭️  Skipped patients (${existingPatients} already exist)`);
  }

  // Drugs
  let drugCounter = 0;
  for (const d of DRUGS) {
    const existing = await prisma.drug.findFirst({
      where: { tenantId: tenant.id, name: d.name }
    });
    if (!existing) {
      await prisma.drug.create({
        data: {
          tenantId: tenant.id,
          name: d.name,
          genericName: d.genericName,
          form: d.form,
          strength: d.strength,
          isActive: true
        }
      });
      drugCounter++;
    }
  }

  const drugCount = await prisma.drug.count({ where: { tenantId: tenant.id } });

  console.log("\n" + "─".repeat(50));
  console.log(`🏥 ${tenant.name}`);
  console.log(`   Slug:    ${tenant.slug}`);
  console.log(`   Staff:   ${STAFF.length} users`);
  console.log(`   Drugs:   ${drugCount} in catalogue (${drugCounter} added this run)`);
  console.log("─".repeat(50));

  console.log("\n🔐 Login credentials:");
  for (const s of STAFF) {
    console.log(`   ${s.role.padEnd(14)} ${s.email.padEnd(35)} ${s.password}`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });