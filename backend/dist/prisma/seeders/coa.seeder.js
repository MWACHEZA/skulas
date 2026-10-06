"use strict";
/**
 * Global Chart of Accounts (COA) Template — 80-Code Zimbabwean Boarding School Standard.
 * Seeded per tenant on creation.
 *
 * Rules:
 *  - System accounts cannot be deleted by tenants.
 *  - School Admin can add custom sub-accounts or deactivate non-system codes within their tenant.
 *  - Bank & Cash accounts are marked with isBank: true.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COA = exports.ZIMBABWE_BOARDING_COA_TEMPLATE = void 0;
exports.seedChartOfAccounts = seedChartOfAccounts;
exports.getAccountId = getAccountId;
exports.ZIMBABWE_BOARDING_COA_TEMPLATE = [
    // ═══════════════════════════════════════════════════════════════════════════
    // 1000–1999: ASSETS
    // ═══════════════════════════════════════════════════════════════════════════
    { code: '1000', name: 'Current Assets', type: 'ASSET', description: 'Liquid and short-term operational assets' },
    { code: '1010', name: 'Bank Account — Main Operations', type: 'ASSET', parentCode: '1000', isBank: true, description: 'Primary school operating account' },
    { code: '1011', name: 'Bank Account — Nostro USD', type: 'ASSET', parentCode: '1000', isBank: true, description: 'Domestic Foreign Currency Account (FCA/Nostro)' },
    { code: '1012', name: 'Bank Account — SDC Development Fund', type: 'ASSET', parentCode: '1000', isBank: true, description: 'School Development Committee capital projects' },
    { code: '1013', name: 'Bank Account — Building & Projects', type: 'ASSET', parentCode: '1000', isBank: true, description: 'Designated infrastructure expansion fund' },
    { code: '1020', name: 'Cash Office Vault', type: 'ASSET', parentCode: '1000', isBank: true, description: 'Physical cash held in Bursar vault' },
    { code: '1021', name: 'Petty Cash — Bursar Office', type: 'ASSET', parentCode: '1000', isBank: true, description: 'Day-to-day office petty cash float' },
    { code: '1022', name: 'Mobile Money Float (EcoCash / OneMoney)', type: 'ASSET', parentCode: '1000', isBank: true, description: 'Merchant mobile wallet balance' },
    { code: '1023', name: 'Tuckshop Cash Till', type: 'ASSET', parentCode: '1000', isBank: true, description: 'Canteen and tuckshop cash drawer float' },
    { code: '1024', name: 'Uniform Store Cash Till', type: 'ASSET', parentCode: '1000', isBank: true, description: 'Uniform & bookstore point-of-sale float' },
    { code: '1100', name: 'Student Debtors Control (AR)', type: 'ASSET', parentCode: '1000', description: 'Control account for all student fee receivables' },
    { code: '1110', name: 'Sundry Debtors', type: 'ASSET', parentCode: '1000', description: 'Other non-student trade and operational debtors' },
    { code: '1120', name: 'Staff Loan & Advance Receivables', type: 'ASSET', parentCode: '1000', description: 'Salary advances and staff loan balances' },
    { code: '1210', name: 'Student Accounts Receivable (Legacy Link)', type: 'ASSET', parentCode: '1000', description: 'Compatibility link for sub-ledger fee reconciliation' },
    { code: '1200', name: 'Inventory — Tuckshop Stock', type: 'ASSET', parentCode: '1000', description: 'Tuckshop goods at FIFO cost' },
    { code: '1201', name: 'Inventory — Uniforms & Apparel', type: 'ASSET', parentCode: '1000', description: 'Uniform stock at FIFO purchase cost' },
    { code: '1202', name: 'Inventory — Textbooks & Stationery', type: 'ASSET', parentCode: '1000', description: 'Bookstore and classroom consumables' },
    { code: '1220', name: 'Inventory — Dining Hall Provisions', type: 'ASSET', parentCode: '1000', description: 'Boarding kitchen dry goods and food supplies' },
    { code: '1230', name: 'Inventory — Clinic Pharmacy & Medical Supplies', type: 'ASSET', parentCode: '1000', description: 'Dispensary medication and clinic consumables' },
    { code: '1240', name: 'Inventory — Maintenance & Cleaning Supplies', type: 'ASSET', parentCode: '1000', description: 'Hostel and grounds janitorial supplies' },
    { code: '1250', name: 'Inventory — School Farm Produce & Feed', type: 'ASSET', parentCode: '1000', description: 'Farm feeds, fertilizer, and harvest stock' },
    { code: '1300', name: 'Prepaid Expenses', type: 'ASSET', parentCode: '1000', description: 'Prepaid insurance, school software licenses' },
    { code: '1500', name: 'Non-Current & Fixed Assets', type: 'ASSET', description: 'Long-term property, plant and equipment' },
    { code: '1510', name: 'Land & School Buildings', type: 'ASSET', parentCode: '1500', description: 'Freehold land, school blocks, and hostels' },
    { code: '1511', name: 'Accumulated Depreciation — Buildings', type: 'ASSET', parentCode: '1500', description: 'Contra-asset: cumulative building depreciation' },
    { code: '1520', name: 'Motor Vehicles & School Buses', type: 'ASSET', parentCode: '1500', description: 'Buses, utility trucks, and school cars' },
    { code: '1521', name: 'Accumulated Depreciation — Vehicles', type: 'ASSET', parentCode: '1500', description: 'Contra-asset: cumulative vehicle depreciation' },
    { code: '1530', name: 'Furniture, Fixtures & Fittings', type: 'ASSET', parentCode: '1500', description: 'Desks, dormitory beds, kitchen fixtures' },
    { code: '1531', name: 'Accumulated Depreciation — Furniture', type: 'ASSET', parentCode: '1500', description: 'Contra-asset: cumulative furniture depreciation' },
    { code: '1540', name: 'Computer Equipment & ICT Infrastructure', type: 'ASSET', parentCode: '1500', description: 'Servers, lab computers, networking hardware' },
    { code: '1541', name: 'Accumulated Depreciation — ICT', type: 'ASSET', parentCode: '1500', description: 'Contra-asset: cumulative computer depreciation' },
    { code: '1550', name: 'Laboratory & Scientific Equipment', type: 'ASSET', parentCode: '1500', description: 'Physics, Chemistry, and Biology lab apparatus' },
    { code: '1560', name: 'Agricultural & Farm Machinery', type: 'ASSET', parentCode: '1500', description: 'Tractor, borehole pumps, irrigation systems' },
    // ═══════════════════════════════════════════════════════════════════════════
    // 2000–2999: LIABILITIES
    // ═══════════════════════════════════════════════════════════════════════════
    { code: '2000', name: 'Current Liabilities', type: 'LIABILITY', description: 'Short-term obligations due within 12 months' },
    { code: '2010', name: 'Trade Creditors / Accounts Payable', type: 'LIABILITY', parentCode: '2000', description: 'Amounts owed to suppliers and contractors' },
    { code: '2020', name: 'PAYE Tax Payable (ZIMRA)', type: 'LIABILITY', parentCode: '2000', description: 'Pay-As-You-Earn employee tax withheld' },
    { code: '2021', name: 'VAT Output Tax (ZIMRA)', type: 'LIABILITY', parentCode: '2000', description: 'Standard rated VAT collected on commercial sales' },
    { code: '2022', name: 'AIDS Levy Payable (ZIMRA)', type: 'LIABILITY', parentCode: '2000', description: 'National AIDS Trust Fund statutory levy' },
    { code: '2030', name: 'NSSA Pension Contributions Payable', type: 'LIABILITY', parentCode: '2000', description: 'National Social Security Authority pension scheme' },
    { code: '2031', name: 'NSSA Workers Compensation (APWCS)', type: 'LIABILITY', parentCode: '2000', description: 'Accident Prevention & Workers Compensation' },
    { code: '2040', name: 'NEC Levies Payable', type: 'LIABILITY', parentCode: '2000', description: 'National Employment Council union/industry levies' },
    { code: '2050', name: 'Medical Aid Deductions Payable', type: 'LIABILITY', parentCode: '2000', description: 'Staff medical insurance contributions withheld' },
    { code: '2060', name: 'Funeral Policy Deductions Payable', type: 'LIABILITY', parentCode: '2000', description: 'Staff funeral assurance deductions' },
    { code: '2100', name: 'Student Advance Fees & Prepayments', type: 'LIABILITY', parentCode: '2000', description: 'Advance fees received for upcoming terms' },
    { code: '2110', name: 'Student Pocket Money / Digital Wallets', type: 'LIABILITY', parentCode: '2000', description: 'Student tuckshop balances held in trust' },
    { code: '2120', name: 'Caution & Breakage Deposits (Refundable)', type: 'LIABILITY', parentCode: '2000', description: 'Refundable boarding security deposits' },
    { code: '2200', name: 'Accrued Salaries & Wages', type: 'LIABILITY', parentCode: '2000', description: 'Net salaries earned but pending disbursement' },
    { code: '2210', name: 'Accrued Utilities (ZESA & Municipal Water)', type: 'LIABILITY', parentCode: '2000', description: 'Utility bills incurred but not yet settled' },
    { code: '2500', name: 'Long-Term Loans & Mortgages', type: 'LIABILITY', description: 'Non-current bank financing and capital loans' },
    // ═══════════════════════════════════════════════════════════════════════════
    // 3000–3999: EQUITY & RESERVES
    // ═══════════════════════════════════════════════════════════════════════════
    { code: '3000', name: 'Capital & Institutional Reserves', type: 'EQUITY', description: 'School equity and institutional surplus' },
    { code: '3010', name: 'Accumulated School Fund / Capital', type: 'EQUITY', parentCode: '3000', description: 'Original capital endowment and founding assets' },
    { code: '3020', name: 'Retained Surplus / (Deficit)', type: 'EQUITY', parentCode: '3000', description: 'Cumulative operational surpluses from prior periods' },
    { code: '3030', name: 'SDC Capital Development Reserve', type: 'EQUITY', parentCode: '3000', description: 'Funds restricted for infrastructure construction' },
    { code: '3050', name: 'Current Year Surplus / (Deficit)', type: 'EQUITY', parentCode: '3000', description: 'Net operating margin for the current period' },
    // ═══════════════════════════════════════════════════════════════════════════
    // 4000–4999: REVENUE & INCOME
    // ═══════════════════════════════════════════════════════════════════════════
    { code: '4000', name: 'Tuition & Academic Revenue', type: 'INCOME', description: 'Core school fees and student levies' },
    { code: '4010', name: 'Tuition Fees — Primary School', type: 'INCOME', parentCode: '4000', description: 'Academic tuition for primary grades (ZIMRA Exempt)' },
    { code: '4011', name: 'Tuition Fees — Secondary School', type: 'INCOME', parentCode: '4000', description: 'Academic tuition for Form 1 to Form 4' },
    { code: '4012', name: 'Tuition Fees — Advanced Level', type: 'INCOME', parentCode: '4000', description: 'Academic tuition for Form 5 & 6 (A-Level)' },
    { code: '4013', name: 'Exam Fees (ZIMSEC / Cambridge)', type: 'INCOME', parentCode: '4000', description: 'Exam registration and sitting levies' },
    { code: '4020', name: 'Boarding & Hostel Accommodation', type: 'INCOME', parentCode: '4000', description: 'Hostel residence charges for boarders' },
    { code: '4021', name: 'Dining Hall Catering & Food Levies', type: 'INCOME', parentCode: '4000', description: 'Boarding food and dining catering fees' },
    { code: '4030', name: 'SDC Development Levy', type: 'INCOME', parentCode: '4000', description: 'Termly building and development levies' },
    { code: '4031', name: 'Sports, Culture & Activity Levies', type: 'INCOME', parentCode: '4000', description: 'Co-curricular, sports, and tour levies' },
    { code: '4032', name: 'Computer, STEM & Science Lab Levies', type: 'INCOME', parentCode: '4000', description: 'ICT and laboratory maintenance charges' },
    { code: '4033', name: 'School Transport & Bus Levies', type: 'INCOME', parentCode: '4000', description: 'Termly day-scholar transport service fees' },
    { code: '4034', name: 'Admission & Application Fees', type: 'INCOME', parentCode: '4000', description: 'New learner enrollment and testing fees' },
    { code: '4035', name: 'Library & Learning Resource Fees', type: 'INCOME', parentCode: '4000', description: 'Textbook scheme and library subscriptions' },
    { code: '4040', name: 'Auxiliary & Commercial Sales', type: 'INCOME', description: 'Commercial and ancillary services' },
    { code: '4041', name: 'Uniform Store Sales', type: 'INCOME', parentCode: '4040', description: 'Blazers, tracksuits, badges, shirts' },
    { code: '4042', name: 'Tuckshop & Canteen Sales', type: 'INCOME', parentCode: '4040', description: 'Snacks and beverage sales (Standard rated VAT)' },
    { code: '4043', name: 'Bookstore & Stationery Sales', type: 'INCOME', parentCode: '4040', description: 'Exercise books, pens, rulers, calculators' },
    { code: '4044', name: 'School Farm Sales (Produce & Livestock)', type: 'INCOME', parentCode: '4040', description: 'Crops, eggs, broiler chickens, pigs' },
    { code: '4045', name: 'Clinic Consultation & Dispensing Fees', type: 'INCOME', parentCode: '4040', description: 'Medical service and non-emergency prescription fees' },
    { code: '4046', name: 'School Facilities Hire (Hall/Bus/Grounds)', type: 'INCOME', parentCode: '4040', description: 'Community rental of school venues' },
    { code: '4050', name: 'Donations, Grants & Alumni Gifts', type: 'INCOME', parentCode: '4040', description: 'Philanthropic support and government grants' },
    { code: '4060', name: 'Late Payment Fines & Penalties', type: 'INCOME', parentCode: '4040', description: 'Admin fees on overdue student accounts' },
    { code: '4065', name: 'Library Fines & Overdue Book Charges', type: 'INCOME', parentCode: '4040', description: 'Fines for overdue or unreturned library books' },
    { code: '4070', name: 'Bank Interest Received', type: 'INCOME', parentCode: '4040', description: 'Interest on call and deposit accounts' },
    { code: '4090', name: 'Miscellaneous Income', type: 'INCOME', parentCode: '4040', description: 'Sundry non-fee operational income' },
    { code: '4910', name: 'Till Cash Surplus / Overage', type: 'INCOME', parentCode: '4040', description: 'Cash drawer surplus on till session reconciliation' },
    // ═══════════════════════════════════════════════════════════════════════════
    // 5000–5999: OPERATIONAL EXPENDITURE
    // ═══════════════════════════════════════════════════════════════════════════
    { code: '5000', name: 'Staff Remuneration & Payroll Costs', type: 'EXPENSE', description: 'Total gross wages and employer statutory contributions' },
    { code: '5010', name: 'Salaries — Academic & Teaching Staff', type: 'EXPENSE', parentCode: '5000', description: 'Head, deputy heads, and classroom teachers' },
    { code: '5011', name: 'Salaries — Administrative Staff', type: 'EXPENSE', parentCode: '5000', description: 'Bursars, clerks, librarians, front office' },
    { code: '5012', name: 'Salaries — Ancillary & Maintenance Staff', type: 'EXPENSE', parentCode: '5000', description: 'Groundsmen, drivers, cleaners, security' },
    { code: '5013', name: 'Salaries — Kitchen & Hostel Staff', type: 'EXPENSE', parentCode: '5000', description: 'Matrons, boarding masters, cooks, kitchen aids' },
    { code: '5014', name: 'Relief & Part-time Teaching Allowances', type: 'EXPENSE', parentCode: '5000', description: 'Temporary cover teachers and coaching stipends' },
    { code: '5015', name: 'Staff Housing & Transport Allowances', type: 'EXPENSE', parentCode: '5000', description: 'Commuting allowances and boarding accommodation benefits' },
    { code: '5016', name: 'Staff Medical Aid Subsidy (Employer)', type: 'EXPENSE', parentCode: '5000', description: 'School share of medical aid premiums' },
    { code: '5017', name: 'NSSA Employer Statutory Contribution', type: 'EXPENSE', parentCode: '5000', description: 'Employer matching portion of pension & APWCS' },
    { code: '5018', name: 'Staff Training & Professional Development', type: 'EXPENSE', parentCode: '5000', description: 'Curriculum workshops and teacher development' },
    { code: '5020', name: 'Boarding, Dining & Student Welfare', type: 'EXPENSE', description: 'Student food provisions and hostel care' },
    { code: '5030', name: 'Food Provisions & Kitchen Groceries', type: 'EXPENSE', parentCode: '5020', description: 'Meal provisions (mealie-meal, meat, vegetables, bread)' },
    { code: '5031', name: 'Kitchen Gas, Firewood & Cooking Fuel', type: 'EXPENSE', parentCode: '5020', description: 'LP gas and boiler fuels for meal prep' },
    { code: '5032', name: 'Hostel Cleaning Supplies & Detergents', type: 'EXPENSE', parentCode: '5020', description: 'Floor cleaner, brooms, mops, sanitizer, toilet paper' },
    { code: '5033', name: 'Clinic Pharmaceuticals & Medical Supplies', type: 'EXPENSE', parentCode: '5020', description: 'Dispensary drugs, bandages, triage essentials' },
    { code: '5040', name: 'Premises, Facilities & Utilities', type: 'EXPENSE', description: 'School infrastructure operational costs' },
    { code: '5041', name: 'Electricity & Power (ZESA)', type: 'EXPENSE', parentCode: '5040', description: 'Grid power consumption across classrooms and hostels' },
    { code: '5042', name: 'Municipal Water & Borehole Purification', type: 'EXPENSE', parentCode: '5040', description: 'Council water charges and borehole water chlorination' },
    { code: '5043', name: 'Generator Fuel & Backup Power', type: 'EXPENSE', parentCode: '5040', description: 'Diesel for institutional backup generators' },
    { code: '5044', name: 'Building, Plumbing & Electrical Repairs', type: 'EXPENSE', parentCode: '5040', description: 'General structural repair and plumbing fixtures' },
    { code: '5045', name: 'Grounds, Sports Fields & Pool Care', type: 'EXPENSE', parentCode: '5040', description: 'Mower fuel, grass seed, swimming pool chlorine' },
    { code: '5046', name: 'Security Guard Contracts & Surveillance', type: 'EXPENSE', parentCode: '5040', description: 'External security guard contracts and CCTV maintenance' },
    { code: '5050', name: 'Transport & Fleet Logistics', type: 'EXPENSE', description: 'School bus operation and vehicle maintenance' },
    { code: '5051', name: 'Vehicle & Bus Fuel (Diesel / Petrol)', type: 'EXPENSE', parentCode: '5050', description: 'Fuel for student transport, sporting tours, and errands' },
    { code: '5052', name: 'Vehicle Servicing, Tyres & Spares', type: 'EXPENSE', parentCode: '5050', description: 'Mechanical upkeep and safety fitness tests (VID)' },
    { code: '5053', name: 'Vehicle Insurance & Road Permits', type: 'EXPENSE', parentCode: '5050', description: 'Passenger liability insurance and Zinara licensing' },
    { code: '5060', name: 'Curriculum, Teaching & Learning Resources', type: 'EXPENSE', description: 'Classroom learning materials' },
    { code: '5061', name: 'Textbooks, Library Books & Journals', type: 'EXPENSE', parentCode: '5060', description: 'Textbook replacements and reading resources' },
    { code: '5062', name: 'Exercise Books & Classroom Stationery', type: 'EXPENSE', parentCode: '5060', description: 'Chalk, whiteboard markers, test books' },
    { code: '5063', name: 'Science Laboratory Reagents & Consumables', type: 'EXPENSE', parentCode: '5060', description: 'Laboratory glassware, acids, specimens' },
    { code: '5064', name: 'CBT, ICT Lab & Internet Connectivity', type: 'EXPENSE', parentCode: '5060', description: 'Fiber internet broadband and computer consumables' },
    { code: '5065', name: 'Sports Equipment, Kits & Affiliation Fees', type: 'EXPENSE', parentCode: '5060', description: 'Football, rugby, netball kits, and tournament entrance' },
    { code: '5066', name: 'Speech Day, Prizes & School Events', type: 'EXPENSE', parentCode: '5060', description: 'Trophies, certificates, graduation logistics' },
    { code: '5070', name: 'Administration, Governance & Financial Charges', type: 'EXPENSE', description: 'Office management and banking overheads' },
    { code: '5071', name: 'Bank Charges & Financial Tax (IMTT 2%)', type: 'EXPENSE', parentCode: '5070', description: 'Bank service ledger fees and 2% IMTT transaction tax' },
    { code: '5072', name: 'External Audit & Legal Compliance Fees', type: 'EXPENSE', parentCode: '5070', description: 'Statutory audit fees and legal counsel' },
    { code: '5074', name: 'School Comprehensive Asset Insurance', type: 'EXPENSE', parentCode: '5070', description: 'Fire, storm, theft, and institutional insurance' },
    { code: '5075', name: 'Depreciation — Buildings & Property', type: 'EXPENSE', parentCode: '5070', description: 'Annual straight-line depreciation' },
    { code: '5076', name: 'Depreciation — Vehicles & Buses', type: 'EXPENSE', parentCode: '5070', description: 'Annual vehicular depreciation charge' },
    { code: '5077', name: 'Depreciation — Equipment & ICT', type: 'EXPENSE', parentCode: '5070', description: 'Annual machinery and computer depreciation' },
    { code: '5078', name: 'Bad Debts Expense / Fee Write-Offs', type: 'EXPENSE', parentCode: '5070', description: 'Authorized student arrears write-offs' },
    { code: '5080', name: 'Cost of Goods Sold — Tuckshop', type: 'EXPENSE', parentCode: '5070', description: 'Direct inventory cost of tuckshop items sold' },
    { code: '5081', name: 'Cost of Goods Sold — Uniforms', type: 'EXPENSE', parentCode: '5070', description: 'Direct acquisition cost of school uniforms sold' },
    { code: '5090', name: 'General Office & Sundry Administrative Costs', type: 'EXPENSE', parentCode: '5070', description: 'Printing, postage, and administrative sundries' },
    { code: '5910', name: 'Till Cash Shortage / Deficit', type: 'EXPENSE', parentCode: '5070', description: 'Cash drawer shortage on till session reconciliation' }
];
// Alias for backwards compatibility
exports.DEFAULT_COA = exports.ZIMBABWE_BOARDING_COA_TEMPLATE;
/**
 * Seed or update the Chart of Accounts for a school.
 */
