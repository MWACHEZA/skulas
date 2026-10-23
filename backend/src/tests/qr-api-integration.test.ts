import prisma from '../lib/prisma';
import { QrCryptoService } from '../lib/qr-crypto';

async function runApiIntegrationTests() {
  console.log('--- Running QR API & Database Integration Tests ---');

  // Find a test school
  const school = await prisma.school.findFirst({
    include: { schoolSetting: true }
  });

  if (!school) {
    console.error('No school found in DB for test');
    process.exit(1);
  }

  console.log(`Testing with School: ${school.name} (${school.code})`);

  // Ensure active tenant key exists
  const activeKey = await QrCryptoService.getOrCreateActiveKey(school.id, school.code);
  console.log(`Active Key ID: ${activeKey.keyId}, Algorithm: ${activeKey.algorithm}`);

  // Find or create test student
  let student = await prisma.student.findFirst({
    where: { schoolId: school.id }
  });

  if (!student) {
    student = await prisma.student.create({
      data: {
        schoolId: school.id,
        studentId: 'TEST-STU-001',
        name: 'Tinashe Moyo'
      }
    });
  }

  console.log(`Testing with Student: ${student.name} (${student.studentId || student.id})`);

  // 1. Generate Gate QR code
  const gateQrPayload = QrCryptoService.sign(
    {
      type: 'GATE',
      schoolCode: school.code,
      entityId: student.studentId || student.id,
      keyId: activeKey.keyId
    },
    activeKey.privateKey,
    activeKey.algorithm
  );

  console.log(`Generated Gate QR Payload: ${gateQrPayload}`);

  // Parse and verify signature
  const parsed = QrCryptoService.parsePayload(gateQrPayload);
  const sigOk = QrCryptoService.verifySignatureWithKey(parsed, activeKey.publicKey, activeKey.algorithm);
  if (!sigOk) throw new Error('Signature verification failed on newly signed payload');
  console.log('✓ Signature verified with tenant public key');

  // 2. Test ScanLog recording
  const scanLog = await prisma.scanLog.create({
    data: {
      tenantId: school.id,
      type: 'GATE',
      entityId: student.id,
      result: 'VALID',
      reason: 'Gate entry test',
      deviceId: 'TEST-SUITE-01'
    }
  });

  console.log(`✓ ScanLog audit entry created: ID ${scanLog.id}`);

  // Verify ScanLog can be queried
  const retrievedLog = await prisma.scanLog.findUnique({
    where: { id: scanLog.id }
  });

  if (!retrievedLog || retrievedLog.result !== 'VALID') {
    throw new Error('Failed to retrieve ScanLog');
  }
  console.log('✓ ScanLog correctly retrieved from database');

  // 3. Test Fees QR
  const feesPayload = QrCryptoService.sign(
    {
      type: 'FEES',
      schoolCode: school.code,
      entityId: student.studentId || student.id,
      extra: '120.00_USD',
      keyId: activeKey.keyId
    },
    activeKey.privateKey,
    activeKey.algorithm
  );

  const parsedFees = QrCryptoService.parsePayload(feesPayload);
  if (parsedFees.type !== 'FEES' || parsedFees.extra !== '120.00_USD') {
    throw new Error('Fees payload parsing mismatch');
  }
  console.log('✓ Fees QR code payload with extra amount verified');

  // 4. Test Library QR
  const libPayload = QrCryptoService.sign(
    {
      type: 'LIB',
      schoolCode: school.code,
      entityId: student.studentId || student.id,
      extra: 'BK-9910',
      keyId: activeKey.keyId
    },
    activeKey.privateKey,
    activeKey.algorithm
  );

  const parsedLib = QrCryptoService.parsePayload(libPayload);
  if (parsedLib.type !== 'LIB' || parsedLib.extra !== 'BK-9910') {
    throw new Error('Library payload parsing mismatch');
  }
  console.log('✓ Library QR code payload with book ID verified');

  // Clean up test log
  await prisma.scanLog.delete({ where: { id: scanLog.id } });
  console.log('✓ Test cleanup completed');

  console.log('\nAll Integration Tests Passed Successfully!');
}

runApiIntegrationTests()
  .catch((e) => {
    console.error('Integration test failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
