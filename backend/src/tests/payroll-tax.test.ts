import assert from 'assert';
import { calculateZimPayroll } from '../lib/payroll-tax';

console.log('=== Running Zimbabwe 2026 Progressive PAYE & NSSA Unit Tests ===\n');

// Case 1: $500/mo
const case1 = calculateZimPayroll(500, { necRate: 0, otherDeductions: 0 });
console.log('Case 1 ($500/mo):', {
  gross: case1.grossSalary,
  nssa: case1.nssaEmployee,
  taxable: case1.taxableIncome,
  rawTax: case1.rawTax,
  netPaye: case1.netPaye,
  aidsLevy: case1.aidsLevy,
  netSalary: case1.netSalary
});
assert.strictEqual(case1.nssaEmployee, 22.50, 'Case 1 NSSA must be 22.50');
assert.strictEqual(case1.taxableIncome, 477.50, 'Case 1 Taxable income must be 477.50');
assert.strictEqual(case1.rawTax, 75.50, 'Case 1 Raw tax must be 75.50');
assert.strictEqual(case1.netPaye, 0.00, 'Case 1 Net PAYE after $100 credit must be 0.00');
assert.strictEqual(case1.aidsLevy, 0.00, 'Case 1 AIDS Levy must be 0.00');
assert.strictEqual(case1.netSalary, 477.50, 'Case 1 Net salary must be 477.50');
console.log('Case 1 Passed! \u2713\n');

// Case 2: $2,000/mo
const case2 = calculateZimPayroll(2000, { necRate: 0, otherDeductions: 0 });
console.log('Case 2 ($2,000/mo):', {
  gross: case2.grossSalary,
  nssa: case2.nssaEmployee,
  taxable: case2.taxableIncome,
  rawTax: case2.rawTax,
  netPaye: case2.netPaye,
  aidsLevy: case2.aidsLevy,
  netSalary: case2.netSalary
});
assert.strictEqual(case2.nssaEmployee, 31.50, 'Case 2 NSSA capped at $700 must be 31.50');
assert.strictEqual(case2.taxableIncome, 1968.50, 'Case 2 Taxable income must be 1968.50');
assert.strictEqual(case2.rawTax, 373.70, 'Case 2 Raw tax must be 373.70');
assert.strictEqual(case2.netPaye, 273.70, 'Case 2 Net PAYE after credit must be 273.70');
assert.strictEqual(case2.aidsLevy, 8.21, 'Case 2 AIDS Levy (3%) must be 8.21');
assert.strictEqual(case2.netSalary, 1686.59, 'Case 2 Net salary must be 1686.59');
console.log('Case 2 Passed! \u2713\n');

// Case 3: $5,000/mo (crosses into 25% band)
const case3 = calculateZimPayroll(5000, { necRate: 0, otherDeductions: 0 });
console.log('Case 3 ($5,000/mo):', {
  gross: case3.grossSalary,
  nssa: case3.nssaEmployee,
  taxable: case3.taxableIncome,
  rawTax: case3.rawTax,
  netPaye: case3.netPaye,
  aidsLevy: case3.aidsLevy,
  netSalary: case3.netSalary
});
assert.strictEqual(case3.nssaEmployee, 31.50, 'Case 3 NSSA capped at $700 must be 31.50');
assert.strictEqual(case3.taxableIncome, 4968.50, 'Case 3 Taxable income must be 4968.50');
assert.strictEqual(case3.rawTax, 1072.13, 'Case 3 Raw tax must be 1072.13');
assert.strictEqual(case3.netPaye, 972.13, 'Case 3 Net PAYE after credit must be 972.13');
assert.strictEqual(case3.aidsLevy, 29.16, 'Case 3 AIDS Levy (3%) must be 29.16');
assert.strictEqual(case3.netSalary, 3967.21, 'Case 3 Net salary must be 3967.21');
console.log('Case 3 Passed! \u2713\n');

// Case 4: $12,000/mo (crosses into 40% band)
const case4 = calculateZimPayroll(12000, { necRate: 0, otherDeductions: 0 });
console.log('Case 4 ($12,000/mo):', {
  gross: case4.grossSalary,
  nssa: case4.nssaEmployee,
  taxable: case4.taxableIncome,
  rawTax: case4.rawTax,
  netPaye: case4.netPaye,
  aidsLevy: case4.aidsLevy,
  netSalary: case4.netSalary
});
assert.strictEqual(case4.nssaEmployee, 31.50, 'Case 4 NSSA capped at $700 must be 31.50');
assert.strictEqual(case4.taxableIncome, 11968.50, 'Case 4 Taxable income must be 11968.50');
assert.strictEqual(case4.rawTax, 3317.40, 'Case 4 Raw tax must be 3317.40');
assert.strictEqual(case4.netPaye, 3217.40, 'Case 4 Net PAYE after credit must be 3217.40');
assert.strictEqual(case4.aidsLevy, 96.52, 'Case 4 AIDS Levy (3%) must be 96.52');
assert.strictEqual(case4.netSalary, 8654.58, 'Case 4 Net salary must be 8654.58');
console.log('Case 4 Passed! \u2713\n');

console.log('====================================================');
console.log('ALL 4 PROGRESSIVE TAX BAND BOUNDARY TESTS PASSED! \u2713');
console.log('====================================================');
