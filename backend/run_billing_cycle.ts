import { PrismaClient } from './src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting billing cycle simulation...");

  // --- 1. Get a School ---
  const school = await prisma.school.findFirst({
    where: { code: "AX-EMBAKWE" },
  });

  if (!school) {
    console.error("School not found!");
    return;
  }
  console.log(`Using School: ${school.name}`);

  // --- 2. Get some students ---
  const students = await prisma.student.findMany({
    where: { schoolId: school.id },
    take: 3,
  });

  if (students.length === 0) {
    console.error("No students found!");
    return;
  }
  console.log(`Found ${students.length} students to bill.`);

  // --- 3. UPSERT FEE GROUP (idempotent) ---
  // FIX: use upsert instead of create so repeated runs don't crash on
  //      the unique constraint (schoolId, name, year, billingType).
  console.log("\n--- CREATING FEE GROUP ---");

  const feeGroupName = "FEE GROUP 2026";
  const feeGroupYear = 2026;
  const feeGroupType = "Term 1";
  const feeGroupAmt  = 1500;

  const feeGroup = await prisma.feeGroup.upsert({
    where: {
      schoolId_name_year_billingType: {
        schoolId:    school.id,
        name:        feeGroupName,
        year:        feeGroupYear,
        billingType: feeGroupType,
      },
    },
    update: { amount: feeGroupAmt },
    create: {
      name:             feeGroupName,
      amount:           feeGroupAmt,
      year:             feeGroupYear,
      billingType:      feeGroupType,
      isRecurring:      false,
      remindersEnabled: true,
      schoolId:         school.id,
    },
  });

  console.log(`Fee Group ready: "${feeGroup.name}" (Amount: $${feeGroup.amount}, ID: ${feeGroup.id})`);

  // --- 4. INVOICES (skip existing) ---
  console.log("\n--- GENERATING INVOICES ---");

  for (const student of students) {
    const existing = await prisma.fee.findFirst({
      where: { studentId: student.id, feeGroupId: feeGroup.id },
    });

    if (existing) {
      console.log(`  SKIP: Invoice already exists for ${student.name} (Fee ID: ${existing.id})`);
      continue;
    }

    const fee = await prisma.fee.create({
      data: {
        studentId:   student.id,
        feeGroupId:  feeGroup.id,
        amount:      feeGroup.amount,
        discount:    0,
        paid:        0,
        status:      "unpaid",
        term:        feeGroup.billingType,
        year:        feeGroup.year,
        dueDate:     new Date(2026, 11, 31),
        description: `Invoice for ${feeGroup.name}`,
        schoolId:    school.id,
      },
    });
    console.log(`  OK: Invoice for ${student.name}: Fee ID ${fee.id}, Amount: $${fee.amount}`);
  }

  // --- 5. RECEIPTS (idempotent by reference) ---
  console.log("\n--- GENERATING RECEIPTS (PAYMENTS) ---");

  const firstStudent = students[0];
  const feeToPay = await prisma.fee.findFirst({
    where: { studentId: firstStudent.id, feeGroupId: feeGroup.id },
  });

  if (feeToPay) {
    const paymentRef    = `SIM-REC-${feeGroup.year}-${firstStudent.id.slice(-6)}`;
    const paymentAmount = 1000;

    const existingPayment = await prisma.studentPayment.findFirst({
      where: { reference: paymentRef, feeId: feeToPay.id },
    });

    if (existingPayment) {
      console.log(`  SKIP: Payment already recorded for ${firstStudent.name} (Ref: ${paymentRef})`);
    } else {
      const payment = await prisma.studentPayment.create({
        data: {
          studentId:   firstStudent.id,
          feeId:       feeToPay.id,
          amount:      paymentAmount,
          paymentMode: "Bank Transfer",
          status:      "Commit",
          date:        new Date(),
          reference:   paymentRef,
          schoolId:    school.id,
        },
      });

      const latestFee = await prisma.fee.findUnique({ where: { id: feeToPay.id } });
      if (latestFee) {
        const updatedPaid = latestFee.paid + paymentAmount;
        const netAmount   = Math.max(0, latestFee.amount - latestFee.discount);
        const newStatus   = updatedPaid >= netAmount ? "paid"
                          : updatedPaid > 0          ? "partial"
                                                     : "unpaid";

        await prisma.fee.update({
          where: { id: feeToPay.id },
          data:  { paid: updatedPaid, status: newStatus },
        });

        console.log(`  OK: Receipt for ${firstStudent.name}: Payment ID ${payment.id}, Amount: $${payment.amount}, New Status: ${newStatus}`);
      }
    }
  }

  // --- 6. STUDENT LEDGER (scoped to this cycle) ---
  console.log("\n--- STUDENT LEDGER FOR " + firstStudent.name.toUpperCase() + " (This Billing Cycle) ---");

  const cycleFees = await prisma.fee.findMany({
    where:   { studentId: firstStudent.id, feeGroupId: feeGroup.id },
    orderBy: { createdAt: "asc" },
  });

  const cyclePayments = await prisma.studentPayment.findMany({
    where:   { studentId: firstStudent.id, fee: { feeGroupId: feeGroup.id } },
    orderBy: { date: "asc" },
  });

  interface LedgerEntry {
    date: Date;
    type: string;
    description: string;
    debit: number;
    credit: number;
  }

  const ledgerEntries: LedgerEntry[] = [];

  for (const fee of cycleFees) {
    ledgerEntries.push({
      date:        fee.createdAt,
      type:        "INVOICE",
      description: fee.description || fee.term,
      debit:       fee.amount - fee.discount,
      credit:      0,
    });
  }

  for (const pmt of cyclePayments) {
    ledgerEntries.push({
      date:        pmt.date,
      type:        "RECEIPT",
      description: `Payment via ${pmt.paymentMode} (${pmt.reference || "N/A"})`,
      debit:       0,
      credit:      pmt.amount,
    });
  }

  ledgerEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = 0;
  const SEP = "-".repeat(90);
  console.log("Date\t\tType\t\tDescription\t\t\tAmount\t\tBalance");
  console.log(SEP);

  for (const entry of ledgerEntries) {
    if (entry.debit  > 0) balance += entry.debit;
    if (entry.credit > 0) balance -= entry.credit;
    const amountStr = entry.debit > 0 ? `+$${entry.debit}` : `-$${entry.credit}`;
    const dateStr   = entry.date.toISOString().split("T")[0];
    const descStr   = entry.description.substring(0, 25).padEnd(25);
    console.log(`${dateStr}\t${entry.type.padEnd(8)}\t${descStr}\t${amountStr.padEnd(10)}\t$${balance}`);
  }

  console.log(SEP);
  console.log(`OUTSTANDING BALANCE: $${balance}`);
  console.log(SEP);

  // --- 7. CYCLE SUMMARY ---
  console.log("\n--- BILLING CYCLE SUMMARY ---");

  const allCycleFees = await prisma.fee.findMany({
    where: { feeGroupId: feeGroup.id, schoolId: school.id },
  });

  const totalBilled    = allCycleFees.reduce((sum, f) => sum + Math.max(0, f.amount - f.discount), 0);
  const totalCollected = allCycleFees.reduce((sum, f) => sum + f.paid, 0);
  const outstanding2   = Math.max(0, totalBilled - totalCollected);
  const paidCount      = allCycleFees.filter(f => f.status === "paid").length;
  const partialCount   = allCycleFees.filter(f => f.status === "partial").length;
  const unpaidCount    = allCycleFees.filter(f => f.status === "unpaid").length;
  const rate           = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : "0.0";

  console.log(`  Fee Group       : ${feeGroup.name}`);
  console.log(`  Students Billed : ${allCycleFees.length}`);
  console.log(`  Paid            : ${paidCount}`);
  console.log(`  Partial         : ${partialCount}`);
  console.log(`  Unpaid          : ${unpaidCount}`);
  console.log(`  Total Billed    : $${totalBilled.toFixed(2)}`);
  console.log(`  Total Collected : $${totalCollected.toFixed(2)}`);
  console.log(`  Outstanding     : $${outstanding2.toFixed(2)}`);
  console.log(`  Collection Rate : ${rate}%`);

  console.log("\nBilling cycle simulation completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
