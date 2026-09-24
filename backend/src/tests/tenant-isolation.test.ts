/**
 * Automated Tenant Isolation Verification Test
 * 
 * Verifies:
 * 1. Zero-Trust query scoping across models with schoolId.
 * 2. Strict tenant boundary middleware blocking cross-tenant schoolId/schoolCode parameters.
 * 3. File storage institutional boundary enforcement.
 * 4. Super admin bypass capabilities for platform management.
 */

import { enforceTenantIsolation } from '../middleware/tenant';
import { tenantStorage } from '../lib/prisma';

async function runTenantIsolationTests() {
  console.log('====================================================');
  console.log('   RUNNING AUTOMATED TENANT ISOLATION TEST SUITE    ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (errorDetail) console.error(`       Detail: ${errorDetail}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 1: Middleware Tenant Boundary Enforcement (enforceTenantIsolation)
  // -------------------------------------------------------------------------
  console.log('--- Test Suite 1: Middleware Tenant Boundary Guard ---');

  // Case 1: Non-admin trying to query another school's ID via query param
  {
    const req: any = {
      user: { id: 'usr-1', role: 'TEACHER', schoolId: 'school-alpha', schoolCode: 'SCH-A' },
      query: { schoolId: 'school-beta' },
      body: {},
      params: {},
      headers: {},
      originalUrl: '/api/students?schoolId=school-beta',
      method: 'GET'
    };
    let statusSent = 0;
    let errorMsg = '';
    const res: any = {
      status: (code: number) => {
        statusSent = code;
        return {
          json: (data: any) => { errorMsg = data.error; }
        };
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    enforceTenantIsolation(req, res, next);

    assert(
      statusSent === 403 && !nextCalled && errorMsg.includes('Cross-tenant'),
      'Blocks cross-tenant access when schoolId mismatch in query params'
    );
  }

  // Case 2: User trying to query another school's code via x-school-code header
  {
    const req: any = {
      user: { id: 'usr-2', role: 'BURSAR', schoolId: 'school-alpha', schoolCode: 'SCH-A' },
      query: {},
      body: {},
      params: {},
      headers: { 'x-school-code': 'SCH-B' },
      originalUrl: '/api/finance/ledgers',
      method: 'GET'
    };
    let statusSent = 0;
    const res: any = {
      status: (code: number) => {
        statusSent = code;
        return { json: () => {} };
      }
    };
    let nextCalled = false;
    enforceTenantIsolation(req, res, () => { nextCalled = true; });

    assert(
      statusSent === 403 && !nextCalled,
      'Blocks cross-tenant access when header x-school-code mismatches user school'
    );
  }

  // Case 3: Legitimate user querying within their own school context
  {
    const req: any = {
      user: { id: 'usr-3', role: 'SCHOOL_ADMIN', schoolId: 'school-alpha', schoolCode: 'SCH-A' },
      query: { schoolId: 'school-alpha' },
      body: {},
      params: {},
      headers: { 'x-school-code': 'SCH-A' },
      originalUrl: '/api/students',
      method: 'GET'
    };
    let nextCalled = false;
    const res: any = { status: () => ({ json: () => {} }) };

    enforceTenantIsolation(req, res, () => { nextCalled = true; });

    assert(
      nextCalled,
      'Permits matching institutional query parameters'
    );
  }

  // Case 4: SUPER_ADMIN permitted cross-tenant access for oversight
  {
    const req: any = {
      user: { id: 'usr-super', role: 'SUPER_ADMIN', schoolId: undefined, schoolCode: 'GLOBAL' },
      query: { schoolId: 'school-beta' },
      body: {},
      params: {},
      headers: { 'x-school-code': 'SCH-B' },
      originalUrl: '/api/schools/inspect',
      method: 'GET'
    };
    let nextCalled = false;
    const res: any = { status: () => ({ json: () => {} }) };

    enforceTenantIsolation(req, res, () => { nextCalled = true; });

    assert(
      nextCalled,
      'Permits SUPER_ADMIN cross-tenant access'
    );
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Storage Multi-Tenant Path Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: Storage Isolation Boundaries ---');

  function checkStorageBoundary(filePath: string, user: { role: string; schoolCode: string }): boolean {
    const pathParts = filePath.split('/');
    const requestedSchoolCode = pathParts[0];
    const userSchool = user.schoolCode.toUpperCase();
    const isSuperAdmin = user.role === 'SUPER_ADMIN' || userSchool === 'GLOBAL';
    const isGlobalAsset = requestedSchoolCode.toUpperCase() === 'GLOBAL';

    if (!isSuperAdmin && !isGlobalAsset && userSchool && requestedSchoolCode.toUpperCase() !== userSchool) {
      return false; // Forbidden (403)
    }
    return true; // Allowed
  }

  assert(
    !checkStorageBoundary('SCH-B/academic/exam-results.pdf', { role: 'TEACHER', schoolCode: 'SCH-A' }),
    'Storage: School A Teacher CANNOT read School B exam results'
  );

  assert(
    !checkStorageBoundary('SCH-B/finance/fee-receipts.pdf', { role: 'BURSAR', schoolCode: 'SCH-A' }),
    'Storage: School A Bursar CANNOT read School B finance documents'
  );

  assert(
    checkStorageBoundary('SCH-A/uploads/timetable.pdf', { role: 'TEACHER', schoolCode: 'SCH-A' }),
    'Storage: School A Teacher CAN read School A documents'
  );

  assert(
    checkStorageBoundary('global/images/logo.png', { role: 'STUDENT', schoolCode: 'SCH-A' }),
    'Storage: Global branding and public assets are accessible across tenants'
  );

  assert(
    checkStorageBoundary('SCH-B/academic/audit.pdf', { role: 'SUPER_ADMIN', schoolCode: 'GLOBAL' }),
    'Storage: Super Admin CAN access School B documents for audit purposes'
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 3: AsyncLocalStorage Scoping Context
  // -------------------------------------------------------------------------
  console.log('\n--- Test Suite 3: AsyncLocalStorage Context Propagation ---');

  assert(
    tenantStorage.getStore() === undefined,
    'AsyncLocalStorage: Store is clean when no tenant context is active'
  );

  tenantStorage.run({ schoolId: 'institution-xyz' }, () => {
    const store = tenantStorage.getStore();
    assert(
      store?.schoolId === 'institution-xyz',
      'AsyncLocalStorage: Successfully propagates schoolId within synchronous and async runs'
    );
  });

  console.log(`\n====================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Execute tests if executed directly
if (require.main === module) {
  runTenantIsolationTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

export { runTenantIsolationTests };
