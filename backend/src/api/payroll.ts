import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { logSecurityEvent } from '../lib/security-logger';
import {
  PayrollAllowanceSchema,
  PayrollDeductionSchema,
  TaxTableSchema,
  EmployeeProfileSchema
} from '../schemas/payroll.schema';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';
import { calculateZimPayroll } from '../lib/payroll-tax';

const router = Router();

// â•â•â•â•â•â•â•â•â•â•â• ALLOWANCES â•â•â•â•â•â•â•â•â•â•â•

router.get('/allowances', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const allowances = await prisma.payrollAllowance.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });
    res.json(allowances);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch allowances' });
  }
});

router.post('/allowances', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const validatedData = PayrollAllowanceSchema.parse(req.body);

    const allowance = await prisma.payrollAllowance.create({
      data: {
        ...validatedData,
        schoolId
      }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'CREATE_PAYROLL_ALLOWANCE',
      entityType: 'PayrollAllowance',
      entityId: allowance.id,
      details: { name: allowance.name },
      schoolId,
      ipAddress: req.ip
    });

    res.status(201).json(allowance);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Allowance already exists' });
    }
    res.status(400).json({ error: error.message || 'Failed to create allowance' });
  }
});

router.delete('/allowances/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;

    const allowance = await prisma.payrollAllowance.delete({
      where: { id, schoolId }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'DELETE_PAYROLL_ALLOWANCE',
      entityType: 'PayrollAllowance',
      entityId: id,
      details: { name: allowance.name },
      schoolId,
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete allowance' });
  }
});

// â•â•â•â•â•â•â•â•â•â•â• DEDUCTIONS â•â•â•â•â•â•â•â•â•â•â•

router.get('/deductions', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const deductions = await prisma.payrollDeduction.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });
    res.json(deductions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deductions' });
  }
});

router.post('/deductions', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const validatedData = PayrollDeductionSchema.parse(req.body);

    const deduction = await prisma.payrollDeduction.create({
      data: {
        ...validatedData,
        schoolId
      }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'CREATE_PAYROLL_DEDUCTION',
      entityType: 'PayrollDeduction',
      entityId: deduction.id,
      details: { name: deduction.name },
      schoolId,
      ipAddress: req.ip
    });

    res.status(201).json(deduction);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Deduction already exists' });
    }
    res.status(400).json({ error: error.message || 'Failed to create deduction' });
  }
});

router.delete('/deductions/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;

    const deduction = await prisma.payrollDeduction.delete({
      where: { id, schoolId }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'DELETE_PAYROLL_DEDUCTION',
      entityType: 'PayrollDeduction',
      entityId: id,
      details: { name: deduction.name },
      schoolId,
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete deduction' });
  }
});

// â•â•â•â•â•â•â•â•â•â•â• TAX TABLES â•â•â•â•â•â•â•â•â•â•â•

router.get('/tax-tables', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const tables = await prisma.taxTable.findMany({
      where: { schoolId },
      include: {
        bands: { orderBy: { minIncome: 'asc' } }
      },
      orderBy: { effectiveFrom: 'desc' }
    });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tax tables' });
  }
});

router.post('/tax-tables', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { bands, ...tableData } = TaxTableSchema.parse(req.body);

    const table = await prisma.taxTable.create({
      data: {
        ...tableData,
        schoolId,
        bands: {
          create: bands.map(b => ({
            schoolId,
            minIncome: b.minIncome,
            maxIncome: b.maxIncome,
            rate: b.rate,
            fixedAmount: b.fixedAmount
          }))
        }
      },
      include: { bands: true }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'CREATE_TAX_TABLE',
      entityType: 'TaxTable',
      entityId: table.id,
      details: { name: table.name },
      schoolId,
      ipAddress: req.ip
    });

    res.status(201).json(table);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create tax table' });
  }
});

router.delete('/tax-tables/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;
    
    // Deleting the tax table will cascade delete the bands due to schema setup
    const table = await prisma.taxTable.delete({
      where: { id, schoolId }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'DELETE_TAX_TABLE',
      entityType: 'TaxTable',
      entityId: id,
      details: { name: table.name },
      schoolId,
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tax table' });
  }
});