async function seedChartOfAccounts(schoolId, db) {
    const existingCount = await db.chartOfAccount.count({ where: { schoolId } });
    if (existingCount >= 70)
        return; // Already seeded with modern template
    const codeToId = new Map();
    // Pass 1: Upsert all accounts without parentId
    for (const tpl of exports.ZIMBABWE_BOARDING_COA_TEMPLATE) {
        const account = await db.chartOfAccount.upsert({
            where: { schoolId_code: { schoolId, code: tpl.code } },
            update: {
                name: tpl.name,
                type: tpl.type,
                description: tpl.description,
                isBank: tpl.isBank || false,
                isSystemAccount: tpl.isSystem !== false,
                isActive: true
            },
            create: {
                schoolId,
                code: tpl.code,
                name: tpl.name,
                type: tpl.type,
                description: tpl.description,
                isBank: tpl.isBank || false,
                isSystemAccount: tpl.isSystem !== false,
                isActive: true
            }
        });
        codeToId.set(tpl.code, account.id);
    }
    // Pass 2: Link parent accounts
    for (const tpl of exports.ZIMBABWE_BOARDING_COA_TEMPLATE) {
        if (tpl.parentCode) {
            const parentId = codeToId.get(tpl.parentCode);
            const childId = codeToId.get(tpl.code);
            if (parentId && childId) {
                await db.chartOfAccount.update({
                    where: { id: childId },
                    data: { parentId }
                });
            }
        }
    }
}
/**
 * Helper: Resolve account ID by code with automatic fallback for legacy codes.
 */
