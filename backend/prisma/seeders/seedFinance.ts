import { PrismaClient, School, Student, User } from '../../src/generated/client';

export async function seedFinance(
  prisma: PrismaClient,
  school: School,
  students: Student[],
  staff: User[]
) {
  console.log(`  -> Seeding Finance & Accounts for ${school.name}...`);

  // 1. Account Categories, Income & Expenses, Liabilities
  const incomeCategory = await prisma.accountCategory.upsert({
    where: { schoolId_name_type: { schoolId: school.id, name: 'Tuition Income', type: 'INCOME' } },
    update: {},
    create: { name: 'Tuition Income', type: 'INCOME', schoolId: school.id }
  });

  const expenseCategory = await prisma.accountCategory.upsert({
    where: { schoolId_name_type: { schoolId: school.id, name: 'Stationery', type: 'EXPENSE' } },
    update: {},
    create: { name: 'Stationery', type: 'EXPENSE', schoolId: school.id }
  });

  const liabilityCategory = await prisma.accountCategory.upsert({
    where: { schoolId_name_type: { schoolId: school.id, name: 'Loans', type: 'LIABILITY' } },
    update: {},
    create: { name: 'Loans', type: 'LIABILITY', schoolId: school.id }
  });

  for (let i = 0; i < 10; i++) {
    await prisma.income.create({
      data: { title: `Term 1 Fees Batch ${i + 1}`, amount: 5000 + i*100, categoryId: incomeCategory.id, schoolId: school.id }
    });

    await prisma.expense.create({
      data: { title: `Expense Item ${i + 1}`, amount: 50 + i*10, categoryId: expenseCategory.id, schoolId: school.id }
    });

    await prisma.liability.create({
      data: { name: `Bank Loan ${i + 1}`, amount: 10000 + i*1000, categoryId: liabilityCategory.id, schoolId: school.id }
    });
  }

  // 2. Fees & Student Payments
  const years = [2023, 2024, 2025];
  
  for (const year of years) {
    let feeGroup = await prisma.feeGroup.findFirst({ where: { schoolId: school.id, name: 'Standard Tuition', year, billingType: 'Term 1' } });
    if (!feeGroup) {
      feeGroup = await prisma.feeGroup.create({
        data: { name: 'Standard Tuition', amount: 500, year, billingType: 'Term 1', schoolId: school.id }
      });
    }

    for (const student of students) {
      await prisma.fee.create({
        data: { studentId: student.id, term: 'Term 1', year, amount: 500, paid: 250, dueDate: new Date(year, 0, 15), status: 'partial', description: 'Tuition Fee', schoolId: school.id },
      });

      await prisma.studentPayment.create({
        data: { studentId: student.id, amount: 250, paymentMode: 'Bank Transfer', reference: `TRX-${year}-${student.id}`, date: new Date(year, 0, 10), schoolId: school.id }
      });
    }
  }

  for (const student of students) {

    // Student Wallet
    await prisma.studentWallet.upsert({
      where: { studentId: student.id },
      update: {},
      create: { studentId: student.id, balance: 50 }
    });
  }

  // 3. Uniform & Tuckshop
  for (let i = 0; i < 10; i++) {
    const uniform = await prisma.uniformItem.create({
      data: { name: `Uniform Item ${i + 1}`, orderPrice: 5, sellingPrice: 10, stockLevel: 100, schoolId: school.id }
    });

    const tuckshopItem = await prisma.tuckshopItem.create({
      data: { name: `Snack ${i + 1}`, price: 1, stock: 200, category: 'Snacks', schoolId: school.id }
    });

    await prisma.uniformSale.create({
      data: { studentId: students[0]?.id, totalAmount: 10, schoolId: school.id, items: { create: { itemId: uniform.id, quantity: 1, unitPrice: 10 } } }
    });

    await prisma.tuckshopSale.create({
      data: { totalAmount: 2, schoolId: school.id, itemId: tuckshopItem.id, quantity: 2 }
    });
  }

  // 4. Payroll & Taxes
  const taxTable = await prisma.taxTable.create({
    data: { name: 'Standard Tax 2024', effectiveFrom: new Date(), schoolId: school.id }
  });

  for (let i = 0; i < 10; i++) {
    await prisma.taxBand.create({
      data: { taxTableId: taxTable.id, minIncome: i * 1000, maxIncome: (i + 1) * 1000, rate: 10, schoolId: school.id }
    });
  }

  for (let i = 0; i < 10; i++) {
    let payrollRun = await prisma.payrollRun.findFirst({ where: { schoolId: school.id, month: (i % 12) + 1, year: 2024 } });
    if (!payrollRun) {
      payrollRun = await prisma.payrollRun.create({
        data: { month: (i % 12) + 1, year: 2024, employeesCount: 1, totalGross: 1200, totalDeductions: 120, totalNet: 1080, status: 'Completed', schoolId: school.id }
      });
    }

    if (staff.length > 0) {
      await prisma.payrollEntry.create({
        data: { payrollRunId: payrollRun.id, userId: staff[0].id, employeeName: staff[0].name, grossSalary: 1200, totalAllowances: 0, totalDeductions: 120, taxAmount: 120, netSalary: 1080, schoolId: school.id }
      });
      await prisma.salaryStub.create({
        data: { userId: staff[0].id, basicPay: 1200, netPay: 1080, month: (i % 12) + 1, year: 2024, schoolId: school.id }
      });
    }
  }

  // 5. Payment Methods & Revenue Allocation
  for (let i = 0; i < 10; i++) {
    let pm = await prisma.paymentMethod.findFirst({ where: { schoolId: school.id, name: `Method ${i + 1}` } });
    if (!pm) {
      pm = await prisma.paymentMethod.create({ data: { name: `Method ${i + 1}`, schoolId: school.id } });
    }

    await prisma.revenueAllocation.create({
      data: { name: `Fund ${i + 1}`, schoolYear: 2024, period: `Term ${i % 3 + 1}`, breakdown: [{ label: 'General', percentage: 100 }], schoolId: school.id }
    });
  }

}