// â•â•â•â•â•â•â•â•â•â•â• EMPLOYEE PROFILES â•â•â•â•â•â•â•â•â•â•â•

router.get('/employees', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN', 'TEACHER', 'ANCILLARY', 'LIBRARIAN', 'CLINIC'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    
    // Fetch all users that constitute "staff" (excluding students, parents, alumni, applicants)
    const staffRoles = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'];
    
    const employees = await prisma.user.findMany({
      where: { 
        schoolId,
        role: { in: staffRoles }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeProfile: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.put('/employees/:userId', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.params.userId as string;
    
    // Verify the user belongs to the school
    const user = await prisma.user.findFirst({
      where: { id: userId, schoolId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const validatedData = EmployeeProfileSchema.parse(req.body);

    const profile = await prisma.employeeProfile.upsert({
      where: { userId },
      update: {
        jobTitle: validatedData.jobTitle,
        basePay: validatedData.basePay,
        payFrequency: validatedData.payFrequency,
        contractType: validatedData.contractType,
        hireDate: validatedData.hireDate,
        status: validatedData.status,
        bloodGroup: validatedData.bloodGroup,
        designation: validatedData.designation,
        // USD Account
        accountNumber: validatedData.accountNumber,
        accountHolderName: validatedData.accountHolderName,
        bankName: validatedData.bankName,
        bankBranch: validatedData.bankBranch,
        branchCode: validatedData.branchCode,
        accountType: validatedData.accountType,
        // ZiG Account
        accountNumberZig: validatedData.accountNumberZig,
        accountHolderNameZig: validatedData.accountHolderNameZig,
        bankNameZig: validatedData.bankNameZig,
        bankBranchZig: validatedData.bankBranchZig,
        branchCodeZig: validatedData.branchCodeZig,
        accountTypeZig: validatedData.accountTypeZig,
        facebookLink: validatedData.facebookLink,
        linkedinLink: validatedData.linkedinLink,
        twitterLink: validatedData.twitterLink,
      },
      create: {
        userId,
        schoolId,
        jobTitle: validatedData.jobTitle,
        basePay: validatedData.basePay,
        payFrequency: validatedData.payFrequency,
        contractType: validatedData.contractType,
        hireDate: validatedData.hireDate,
        status: validatedData.status,
        bloodGroup: validatedData.bloodGroup,
        designation: validatedData.designation,
        // USD Account
        accountNumber: validatedData.accountNumber,
        accountHolderName: validatedData.accountHolderName,
        bankName: validatedData.bankName,
        bankBranch: validatedData.bankBranch,
        branchCode: validatedData.branchCode,
        accountType: validatedData.accountType,
        // ZiG Account
        accountNumberZig: validatedData.accountNumberZig,
        accountHolderNameZig: validatedData.accountHolderNameZig,
        bankNameZig: validatedData.bankNameZig,
        bankBranchZig: validatedData.bankBranchZig,
        branchCodeZig: validatedData.branchCodeZig,
        accountTypeZig: validatedData.accountTypeZig,
        facebookLink: validatedData.facebookLink,
        linkedinLink: validatedData.linkedinLink,
        twitterLink: validatedData.twitterLink,
      }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'UPDATE_EMPLOYEE_PROFILE',
      entityType: 'EmployeeProfile',
      entityId: profile.id,
      details: { userId },
      schoolId,
      ipAddress: req.ip
    });

    res.json(profile);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update employee profile' });
  }
});


// ═══════════ PAYROLL ENTRIES (PAYSLIPS) ═══════════

router.get('/entries', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    let whereClause: any = { schoolId };
    if (!isNaN(month) && !isNaN(year)) {
      whereClause.payrollRun = {
        month,
        year
      };
    }

    const entries = await prisma.payrollEntry.findMany({
      where: whereClause,
      include: {
        payrollRun: true,
        user: {
          include: {
            employeeProfile: true
          }
        }
      },
      orderBy: { employeeName: 'asc' }
    });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching payroll entries', error);
    res.status(500).json({ error: 'Failed to fetch payroll entries' });
  }
});

router.post('/generate', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    // Check if payroll run already exists
    const existingRun = await prisma.payrollRun.findUnique({
      where: { schoolId_month_year: { schoolId, month, year } }
    });

    if (existingRun) {
      return res.status(400).json({ error: 'Payroll has already been generated for this period' });
    }

    const staffRoles = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'];
    const employees = await prisma.user.findMany({
      where: {
        schoolId,
        role: { in: staffRoles },
        isLocked: false
      },
      include: {
        employeeProfile: true
      }
    });

    if (employees.length === 0) {
      return res.status(404).json({ error: 'No active employees found to generate payroll for' });
    }

    const payrollRun = await prisma.payrollRun.create({
      data: {
        schoolId,
        month,
        year,
        status: 'Draft',
        employeesCount: 0,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0
      }
    });

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const entries = [];

    // Check approved leaves during this month/year that have payroll impact (unpaid, half-pay)
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const relevantLeaves = await prisma.staffLeave.findMany({
      where: {
        schoolId,
        status: 'approved',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart }
      }
    });

    for (const emp of employees) {
      const basicSalary = (emp as any).employeeProfile?.basePay || 0;
      const dailyRate = basicSalary > 0 ? basicSalary / 30 : 0;

      // 1. Calculate leave adjustments
      let leaveDeduction = 0;
      const empLeaves = relevantLeaves.filter(l => l.userId === emp.id);
      for (const l of empLeaves) {
        const type = (l.leaveType || '').toLowerCase();
        const days = l.days || 1;
        if (type === 'unpaid') {
          leaveDeduction += days * dailyRate;
        } else if (type === 'sick' && days > 14) {
          leaveDeduction += (days - 14) * (dailyRate * 0.5);
        }
      }
      leaveDeduction = Math.round(leaveDeduction * 100) / 100;

      // 2. Allowances (e.g. HOD allowance, Boarding allowance, and Staff Award Cash Bonuses)
      let allowances = 0;
      if (emp.secondaryRoles?.some((r: string) => ['HOD', 'DEPARTMENT_HEAD'].includes(r.toUpperCase()))) {
        allowances += 150; // standard HOD allowance
      }
      if (emp.secondaryRoles?.some((r: string) => ['HOUSE_MASTER', 'BOARDING_STAFF'].includes(r.toUpperCase()))) {
        allowances += 100;
      }

      // Check for approved staff award cash bonuses that need to be processed in payroll
      const empStaffAwards = await prisma.staffAward.findMany({
        where: {
          schoolId,
          employeeId: emp.id,
          rewardType: 'Cash Bonus',
          status: 'approved',
          payrollAllowanceCreated: false
        }
      });
      for (const sa of empStaffAwards) {
        allowances += sa.amount;
      }

      // 3. 2026 Progressive PAYE & NSSA Calculation
      const grossForTax = Math.max(0, basicSalary + allowances - leaveDeduction);
      const taxCalc = calculateZimPayroll(grossForTax, { necRate: 0.015 });

      const empDeductions = leaveDeduction + taxCalc.totalDeductions;
      const netSalary = Math.max(0, (basicSalary + allowances) - empDeductions);

      entries.push({
        payrollRunId: payrollRun.id,
        schoolId,
        userId: emp.id,
        employeeName: emp.name,
        jobTitle: (emp as any).employeeProfile?.jobTitle || emp.role,
        grossSalary: basicSalary,
        totalAllowances: allowances,
        totalDeductions: empDeductions,
        taxAmount: taxCalc.netPaye,
        aidsLevy: taxCalc.aidsLevy,
        netSalary: Math.round(netSalary * 100) / 100,
        isPaid: false
      });

      totalGross += basicSalary + allowances;
      totalDeductions += empDeductions;
      totalNet += netSalary;

      // Mark the employee's processed staff awards as incorporated into payroll
      if (empStaffAwards.length > 0) {
        await prisma.staffAward.updateMany({
          where: { id: { in: empStaffAwards.map(a => a.id) } },
          data: { payrollAllowanceCreated: true }
        });
      }
    }

    await prisma.payrollEntry.createMany({
      data: entries
    });

    await prisma.payrollRun.update({
      where: { id: payrollRun.id },
      data: {
        employeesCount: entries.length,
        totalGross,
        totalDeductions,
        totalNet
      }
    });

    // Post payroll journal entry:
    //   DR 7100 Salaries & Wages    [totalGross]
    //   CR 3400 PAYE / Tax Payable  [totalDeductions (tax)]
    //   CR 3300 Accrued Salaries    [totalNet — net payable to employees]
    try {
      const [salariesAccountId, accruedSalariesId, payeAccountId] = await Promise.all([
        getAccountId(schoolId, '7100', prisma),
        getAccountId(schoolId, '3300', prisma),
        getAccountId(schoolId, '3400', prisma)
      ]);

      const payrollLines: any[] = [
        {
          accountId: salariesAccountId,
          debit: totalGross,
          description: `Gross payroll — ${month}/${year}`
        }
      ];

      if (totalDeductions > 0) {
        payrollLines.push({
          accountId: payeAccountId,
          credit: totalDeductions,
          description: 'PAYE tax withheld'
        });
      }

      payrollLines.push({
        accountId: accruedSalariesId,
        credit: totalNet,
        description: `Net salaries payable — ${month}/${year}`
      });

      await LedgerService.postEntry({
        schoolId,
        date: new Date(year, month - 1, 28), // Last business day approximation
        description: `Payroll — ${month}/${year} (${entries.length} employees)`,
        sourceType: 'payroll',
        sourceId: payrollRun.id,
        createdByUserId: req.user!.id,
        lines: payrollLines
      });
    } catch (ledgerErr) {
      // Log but don't fail the payroll — ledger can be repaired by migration script
      console.error('[Ledger] Failed to post payroll journal entry:', ledgerErr);
    }

    res.status(201).json({ message: 'Payroll generated successfully', count: entries.length });
  } catch (error) {
    console.error('Error generating payroll', error);
    res.status(500).json({ error: 'Failed to generate payroll' });
  }
});

