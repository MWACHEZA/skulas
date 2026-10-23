import assert from 'assert';
import crypto from 'crypto';
import { QrCryptoService, QrPayloadOptions, VALID_QR_TYPES } from '../lib/qr-crypto';

async function runTests() {
  console.log('--- Starting QR Cryptographic & Verification Unit Tests ---\n');

  // Generate test Ed25519 keypair for School A
  const schoolAKeys = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  // Generate test Ed25519 keypair for School B
  const schoolBKeys = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const hmacSecretA = 'school-a-super-secret-hmac-key-2026';
  const hmacSecretB = 'school-b-super-secret-hmac-key-2026';

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
    }
  }

  async function testAsync(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
    }
  }

  // TEST 1: Valid Gate QR Code Generation & Verification (Ed25519)
  test('Valid Gate QR code signing and verification (Ed25519)', () => {
    const payload = QrCryptoService.sign(
      {
        type: 'GATE',
        schoolCode: 'SCH001',
        entityId: 'STU-00123',
        keyId: 'k1'
      },
      schoolAKeys.privateKey,
      'ED25519'
    );

    assert(payload.startsWith('v1:GATE:SCH001:STU-00123:KID=k1:'));
    const parsed = QrCryptoService.parsePayload(payload);
    assert.strictEqual(parsed.type, 'GATE');
    assert.strictEqual(parsed.schoolCode, 'SCH001');
    assert.strictEqual(parsed.entityId, 'STU-00123');
    assert.strictEqual(parsed.keyId, 'k1');
    assert.strictEqual(parsed.isExpired, false);

    const valid = QrCryptoService.verifySignatureWithKey(parsed, schoolAKeys.publicKey, 'ED25519');
    assert.strictEqual(valid, true, 'Signature should be strictly valid');
  });

  // TEST 2: Valid Fees QR with amount and currency (HMAC-SHA256)
  test('Valid Fees QR code signing and verification (HMAC-SHA256)', () => {
    const payload = QrCryptoService.sign(
      {
        type: 'FEES',
        schoolCode: 'SCH001',
        entityId: 'INV-9988',
        extra: '150.00_USD',
        expiresAt: '20291231'
      },
      hmacSecretA,
      'HMAC_SHA256'
    );

    assert(payload.startsWith('v1:FEES:SCH001:INV-9988:150.00_USD:EXP=20291231:'));
    const parsed = QrCryptoService.parsePayload(payload);
    assert.strictEqual(parsed.type, 'FEES');
    assert.strictEqual(parsed.extra, '150.00_USD');
    assert.strictEqual(parsed.expiresAt, '20291231');
    assert.strictEqual(parsed.isExpired, false);

    const valid = QrCryptoService.verifySignatureWithKey(parsed, hmacSecretA, 'HMAC_SHA256');
    assert.strictEqual(valid, true);
  });

  // TEST 3: Tampered Payload Detection
  test('Tampered payload detection (student ID or amount altered)', () => {
    const original = QrCryptoService.sign(
      {
        type: 'GATE',
        schoolCode: 'SCH001',
        entityId: 'STU-GENUINE',
        keyId: 'k1'
      },
      schoolAKeys.privateKey,
      'ED25519'
    );

    // Tamper the entity ID to a different student
    const tamperedPayload = original.replace('STU-GENUINE', 'STU-IMPOSTOR');
    const parsedTampered = QrCryptoService.parsePayload(tamperedPayload);

    const valid = QrCryptoService.verifySignatureWithKey(parsedTampered, schoolAKeys.publicKey, 'ED25519');
    assert.strictEqual(valid, false, 'Tampered payload must fail cryptographic verification');
  });

  // TEST 4: Wrong Tenant Isolation (School A QR cannot be verified by School B key)
  test('Strict tenant isolation: School A QR rejected by School B key', () => {
    const schoolAPayload = QrCryptoService.sign(
      {
        type: 'GATE',
        schoolCode: 'SCH-A',
        entityId: 'STU-001'
      },
      schoolAKeys.privateKey,
      'ED25519'
    );

    const parsed = QrCryptoService.parsePayload(schoolAPayload);

    // School B attempts to verify with School B's public key
    const validWithB = QrCryptoService.verifySignatureWithKey(parsed, schoolBKeys.publicKey, 'ED25519');
    assert.strictEqual(validWithB, false, 'School B must not validate School A token');

    // Also test HMAC isolation
    const hmacPayloadA = QrCryptoService.sign(
      {
        type: 'GATE',
        schoolCode: 'SCH-A',
        entityId: 'STU-001'
      },
      hmacSecretA,
      'HMAC_SHA256'
    );
    const parsedHmac = QrCryptoService.parsePayload(hmacPayloadA);
    const validHmacB = QrCryptoService.verifySignatureWithKey(parsedHmac, hmacSecretB, 'HMAC_SHA256');
    assert.strictEqual(validHmacB, false, 'HMAC secret B must not validate secret A signature');
  });

  // TEST 5: Expired QR Code
  test('Expired QR code detection with EXP=yyyymmdd', () => {
    const expiredPayload = QrCryptoService.sign(
      {
        type: 'GATE',
        schoolCode: 'SCH001',
        entityId: 'STU-001',
        expiresAt: '20200101' // Past date
      },
      schoolAKeys.privateKey,
      'ED25519'
    );

    const parsed = QrCryptoService.parsePayload(expiredPayload);
    assert.strictEqual(parsed.isExpired, true, 'Expired token must have isExpired = true');

    const futurePayload = QrCryptoService.sign(
      {
        type: 'GATE',
        schoolCode: 'SCH001',
        entityId: 'STU-001',
        expiresAt: '20991231' // Far future date
      },
      schoolAKeys.privateKey,
      'ED25519'
    );
    const parsedFuture = QrCryptoService.parsePayload(futurePayload);
    assert.strictEqual(parsedFuture.isExpired, false, 'Future token must not be expired');
  });

  // TEST 6: Malformed Input Rejection
  test('Strict rejection of malformed inputs', () => {
    const malformedInputs = [
      '',
      'not-a-qr',
      'v2:GATE:SCH001:STU:sig', // Wrong version
      'v1:UNKNOWN:SCH001:STU:sig', // Unknown type
      'v1:GATE', // Truncated
      'v1:GATE:SCH001:STU-001', // Missing signature delimiter
      'v1:GATE:SCH001:STU-001:short', // Signature too short
      'v1:GATE:SCH001:STU-001:EXP=invalidDate:sig1234567890' // Bad date format
    ];

    for (const input of malformedInputs) {
      assert.throws(() => {
        QrCryptoService.parsePayload(input);
      }, `Expected input to throw: "${input}"`);
    }
  });

  // TEST 7: QR Types Handling (GATE, FEES, LIB, ATT)
  test('All 4 QR types are supported and distinct', () => {
    for (const type of VALID_QR_TYPES) {
      const payload = QrCryptoService.sign(
        {
          type,
          schoolCode: 'SCH001',
          entityId: 'ID-1234',
          extra: type === 'LIB' ? 'BK-8899' : type === 'FEES' ? '200_USD' : undefined
        },
        schoolAKeys.privateKey,
        'ED25519'
      );

      const parsed = QrCryptoService.parsePayload(payload);
      assert.strictEqual(parsed.type, type);
      if (type === 'LIB') assert.strictEqual(parsed.extra, 'BK-8899');
      if (type === 'FEES') assert.strictEqual(parsed.extra, '200_USD');
    }

    assert.throws(() => {
      QrCryptoService.buildDataToSign({
        type: 'INVALID_TYPE' as any,
        schoolCode: 'SCH001',
        entityId: 'ID-123'
      });
    });
  });

  // TEST 8: Key Rotation & Grace Period with KID
  test('Key rotation with KID enables older keys to validate older cards', () => {
    // Generate old key k1 and new key k2
    const key1 = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    const key2 = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // Card issued under k1
    const oldCard = QrCryptoService.sign(
      {
        type: 'GATE',
        schoolCode: 'SCH001',
        entityId: 'STU-SENIOR',
        keyId: 'k1'
      },
      key1.privateKey,
      'ED25519'
    );

    // Card issued under k2
    const newCard = QrCryptoService.sign(
      {
        type: 'GATE',
        schoolCode: 'SCH001',
        entityId: 'STU-FRESHMAN',
        keyId: 'k2'
      },
      key2.privateKey,
      'ED25519'
    );

    const parsedOld = QrCryptoService.parsePayload(oldCard);
    const parsedNew = QrCryptoService.parsePayload(newCard);

    assert.strictEqual(parsedOld.keyId, 'k1');
    assert.strictEqual(parsedNew.keyId, 'k2');

    // Verification against respective keys
    assert.strictEqual(QrCryptoService.verifySignatureWithKey(parsedOld, key1.publicKey, 'ED25519'), true);
    assert.strictEqual(QrCryptoService.verifySignatureWithKey(parsedOld, key2.publicKey, 'ED25519'), false);
    assert.strictEqual(QrCryptoService.verifySignatureWithKey(parsedNew, key2.publicKey, 'ED25519'), true);
  });

  // TEST 9: Local QR Code Image Generation (PNG and SVG with specific sizes)
  await testAsync('Local QR code image generation (PNG for cards, SVG for slips)', async () => {
    const payload = 'v1:GATE:SCH001:STU-00123:sig1234567890123456';

    // PNG Gate size 20mm
    const pngResult = await QrCryptoService.renderQrCode(payload, {
      format: 'png',
      sizeMm: 20
    });
    assert(Buffer.isBuffer(pngResult.data), 'PNG output should be a Buffer');
    assert.strictEqual(pngResult.mimeType, 'image/png');
    assert(pngResult.data.length > 50, 'PNG buffer should contain valid image bytes');

    // SVG Fees size 15mm
    const svgResult = await QrCryptoService.renderQrCode(payload, {
      format: 'svg',
      sizeMm: 15
    });
    assert(typeof svgResult.data === 'string', 'SVG output should be a string');
    assert.strictEqual(svgResult.mimeType, 'image/svg+xml');
    assert(svgResult.data.includes('<svg'), 'SVG output should contain <svg tag');

    // SVG Library size 10mm
    const libSvg = await QrCryptoService.renderQrCode(payload, {
      format: 'svg',
      sizeMm: 10
    });
    assert(typeof libSvg.data === 'string');
    assert(libSvg.data.includes('<svg'));
  });

  console.log(`\nResults: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
