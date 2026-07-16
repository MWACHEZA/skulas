const { PrismaClient } = require('../src/generated/client');
const http = require('http');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const PORT = 5000;

// Helper to make POST/PUT requests
function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(body || {});
    const reqHeaders = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataString),
      ...headers
    };

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: reqHeaders
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING SUPPLIER SYNC & COMPLIANCE TESTS ---');
  let testUserEmail = `supplier_test_${Math.floor(Math.random() * 100000)}@example.com`;
  let originalAdminPasswordHash = '';
  let adminUser = null;

  try {
    // 1. Find a school code to use
    const school = await prisma.school.findFirst({
      select: { code: true, id: true }
    });
    if (!school) {
      console.error('No schools found in the database. Please seed first.');
      return;
    }
    console.log(`Using school code: ${school.code}`);

    // 2. Perform public registration
    console.log('\nStep 1: Registering new supplier via public API...');
    const registerPayload = {
      name: 'Jane Doe Representative',
      email: testUserEmail,
      password: 'Password123!',
      phone: '263770000000',
      schoolCode: school.code,
      role: 'SUPPLIER',
      metadata: {
        companyName: 'Starlight Wholesale Goods',
        contactName: 'Jane Doe Representative',
        taxNumber: 'BP-TAX-ST-0001',
        taxExpiry: '2027-12-31',
        prazNo: 'PRAZ-REG-ST-0001',
        prazExpiry: '2027-12-31',
        address: '77 Starlight Ave, Harare',
        category: 'General Services',
        specialization: 'Stationery and Cleaning Supplies'
      }
    };

    const registerResult = await request('POST', '/api/auth/register-user', registerPayload);
    if (registerResult.status !== 200) {
      console.error('Registration failed:', registerResult);
      return;
    }
    console.log('Registration request success. User ID:', registerResult.body.userId);

    // 3. Verify database state
    console.log('\nStep 2: Checking database states for registered supplier...');
    const userInDb = await prisma.user.findUnique({
      where: { email: testUserEmail },
      include: { supplier: true }
    });

    if (!userInDb) {
      console.error('FAIL: User was not created in the database.');
      return;
    }
    console.log('PASS: User created successfully.');
    console.log(`User.name: "${userInDb.name}" (Expected: "Jane Doe Representative")`);

    const supplierInDb = userInDb.supplier;
    if (!supplierInDb) {
      console.error('FAIL: Separate Supplier record was not created in database.');
      return;
    }
    console.log('PASS: Separate Supplier record created successfully.');
    console.log(`Supplier.companyName: "${supplierInDb.companyName}" (Expected: "Starlight Wholesale Goods")`);
    console.log(`Supplier.contactName: "${supplierInDb.contactName}" (Expected: "Jane Doe Representative")`);
    console.log(`Supplier.taxClearance: "${supplierInDb.taxClearance}" (Expected: "BP-TAX-ST-0001")`);
    console.log(`Supplier.prazCert: "${supplierInDb.prazCert}" (Expected: "PRAZ-REG-ST-0001")`);
    console.log(`Supplier.phone: "${supplierInDb.phone}" (Expected: "263770000000")`);
    console.log(`Supplier.address: "${supplierInDb.address}" (Expected: "77 Starlight Ave, Harare")`);

    // Verify fields match
    const regSuccess = (
      userInDb.name === 'Jane Doe Representative' &&
      supplierInDb.companyName === 'Starlight Wholesale Goods' &&
      supplierInDb.taxClearance === 'BP-TAX-ST-0001' &&
      supplierInDb.prazCert === 'PRAZ-REG-ST-0001'
    );
    if (regSuccess) {
      console.log('SUCCESS: Public registration mappings verified perfectly.');
    } else {
      console.error('FAIL: Registration mapping mismatch.');
      return;
    }

    // 4. Authenticate as Admin to verify Edit Sync
    console.log('\nStep 3: Finding admin user and setting temporary password...');
    adminUser = await prisma.user.findFirst({
      where: { role: 'SCHOOL_ADMIN', schoolId: school.id }
    });
    if (!adminUser) {
      console.error('FAIL: No SCHOOL_ADMIN found for the school.');
      return;
    }
    console.log(`Found admin email: ${adminUser.email}`);

    originalAdminPasswordHash = adminUser.password;
    const tempPasswordHash = await bcrypt.hash('TestAdminPassword123!', 10);
    
    // Temporarily update password
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: tempPasswordHash }
    });
    console.log('Updated admin password hash to temporary value.');

    const loginResult = await request('POST', '/api/auth/login', {
      email: adminUser.email,
      password: 'TestAdminPassword123!',
      schoolCode: school.code
    });

    if (loginResult.status !== 200) {
      console.error('FAIL: Admin login failed even with temporary password hash:', loginResult);
      return;
    }
    const token = loginResult.body.token;
    console.log('PASS: Logged in as admin successfully.');

    // 5. Update user via PUT /api/users/:id
    console.log('\nStep 4: Editing supplier profile via admin API...');
    const updatePayload = {
      name: 'Jane Smith Updated Name',
      email: testUserEmail,
      phone: '263779999999',
      role: 'SUPPLIER',
      companyName: 'Starlight Wholesale Goods Ltd',
      taxNumber: 'BP-TAX-UPDATED-999',
      prazNo: 'PRAZ-REG-UPDATED-999',
      address: '99 Updated Avenue, Harare'
    };

    const updateResult = await request('PUT', `/api/users/${userInDb.id}`, updatePayload, {
      'Authorization': `Bearer ${token}`
    });

    if (updateResult.status !== 200) {
      console.error('FAIL: Admin user edit request failed:', updateResult);
      return;
    }
    console.log('PASS: Admin user edit request success.');

    // 6. Verify Supplier record synced
    console.log('\nStep 5: Verifying updated database state for Supplier sync...');
    const updatedUserInDb = await prisma.user.findUnique({
      where: { id: userInDb.id },
      include: { supplier: true }
    });

    const updatedSupplier = updatedUserInDb?.supplier;
    if (!updatedSupplier) {
      console.error('FAIL: Supplier record is missing after update.');
      return;
    }

    console.log(`User.name (Updated): "${updatedUserInDb.name}" (Expected: "Jane Smith Updated Name")`);
    console.log(`Supplier.companyName (Updated): "${updatedSupplier.companyName}" (Expected: "Starlight Wholesale Goods Ltd")`);
    console.log(`Supplier.contactName (Updated): "${updatedSupplier.contactName}" (Expected: "Jane Smith Updated Name")`);
    console.log(`Supplier.taxClearance (Updated): "${updatedSupplier.taxClearance}" (Expected: "BP-TAX-UPDATED-999")`);
    console.log(`Supplier.prazCert (Updated): "${updatedSupplier.prazCert}" (Expected: "PRAZ-REG-UPDATED-999")`);
    console.log(`Supplier.phone (Updated): "${updatedSupplier.phone}" (Expected: "263779999999")`);
    console.log(`Supplier.address (Updated): "${updatedSupplier.address}" (Expected: "99 Updated Avenue, Harare")`);

    const syncSuccess = (
      updatedUserInDb.name === 'Jane Smith Updated Name' &&
      updatedSupplier.companyName === 'Starlight Wholesale Goods Ltd' &&
      updatedSupplier.contactName === 'Jane Smith Updated Name' &&
      updatedSupplier.taxClearance === 'BP-TAX-UPDATED-999' &&
      updatedSupplier.prazCert === 'PRAZ-REG-UPDATED-999' &&
      updatedSupplier.phone === '263779999999' &&
      updatedSupplier.address === '99 Updated Avenue, Harare'
    );

    if (syncSuccess) {
      console.log('\n--- SUCCESS: ALL SUPPLIER SYNC & COMPLIANCE TESTS PASSED SUCCESSFULLY! ---');
    } else {
      console.error('\n--- FAIL: Synchronization database mismatch after edit. ---');
    }

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    // Restore original admin password hash
    if (adminUser && originalAdminPasswordHash) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { password: originalAdminPasswordHash }
      });
      console.log('\nRestored original admin password hash.');
    }
    await prisma.$disconnect();
  }
}

runTests();