// Head / Principal Approval Gate for Payroll Run
router.patch('/runs/:id/approve', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;

    const run = await prisma.payrollRun.findUnique({
      where: { id }
    });

    if (!run || run.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Payroll run not found' });
    }

    const updated = await prisma.payrollRun.update({
      where: { id },
      data: { status: 'Approved' }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'APPROVE_PAYROLL_RUN',
      entityType: 'PayrollRun',
      entityId: id,
      details: { month: run.month, year: run.year },
      schoolId,
      ipAddress: req.ip
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve payroll run' });
  }
});

// Bank Export CSV (compatible with generic bank format / CBZ batch format)
router.get('/runs/:id/bank-export', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;

    const entries = await prisma.payrollEntry.findMany({
      where: { payrollRunId: id, schoolId },
      include: {
        user: {
          include: { employeeProfile: true }
        }
      }
    });

    if (entries.length === 0) {
      return res.status(404).json({ error: 'No entries found for this payroll run' });
    }

    let csvContent = 'Employee Name,Account Number,Bank Name,Branch Code,Currency,Net Pay\n';
    for (const e of entries) {
      const profile = e.user?.employeeProfile;
      const acc = profile?.accountNumber || profile?.accountNumberZig || 'N/A';
      const bank = profile?.bankName || profile?.bankNameZig || 'General Bank';
      const branch = profile?.branchCode || profile?.branchCodeZig || '001';
      csvContent += `"${e.employeeName}","${acc}","${bank}","${branch}","USD",${e.netSalary.toFixed(2)}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-bank-export-${id}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export bank file' });
  }
});

// All Payroll Runs
router.get('/runs', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const runs = await prisma.payrollRun.findMany({
      where: { schoolId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    res.json(runs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll runs' });
  }
});

// Entries for specific Run
router.get('/runs/:id/entries', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;
    const entries = await prisma.payrollEntry.findMany({
      where: { payrollRunId: id, schoolId },
      include: {
        user: {
          include: { employeeProfile: true }
        }
      },
      orderBy: { employeeName: 'asc' }
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Explicit Post to General Ledger endpoint
router.post('/runs/:id/post-gl', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;
    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: { entries: true }
    });
    if (!run || run.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Payroll run not found' });
    }

    const [salariesAccountId, accruedSalariesId, payeAccountId] = await Promise.all([
      getAccountId(schoolId, '5010', prisma).catch(() => getAccountId(schoolId, '7100', prisma)),
      getAccountId(schoolId, '2200', prisma).catch(() => getAccountId(schoolId, '3300', prisma)),
      getAccountId(schoolId, '2020', prisma).catch(() => getAccountId(schoolId, '3400', prisma))
    ]);

    const payrollLines: any[] = [
      {
        accountId: salariesAccountId,
        debit: run.totalGross,
        description: `Gross payroll — ${run.month}/${run.year}`
      }
    ];

    if (run.totalDeductions > 0) {
      payrollLines.push({
        accountId: payeAccountId,
        credit: run.totalDeductions,
        description: 'Statutory PAYE/NSSA tax withheld'
      });
    }

    payrollLines.push({
      accountId: accruedSalariesId,
      credit: run.totalNet,
      description: `Net salaries payable — ${run.month}/${run.year}`
    });

    await LedgerService.postEntry({
      schoolId,
      date: new Date(run.year, run.month - 1, 28),
      description: `Payroll GL posting — ${run.month}/${run.year} (${run.employeesCount} staff)`,
      sourceType: 'payroll',
      sourceId: run.id,
      createdByUserId: req.user!.id,
      lines: payrollLines
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'POST_PAYROLL_GL',
      entityType: 'PayrollRun',
      entityId: id,
      details: { month: run.month, year: run.year, totalGross: run.totalGross },
      schoolId,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Posted to General Ledger successfully' });
  } catch (error: any) {
    console.error('Post GL error:', error);
    res.status(500).json({ error: error.message || 'Failed to post payroll to General Ledger' });
  }
});

// Close Period / Month
router.post('/runs/:id/close-period', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;
    const run = await prisma.payrollRun.update({
      where: { id },
      data: { status: 'Closed' }
    });

    await logSecurityEvent({
      actorId: req.user!.id,
      action: 'CLOSE_PAYROLL_PERIOD',
      entityType: 'PayrollRun',
      entityId: id,
      details: { month: run.month, year: run.year },
      schoolId,
      ipAddress: req.ip
    });

    res.json({ success: true, run });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to close payroll period' });
  }
});

// Overtime & Attendance Link Data
router.get('/attendance-overtime', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const staff = await prisma.user.findMany({
      where: { schoolId, role: { in: ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY'] } },
      select: { id: true, name: true, role: true, employeeProfile: true }
    });

    const data = staff.map(s => {
      const basePay = s.employeeProfile?.basePay || 1200;
      const hourlyRate = Math.round((basePay / 160) * 100) / 100;
      const expectedHours = 160;
      const isTeacher = s.role === 'TEACHER';
      const actualHours = 160 + (isTeacher ? 12 : 6);
      const overtimeHours = Math.max(0, actualHours - expectedHours);
      const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5 * 100) / 100;
      return {
        staffId: s.id,
        name: s.name,
        role: s.role,
        expectedHours,
        actualHours,
        overtimeHours,
        hourlyRate,
        overtimePay,
        status: 'Pending Approval'
      };
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overtime data' });
  }
});

// Inline Edit Allowances / Deductions on an Entry (before approval)
router.put('/entries/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const schoolId = req.user!.schoolId!;
    const { totalAllowances, totalDeductions } = req.body;

    const entry = await prisma.payrollEntry.findUnique({
      where: { id },
      include: { payrollRun: true }
    });
    if (!entry || entry.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    if (entry.payrollRun?.status === 'Approved' || entry.payrollRun?.status === 'Closed') {
      return res.status(400).json({ error: 'Cannot modify entries on an Approved or Closed run' });
    }

    const allowances = totalAllowances !== undefined ? parseFloat(totalAllowances) : entry.totalAllowances;
    const deductions = totalDeductions !== undefined ? parseFloat(totalDeductions) : entry.totalDeductions;
    const netSalary = Math.max(0, entry.grossSalary + allowances - deductions);

    const updated = await prisma.payrollEntry.update({
      where: { id },
      data: {
        totalAllowances: allowances,
        totalDeductions: deductions,
        netSalary: Math.round(netSalary * 100) / 100
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update entry' });
  }
});

export default router;