async function getAccountId(schoolId, code, db) {
    // Legacy code translations if tenant has newer 80-code COA
    const LEGACY_MAP = {
        '1210': '1100', // Student AR -> Student Debtors Control
        '5100': '4010', // Tuition Income -> Tuition Fees Primary/Secondary
        '5130': '4020', // Boarding Fees -> Boarding & Hostel Accommodation
        '5200': '4041', // Uniform Sales -> Uniform Store Sales
        '5210': '4042', // Tuckshop Sales -> Tuckshop & Canteen Sales
        '7100': '5010', // Salaries & Wages -> Salaries Academic/Staff
        '3400': '2020', // PAYE Payable -> PAYE Tax Payable
        '3100': '2010', // Accounts Payable -> Trade Creditors
        '3110': '2010', // Supplier Payable -> Trade Creditors
        '3200': '2110', // Student Deposits -> Student Pocket Money / Digital Wallets
        '2050': '2110', // Wallets Liability -> Student Pocket Money
        '1110': '1010', // Bank Main -> Bank Account Main
        '1300': '1201', // Inventory Uniforms -> Inventory Uniforms & Apparel
        '1310': '1200', // Inventory Tuckshop -> Inventory Tuckshop Stock
        '6100': '5081', // COGS Uniforms -> Cost of Goods Sold Uniforms
        '6110': '5080', // COGS Tuckshop -> Cost of Goods Sold Tuckshop
    };
    // Try direct code match first
    let account = await db.chartOfAccount.findUnique({
        where: { schoolId_code: { schoolId, code } }
    });
    // If not found, try legacy mapped code
    if (!account && LEGACY_MAP[code]) {
        account = await db.chartOfAccount.findUnique({
            where: { schoolId_code: { schoolId, code: LEGACY_MAP[code] } }
        });
    }
    // If still not found, check if code matches any active account name or return first matching type
    if (!account) {
        // Attempt auto-seeding if completely empty
        await seedChartOfAccounts(schoolId, db);
        account = await db.chartOfAccount.findUnique({
            where: { schoolId_code: { schoolId, code } }
        });
        if (!account && LEGACY_MAP[code]) {
            account = await db.chartOfAccount.findUnique({
                where: { schoolId_code: { schoolId, code: LEGACY_MAP[code] } }
            });
        }
    }
    if (!account) {
        throw new Error(`Chart of account code '${code}' not found for school ${schoolId}.`);
    }
    if (!account.isActive) {
        throw new Error(`Account ${code} (${account.name}) is deactivated and cannot be posted to.`);
    }
    return account.id;
}
//# sourceMappingURL=coa.seeder.js.map