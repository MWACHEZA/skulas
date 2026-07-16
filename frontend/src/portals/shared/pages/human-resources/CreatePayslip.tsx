import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../../../lib/api';

export default function CreatePayslip() {
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      departmentId: '',
      userId: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      allowances: [{ type: '', amount: 0 }],
      deductions: [{ type: '', amount: 0 }],
      basicSalary: 0,
      totalAllowance: 0,
      totalDeduction: 0,
      netSalary: 0,
      status: 'Paid'
    }
  });

  const { fields: allowanceFields, append: appendAllowance, remove: removeAllowance } = useFieldArray({
    control,
    name: 'allowances'
  });

  const { fields: deductionFields, append: appendDeduction, remove: removeDeduction } = useFieldArray({
    control,
    name: 'deductions'
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        api.get('/api/departments'),
        api.get('/api/payroll/employees')
      ]);
      setDepartments(deptRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      console.error('Failed to load options', error);
    
    }
  };

  const getInfo = () => {
    const userId = watch('userId');
    const employee = employees.find(e => e.id === userId);
    if (employee && employee.employeeProfile) {
      setValue('basicSalary', employee.employeeProfile.basePay || 0);
    } else {
      setValue('basicSalary', 0);
    }
    calculateNetSalary();
  };

  const calculateTotalAllowance = () => {
    const allowances = watch('allowances');
    const total = allowances.reduce((sum, item) => sum + (parseFloat(item.amount as any) || 0), 0);
    setValue('totalAllowance', total);
    calculateNetSalary(total, watch('totalDeduction'));
  };

  const calculateTotalDeduction = () => {
    const deductions = watch('deductions');
    const total = deductions.reduce((sum, item) => sum + (parseFloat(item.amount as any) || 0), 0);
    setValue('totalDeduction', total);
    calculateNetSalary(watch('totalAllowance'), total);
  };

  const calculateNetSalary = (allowanceAmt?: number, deductionAmt?: number) => {
    const basic = parseFloat(watch('basicSalary') as any) || 0;
    const allow = allowanceAmt ?? (parseFloat(watch('totalAllowance') as any) || 0);
    const deduct = deductionAmt ?? (parseFloat(watch('totalDeduction') as any) || 0);
    setValue('netSalary', basic + allow - deduct);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const employee = employees.find(e => e.id === data.userId);
      const payload = {
        userId: data.userId,
        employeeName: employee?.name || 'Unknown',
        jobTitle: employee?.employeeProfile?.jobTitle || '',
        month: parseInt(data.month),
        year: parseInt(data.year),
        basicSalary: data.basicSalary,
        totalAllowances: data.totalAllowance,
        totalDeductions: data.totalDeduction,
        netSalary: data.netSalary,
        status: data.status
      };
      
      await api.post('/api/payroll/entry', payload);
      alert('Payslip generated and saved successfully!');
    } catch (error) {
      console.error('Failed to save payslip', error);
      alert('Failed to save payslip.');
    } finally {
      setLoading(false);
    }
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <h3>Create Payroll Payslip</h3>
        <p>Set basic pay, allowances, and deductions to generate employee payslips</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
        
        {/* Top Selection Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div>
            <label className="portal-label">Department</label>
            <select {...register('departmentId')} className="portal-input">
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="portal-label">Employee</label>
            <select {...register('userId')} className="portal-input">
              <option value="">Select Employee</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="portal-label">Month</label>
            <select {...register('month')} className="portal-input">
              {months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="portal-label">Year</label>
            <select {...register('year')} className="portal-input">
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <button type="button" onClick={getInfo} className="portal-btn-primary" style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <i className="fas fa-search"></i> Get Info
            </button>
          </div>
        </div>

        {/* Allowances and Deductions Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginTop: '10px' }}>
          
          {/* Allowances */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 20px', position: 'relative', background: '#fff' }}>
            <h4 style={{ position: 'absolute', top: '-12px', left: '16px', background: '#fff', padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fas fa-plus" style={{ color: 'var(--portal-success)' }}></i> Allowances
            </h4>
            
            {allowanceFields.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
                <div style={{ flex: 2 }}>
                  <input {...register(`allowances.${index}.type` as const)} placeholder="Type" className="portal-input" style={{ padding: '8px 12px' }} />
                </div>
                <div style={{ flex: 2 }}>
                  <input {...register(`allowances.${index}.amount` as const)} type="number" placeholder="Amount" className="portal-input" style={{ padding: '8px 12px' }} />
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button type="button" onClick={() => appendAllowance({ type: '', amount: 0 })} className="portal-btn-primary" style={{ background: '#00BCD4', borderColor: '#00BCD4', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-plus"></i>
                  </button>
                  {index > 0 && (
                    <button type="button" onClick={() => removeAllowance(index)} className="portal-btn-danger" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-minus"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button type="button" onClick={calculateTotalAllowance} className="portal-btn-primary" style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', padding: '10px 16px', fontSize: '0.85rem' }}>
              <i className="fas fa-calculator"></i> Calculate Allowance
            </button>
          </div>

          {/* Deductions */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 20px', position: 'relative', background: '#fff' }}>
            <h4 style={{ position: 'absolute', top: '-12px', left: '16px', background: '#fff', padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fas fa-minus" style={{ color: 'var(--portal-danger)' }}></i> Deductions
            </h4>
            
            {deductionFields.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
                <div style={{ flex: 2 }}>
                  <input {...register(`deductions.${index}.type` as const)} placeholder="Type" className="portal-input" style={{ padding: '8px 12px' }} />
                </div>
                <div style={{ flex: 2 }}>
                  <input {...register(`deductions.${index}.amount` as const)} type="number" placeholder="Amount" className="portal-input" style={{ padding: '8px 12px' }} />
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button type="button" onClick={() => appendDeduction({ type: '', amount: 0 })} className="portal-btn-primary" style={{ background: '#00BCD4', borderColor: '#00BCD4', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-plus"></i>
                  </button>
                  {index > 0 && (
                    <button type="button" onClick={() => removeDeduction(index)} className="portal-btn-danger" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-minus"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button type="button" onClick={calculateTotalDeduction} className="portal-btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', padding: '10px 16px', fontSize: '0.85rem' }}>
              <i className="fas fa-calculator"></i> Calculate Deduction
            </button>
          </div>

        </div>

        {/* Totals Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label className="portal-label">Basic Salary ($)</label>
              <input {...register('basicSalary')} type="number" className="portal-input" onChange={() => calculateNetSalary()} />
            </div>
            <div>
              <label className="portal-label">Total Allowance ($)</label>
              <input {...register('totalAllowance')} type="number" readOnly className="portal-input" style={{ background: '#f8fafc', color: '#0f172a', fontWeight: 600 }} />
            </div>
            <div>
              <label className="portal-label">Total Deduction ($)</label>
              <input {...register('totalDeduction')} type="number" readOnly className="portal-input" style={{ background: '#f8fafc', color: '#0f172a', fontWeight: 600 }} />
            </div>
            <div>
              <label className="portal-label">Net Salary ($)</label>
              <input {...register('netSalary')} type="number" readOnly className="portal-input" style={{ background: '#f0fdf4', color: '#166534', fontWeight: 800, fontSize: '1.1rem' }} />
            </div>
            <div>
              <label className="portal-label">Status</label>
              <select {...register('status')} className="portal-input">
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        </div>

        <button disabled={loading} type="submit" className="portal-btn-primary" style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '10px' }}>
          {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>} Save Payroll Entry
        </button>

      </form>
    </div>
  );
}
