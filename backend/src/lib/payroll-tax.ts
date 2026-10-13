export interface TaxBand {
  min: number;
  max: number | null;
  rate: number;
}

export const DEFAULT_2026_USD_BANDS: TaxBand[] = [
  { min: 0, max: 100, rate: 0.00 },
  { min: 100, max: 3000, rate: 0.20 },
  { min: 3000, max: 6000, rate: 0.25 },
  { min: 6000, max: 10000, rate: 0.30 },
  { min: 10000, max: null, rate: 0.40 }
];

export interface BandCalculationItem {
  band: number;
  min: number;
  max: number | null;
  portion: number;
  rate: number;
  tax: number;
  formula: string;
}

export interface PayrollCalculationResult {
  grossSalary: number;
  insurableEarnings: number;
  nssaEmployee: number;
  nssaEmployer: number;
  taxableIncome: number;
  rawTax: number;
  taxCredit: number;
  netPaye: number;
  aidsLevy: number;
  necDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  employerCost: number;
  bandsBreakdown: BandCalculationItem[];
}

/**
 * Progressive PAYE calculation engine using Zimbabwe 2026 USD progressive tax bands.
 * - NSSA: 4.5% employee + 4.5% employer capped at $700 insurable earnings
 * - Taxable gross: gross less employee NSSA
 * - Progressive bands: 0%, 20%, 25%, 30%, 40%
 * - Tax credit: $100/mo floored at 0
 * - AIDS Levy: 3% of net PAYE
 */
export function calculateZimPayroll(
  grossSalary: number,
  options: {
    customBands?: TaxBand[];
    taxCredit?: number;
    necRate?: number;
    otherDeductions?: number;
  } = {}
): PayrollCalculationResult {
  const bands = options.customBands || DEFAULT_2026_USD_BANDS;
  const taxCredit = options.taxCredit !== undefined ? options.taxCredit : 100;
  const otherDeductions = options.otherDeductions || 0;

  // 1. NSSA Contribution capped at $700 insurable earnings
  const insurableEarnings = Math.min(Math.max(0, grossSalary), 700);
  const nssaEmployee = Math.round(insurableEarnings * 0.045 * 100) / 100;
  const nssaEmployer = Math.round(insurableEarnings * 0.045 * 100) / 100;

  // 2. Taxable Income for PAYE (gross after employee NSSA)
  const taxableIncome = Math.max(0, grossSalary - nssaEmployee);

  // 3. Progressive band calculation
  let rawTax = 0;
  const bandsBreakdown: BandCalculationItem[] = [];

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    if (taxableIncome <= band.min) {
      bandsBreakdown.push({
        band: i + 1,
        min: band.min,
        max: band.max,
        portion: 0,
        rate: band.rate,
        tax: 0,
        formula: `$0 @ ${(band.rate * 100).toFixed(0)}% = $0.00`
      });
      continue;
    }

    const upper = band.max !== null ? Math.min(taxableIncome, band.max) : taxableIncome;
    const portion = Math.max(0, upper - band.min);
    const taxInBand = Math.round(portion * band.rate * 100) / 100;
    rawTax += taxInBand;

    bandsBreakdown.push({
      band: i + 1,
      min: band.min,
      max: band.max,
      portion: Math.round(portion * 100) / 100,
      rate: band.rate,
      tax: taxInBand,
      formula: `$${portion.toFixed(2)} @ ${(band.rate * 100).toFixed(0)}% = $${taxInBand.toFixed(2)}`
    });
  }

  rawTax = Math.round(rawTax * 100) / 100;

  // 4. Monthly Tax Credit ($100 floored at 0)
  const netPaye = Math.round(Math.max(0, rawTax - taxCredit) * 100) / 100;

  // 5. AIDS Levy: 3% of net PAYE after credit
  const aidsLevy = Math.round(netPaye * 0.03 * 100) / 100;

  // 6. NEC Education Sector (e.g. 1.5% or tenant configured rate)
  const necRate = options.necRate !== undefined ? options.necRate : 0.015;
  const necDeduction = Math.round(grossSalary * necRate * 100) / 100;

  // 7. Total Deductions & Net Salary
  const totalDeductions = Math.round((nssaEmployee + netPaye + aidsLevy + necDeduction + otherDeductions) * 100) / 100;
  const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;
  const employerCost = Math.round((grossSalary + nssaEmployer) * 100) / 100;

  return {
    grossSalary,
    insurableEarnings,
    nssaEmployee,
    nssaEmployer,
    taxableIncome,
    rawTax,
    taxCredit,
    netPaye,
    aidsLevy,
    necDeduction,
    otherDeductions,
    totalDeductions,
    netSalary,
    employerCost,
    bandsBreakdown
  };
}
