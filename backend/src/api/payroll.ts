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
        status: 'Completed',
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

    for (const emp of employees) {
      const basicSalary = (emp as any).employeeProfile?.basePay || 0;
      // In a real application, we would calculate specific allowances and deductions
      const allowances = 0; 
      const deductions = 0;
      const netSalary = basicSalary + allowances - deductions;

      entries.push({
        payrollRunId: payrollRun.id,
        schoolId,
        userId: emp.id,
        employeeName: emp.name,
        jobTitle: (emp as any).employeeProfile?.jobTitle || emp.role,
        grossSalary: basicSalary,
        totalAllowances: allowances,
        totalDeductions: deductions,
        taxAmount: 0,
        netSalary: netSalary,
        isPaid: false
      });

      totalGross += basicSalary + allowances;
      totalDeductions += deductions;
      totalNet += netSalary;
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

    res.status(201).json({ message: 'Payroll generated successfully', count: entries.length });
  } catch (error) {
    console.error('Error generating payroll', error);
    res.status(500).json({ error: 'Failed to generate payroll' });
  }
});

export default router;
