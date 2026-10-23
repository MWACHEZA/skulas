import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { QrCryptoService, QrType, VALID_QR_TYPES } from '../lib/qr-crypto';
import { BursarService } from '../services/bursar.service';

const router = Router();

/**
 * Helper to resolve user's tenant school details
 */
async function getTenantSchool(req: AuthRequest) {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    throw new Error('User has no school affiliation');
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      schoolSetting: true
    }
  });

  if (!school) {
    throw new Error('Tenant school not found');
  }

  return school;
}

/**
 * POST /api/verify
 * Unified verification service for all 4 QR types (GATE, FEES, LIB, ATT).
 * 
 * Enforces:
 * 1. Strict parsing and malformed input rejection.
 * 2. Cryptographic signature check (timing-safe Ed25519 or HMAC-SHA256).
 * 3. Strict tenant isolation (rejects QR belonging to different school code).
 * 4. Expiration date check (EXP=yyyymmdd).
 * 5. Tenant DB entity validation (student belongs to tenant, active, not expelled).
 * 6. Gate fee arrears policy check.
 * 7. Anti-copy / rapid duplicate rescan detection.
 * 8. Audit trail in scan_logs table.
 */
router.post('/verify', requireAuth, async (req: AuthRequest, res: Response) => {
  const scannedAt = new Date();
  const { payload, deviceId, direction: requestedDirection } = req.body;
  const scannerUserId = req.user?.id;

  if (!payload || typeof payload !== 'string') {
    return res.status(400).json({
      valid: false,
      reason: 'Missing or invalid QR payload string',
      flags: ['MALFORMED_INPUT']
    });
  }

  let school;
  try {
    school = await getTenantSchool(req);
  } catch (err: any) {
    return res.status(403).json({
      valid: false,
      reason: err.message,
      flags: ['UNAUTHORIZED_TENANT']
    });
  }

  let parsed;
  try {
    parsed = QrCryptoService.parsePayload(payload);
  } catch (parseErr: any) {
    // Log malformed scan attempt
    await prisma.scanLog.create({
      data: {
        tenantId: school.id,
        type: 'UNKNOWN',
        entityId: 'UNKNOWN',
        scannerUserId,
        result: 'INVALID',
        reason: `Malformed QR: ${parseErr.message}`,
        scannedAt,
        deviceId: deviceId || 'SCANNER-01',
        metadata: { rawPayload: payload.slice(0, 100) }
      }
    }).catch(() => {});

    return res.status(400).json({
      valid: false,
      reason: `Malformed QR payload: ${parseErr.message}`,
      flags: ['MALFORMED_PAYLOAD']
    });
  }

  // Strict Tenant Isolation: School Code in payload MUST match current tenant school code
  if (parsed.schoolCode.toUpperCase() !== school.code.toUpperCase()) {
    await prisma.scanLog.create({
      data: {
        tenantId: school.id,
        type: parsed.type,
        entityId: parsed.entityId,
        scannerUserId,
        result: 'INVALID',
        reason: `Tenant mismatch: QR is for ${parsed.schoolCode}, scanner is ${school.code}`,
        scannedAt,
        deviceId: deviceId || 'SCANNER-01',
        metadata: { targetSchool: parsed.schoolCode, scannerSchool: school.code }
      }
    }).catch(() => {});

    return res.status(200).json({
      valid: false,
      reason: `Tenant mismatch: This QR code belongs to school "${parsed.schoolCode}" and is not valid at "${school.code}".`,
      flags: ['TENANT_MISMATCH', 'CROSS_SCHOOL_FORBIDDEN']
    });
  }

  // Cryptographic Signature Verification with Key Rotation (KID support)
  const tenantKeys = await QrCryptoService.findTenantKeys(school.id, parsed.keyId);
  if (tenantKeys.length === 0) {
    return res.status(200).json({
      valid: false,
      reason: 'No matching cryptographic verification key found for this school.',
      flags: ['KEY_NOT_FOUND']
    });
  }

  let signatureValid = false;
  for (const key of tenantKeys) {
    const keyData = key.algorithm === 'ED25519' ? key.publicKey : key.encryptedPrivateKey;
    if (QrCryptoService.verifySignatureWithKey(parsed, keyData, key.algorithm as any)) {
      signatureValid = true;
      break;
    }
  }

  if (!signatureValid) {
    await prisma.scanLog.create({
      data: {
        tenantId: school.id,
        type: parsed.type,
        entityId: parsed.entityId,
        scannerUserId,
        result: 'INVALID',
        reason: 'Cryptographic signature verification failed (tampered or counterfeit payload)',
        scannedAt,
        deviceId: deviceId || 'SCANNER-01',
        metadata: { keyId: parsed.keyId }
      }
    }).catch(() => {});

    return res.status(200).json({
      valid: false,
      reason: 'Invalid signature: This QR code has been altered or is counterfeit.',
      flags: ['TAMPERED_SIGNATURE']
    });
  }

  // Expiration Check
  if (parsed.isExpired) {
    await prisma.scanLog.create({
      data: {
        tenantId: school.id,
        type: parsed.type,
        entityId: parsed.entityId,
        scannerUserId,
        result: 'INVALID',
        reason: `QR code expired on ${parsed.expiresAt}`,
        scannedAt,
        deviceId: deviceId || 'SCANNER-01'
      }
    }).catch(() => {});

    return res.status(200).json({
      valid: false,
      reason: `QR code expired on ${parsed.expiresAt}. A renewal card or slip is required.`,
      flags: ['EXPIRED']
    });
  }

  // Look up student in tenant database
  const student = await prisma.student.findFirst({
    where: {
      schoolId: school.id,
      OR: [
        { id: parsed.entityId },
        { studentId: parsed.entityId }
      ]
    },
    include: {
      class: true,
      user: true,
      bursaries: { where: { status: 'approved' } },
      parents: { include: { parent: { include: { user: true } } } }
    }
  });

  if (!student) {
    await prisma.scanLog.create({
      data: {
        tenantId: school.id,
        type: parsed.type,
        entityId: parsed.entityId,
        scannerUserId,
        result: 'INVALID',
        reason: `Student ${parsed.entityId} not found in school records`,
        scannedAt,
        deviceId: deviceId || 'SCANNER-01'
      }
    }).catch(() => {});

    return res.status(200).json({
      valid: false,
      reason: `Student "${parsed.entityId}" is not enrolled in ${school.name}.`,
      flags: ['STUDENT_NOT_FOUND']
    });
  }

  // Student Enrollment & Discipline Status Checks
  const studentStatus = (student as any).status || 'ACTIVE';
  const isExpelled = studentStatus.toUpperCase() === 'EXPELLED';
  const isSuspended = studentStatus.toUpperCase() === 'SUSPENDED';
  const isInactive = studentStatus.toUpperCase() === 'INACTIVE' || studentStatus.toUpperCase() === 'WITHDRAWN';

  if (isExpelled || isSuspended || isInactive) {
    const reason = `Student is currently marked as ${studentStatus.toUpperCase()}. Entry is prohibited.`;
    await prisma.scanLog.create({
      data: {
        tenantId: school.id,
        type: parsed.type,
        entityId: student.id,
        scannerUserId,
        result: 'DENIED',
        reason,
        scannedAt,
        deviceId: deviceId || 'SCANNER-01',
        metadata: { studentStatus }
      }
    }).catch(() => {});

    return res.status(200).json({
      valid: false,
      reason,
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        photoUrl: student.user?.avatar || (student as any).avatar || null,
        class: student.class?.name || 'Unassigned'
      },
      flags: ['ENROLLMENT_DISCIPLINE_BLOCKED', studentStatus.toUpperCase()]
    });
  }

  // Anti-Copy & Rapid Rescan Mitigation:
  // Check for duplicate scans of the same student within the last 60 seconds
  const sixtySecondsAgo = new Date(scannedAt.getTime() - 60 * 1000);
  const recentDuplicate = await prisma.scanLog.findFirst({
    where: {
      tenantId: school.id,
      entityId: student.id,
      type: parsed.type,
      scannedAt: { gte: sixtySecondsAgo }
    },
    orderBy: { scannedAt: 'desc' }
  });

  const flags: string[] = [];
  if (recentDuplicate) {
    flags.push('DUPLICATE_SCAN_SUSPICIOUS');
  }

  // Fetch financial balance info
  const balanceInfo = await BursarService.getStudentBalance(school.id, student.id);
  const balance = balanceInfo.balance;

  // Resolve gate threshold from school settings
  const gateFeeThreshold = school.schoolSetting?.gateFeeThreshold ?? 20.0;

  // Handle specific use cases
  if (parsed.type === 'GATE') {
    // Determine direction
    const todayStart = new Date(scannedAt);
    todayStart.setHours(0, 0, 0, 0);

    const todayGateLogs = await prisma.gateLog.findMany({
      where: {
        schoolId: school.id,
        studentId: student.id,
        scannedAt: { gte: todayStart }
      },
      orderBy: { scannedAt: 'desc' }
    });

    const lastLog = todayGateLogs[0];
    const direction = requestedDirection || (lastLog && lastLog.direction === 'IN' ? 'OUT' : 'IN');

    // Gate Fee Policy Compliance Check
    // If balance > threshold and direction is 'IN', check if there is an active compliant payment plan
    let feeAllowed = true;
    let feeReason = 'Fees compliant.';

    if (balance > gateFeeThreshold && direction === 'IN') {
      // Check active payment plan
      const plan = await prisma.paymentPlan.findFirst({
        where: {
          studentId: student.id,
          schoolId: school.id,
          status: 'ACTIVE'
        }
      });

      if (!plan) {
        feeAllowed = false;
        feeReason = `Fee arrears of $${balance.toFixed(2)} exceeds allowed threshold ($${gateFeeThreshold.toFixed(2)}).`;
        flags.push('FEE_ARREARS_EXCEEDED');
      } else {
        flags.push('ON_PAYMENT_PLAN');
      }
    }

    if (!feeAllowed) {
      await prisma.scanLog.create({
        data: {
          tenantId: school.id,
          type: 'GATE',
          entityId: student.id,
          scannerUserId,
          result: 'DENIED',
          reason: feeReason,
          scannedAt,
          deviceId: deviceId || 'SCANNER-01',
          metadata: { balance, gateFeeThreshold, direction, flags }
        }
      });

      await prisma.gateLog.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          scannedByGuardId: scannerUserId,
          deviceId: deviceId || 'SCANNER-01',
          direction,
          entryStatus: 'denied',
          feeStatusSnapshot: 'FEES_OWING',
          balanceAtScan: balance,
          denialReason: feeReason
        }
      }).catch(() => {});

      return res.status(200).json({
        valid: false,
        reason: feeReason,
        student: {
          id: student.id,
          studentId: student.studentId,
          name: student.name,
          photoUrl: student.user?.avatar || (student as any).avatar || null,
          class: student.class?.name || 'Unassigned',
          balance
        },
        flags
      });
    }

    // Success for GATE
    const scanLog = await prisma.scanLog.create({
      data: {
        tenantId: school.id,
        type: 'GATE',
        entityId: student.id,
        scannerUserId,
        result: flags.includes('DUPLICATE_SCAN_SUSPICIOUS') ? 'FLAGGED' : 'VALID',
        reason: `Gate entry granted (${direction})`,
        scannedAt,
        deviceId: deviceId || 'SCANNER-01',
        metadata: { direction, balance, flags }
      }
    });

    await prisma.gateLog.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        scannedByGuardId: scannerUserId,
        deviceId: deviceId || 'SCANNER-01',
        direction,
        entryStatus: 'allowed',
        feeStatusSnapshot: balance <= 0 ? 'PAID' : 'ON_PLAN',
        balanceAtScan: balance
      }
    }).catch(() => {});

    return res.status(200).json({
      valid: true,
      reason: `Gate access granted (${direction}).`,
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        photoUrl: student.user?.avatar || (student as any).avatar || null,
        class: student.class?.name || 'Unassigned',
        balance
      },
      flags,
      auditLogId: scanLog.id
    });
  }

  if (parsed.type === 'ATT') {
    // Attendance scan: record attendance for today
    const todayStart = new Date(scannedAt);
    todayStart.setHours(0, 0, 0, 0);

    let attRecord = await prisma.attendance.findFirst({
      where: {
        schoolId: school.id,
        studentId: student.id,
        date: todayStart
      }
    });

    if (!attRecord) {
      attRecord = await prisma.attendance.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          classId: student.classId || '',
          date: todayStart,
          status: 'PRESENT'
        }
      });
    }

    const scanLog = await prisma.scanLog.create({
      data: {
        tenantId: school.id,
        type: 'ATT',
        entityId: student.id,
        scannerUserId,
        result: 'VALID',
        reason: `Marked PRESENT for ${todayStart.toISOString().slice(0, 10)}`,
        scannedAt,
        deviceId: deviceId || 'ATT-SCANNER-01',
        metadata: { attendanceId: attRecord.id }
      }
    });

    return res.status(200).json({
      valid: true,
      reason: `Attendance recorded: Present for today.`,
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        photoUrl: student.user?.avatar || (student as any).avatar || null,
        class: student.class?.name || 'Unassigned',
        balance
      },
      flags,
      auditLogId: scanLog.id
    });
  }

  if (parsed.type === 'FEES') {
    // Payment slip QR carrying student ID and amount
    const extraSlip = parsed.extra || '0.00_USD';
    const scanLog = await prisma.scanLog.create({
      data: {
        tenantId: school.id,
        type: 'FEES',
        entityId: student.id,
        scannerUserId,
        result: 'VALID',
        reason: `Fees slip verified: ${extraSlip}`,
        scannedAt,
        deviceId: deviceId || 'BURSAR-01',
        metadata: { slipAmount: extraSlip, currentBalance: balance }
      }
    });

    return res.status(200).json({
      valid: true,
      reason: `Valid fee payment slip for ${extraSlip}.`,
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        photoUrl: student.user?.avatar || (student as any).avatar || null,
        class: student.class?.name || 'Unassigned',
        balance
      },
      flags,
      extra: extraSlip,
      auditLogId: scanLog.id
    });
  }

  if (parsed.type === 'LIB') {
    // Library book QR carrying bookId
    const bookId = parsed.extra;
    let book = null;
    if (bookId) {
      book = await prisma.book.findFirst({
        where: { schoolId: school.id, OR: [{ id: bookId }, { isbn: bookId }] }
      });
    }

    const scanLog = await prisma.scanLog.create({
      data: {
        tenantId: school.id,
        type: 'LIB',
        entityId: student.id,
        scannerUserId,
        result: 'VALID',
        reason: `Library ID validated for ${book ? book.title : 'book issue/return'}`,
        scannedAt,
        deviceId: deviceId || 'LIB-SCANNER-01',
        metadata: { bookId, bookTitle: book?.title }
      }
    });

    return res.status(200).json({
      valid: true,
      reason: `Library credential validated. ${book ? `Target: "${book.title}"` : ''}`,
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        photoUrl: student.user?.avatar || (student as any).avatar || null,
        class: student.class?.name || 'Unassigned',
        balance
      },
      book: book ? { id: book.id, title: book.title, author: book.author } : undefined,
      flags,
      auditLogId: scanLog.id
    });
  }

  return res.status(400).json({
    valid: false,
    reason: `Unhandled QR type: ${parsed.type}`,
    flags: ['UNKNOWN_TYPE']
  });
});

/**
 * POST /api/qr/generate
 * Generates signed QR codes for Gate, Fees, Library, or Attendance.
 * Generates local QR code image (PNG or SVG) using `qrcode` npm package.
 */
router.post('/generate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const school = await getTenantSchool(req);
    const { type, entityId, extra, expiresAt, format, sizeMm } = req.body;

    if (!type || !VALID_QR_TYPES.includes(type)) {
      return res.status(400).json({ error: `Valid type is required: ${VALID_QR_TYPES.join(', ')}` });
    }
    if (!entityId) {
      return res.status(400).json({ error: 'entityId (studentId / staffId) is required' });
    }

    // Get or create tenant key
    const activeKey = await QrCryptoService.getOrCreateActiveKey(school.id, school.code);

    const payload = QrCryptoService.sign(
      {
        type,
        schoolCode: school.code,
        entityId,
        extra,
        expiresAt,
        keyId: activeKey.keyId
      },
      activeKey.privateKey,
      activeKey.algorithm
    );

    // Default sizes in mm: Gate ID = 20mm, Fees = 15mm, Lib = 10mm
    const defaultSize = type === 'GATE' ? 20 : type === 'FEES' ? 15 : 10;
    const chosenSize = sizeMm || defaultSize;
    const chosenFormat = format === 'svg' ? 'svg' : 'png';

    const rendered = await QrCryptoService.renderQrCode(payload, {
      format: chosenFormat,
      sizeMm: chosenSize
    });

    let dataUrl = '';
    if (chosenFormat === 'svg') {
      dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(rendered.data as string)}`;
    } else {
      dataUrl = `data:image/png;base64,${(rendered.data as Buffer).toString('base64')}`;
    }

    res.json({
      success: true,
      payload,
      dataUrl,
      format: chosenFormat,
      sizeMm: chosenSize,
      keyId: activeKey.keyId,
      schoolCode: school.code
    });
  } catch (error: any) {
    console.error('Error generating QR:', error);
    res.status(500).json({ error: error.message || 'Failed to generate QR code' });
  }
});

/**
 * POST /api/qr/batch-generate
 * Generates batch QR codes for an entire class or all active students in a school.
 */
router.post('/batch-generate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const school = await getTenantSchool(req);
    const { classId, type = 'GATE', sizeMm = 20, format = 'png' } = req.body;

    const students = await prisma.student.findMany({
      where: {
        schoolId: school.id,
        ...(classId ? { classId } : {})
      },
      include: {
        class: true,
        user: true
      },
      orderBy: { name: 'asc' }
    });

    const activeKey = await QrCryptoService.getOrCreateActiveKey(school.id, school.code);

    const items = await Promise.all(
      students.map(async (st) => {
        const payload = QrCryptoService.sign(
          {
            type: type as QrType,
            schoolCode: school.code,
            entityId: st.studentId || st.id,
            keyId: activeKey.keyId
          },
          activeKey.privateKey,
          activeKey.algorithm
        );

        const rendered = await QrCryptoService.renderQrCode(payload, {
          format: format === 'svg' ? 'svg' : 'png',
          sizeMm
        });

        const dataUrl =
          format === 'svg'
            ? `data:image/svg+xml;utf8,${encodeURIComponent(rendered.data as string)}`
            : `data:image/png;base64,${(rendered.data as Buffer).toString('base64')}`;

        return {
          id: st.id,
          studentId: st.studentId,
          name: st.name,
          className: st.class?.name || 'Unassigned',
          avatar: st.user?.avatar || (st as any).avatar || null,
          payload,
          dataUrl
        };
      })
    );

    res.json({
      success: true,
      count: items.length,
      schoolCode: school.code,
      keyId: activeKey.keyId,
      items
    });
  } catch (error: any) {
    console.error('Error in batch QR generation:', error);
    res.status(500).json({ error: error.message || 'Failed to batch generate QR codes' });
  }
});

/**
 * GET /api/qr/manifest
 * Returns tenant verification public key & student roster metadata for offline PWA IndexedDB cache.
 */
router.get('/manifest', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const school = await getTenantSchool(req);
    const activeKey = await QrCryptoService.getOrCreateActiveKey(school.id, school.code);

    const students = await prisma.student.findMany({
      where: { schoolId: school.id },
      include: {
        class: true,
        user: true
      },
      take: 2000
    });

    // Compute balance for students
    const roster = await Promise.all(
      students.map(async (st) => {
        let balance = 0;
        try {
          const balInfo = await BursarService.getStudentBalance(school.id, st.id);
          balance = balInfo.balance;
        } catch {
          balance = 0;
        }

        return {
          id: st.id,
          studentId: st.studentId,
          name: st.name,
          className: st.class?.name || 'Unassigned',
          photoUrl: st.user?.avatar || (st as any).avatar || null,
          status: (st as any).status || 'ACTIVE',
          balance
        };
      })
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      tenant: {
        id: school.id,
        name: school.name,
        code: school.code,
        publicKey: activeKey.publicKey,
        algorithm: activeKey.algorithm,
        keyId: activeKey.keyId,
        gateFeeThreshold: school.schoolSetting?.gateFeeThreshold ?? 20.0
      },
      students: roster
    });
  } catch (error: any) {
    console.error('Error fetching offline manifest:', error);
    res.status(500).json({ error: error.message || 'Failed to build offline manifest' });
  }
});

/**
 * POST /api/qr/sync-scans
 * Idempotently synchronizes scan logs collected offline on scanner devices.
 */
router.post('/sync-scans', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const school = await getTenantSchool(req);
    const { scans } = req.body;

    if (!Array.isArray(scans) || scans.length === 0) {
      return res.json({ success: true, inserted: 0, skipped: 0 });
    }

    let inserted = 0;
    let skipped = 0;

    for (const scan of scans) {
      const scannedAt = scan.scannedAt ? new Date(scan.scannedAt) : new Date();

      // Check if this scan was already synced (idempotent deduplication by deviceId + entityId + scannedAt)
      const existing = await prisma.scanLog.findFirst({
        where: {
          tenantId: school.id,
          entityId: scan.entityId || scan.studentId || 'UNKNOWN',
          deviceId: scan.deviceId || 'OFFLINE-DEVICE',
          scannedAt: {
            gte: new Date(scannedAt.getTime() - 1000),
            lte: new Date(scannedAt.getTime() + 1000)
          }
        }
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.scanLog.create({
        data: {
          tenantId: school.id,
          type: scan.type || 'GATE',
          entityId: scan.entityId || scan.studentId || 'UNKNOWN',
          scannerUserId: req.user?.id || null,
          result: scan.result || (scan.valid ? 'VALID' : 'DENIED'),
          reason: scan.reason || 'Offline scan synced',
          scannedAt,
          deviceId: scan.deviceId || 'OFFLINE-DEVICE',
          syncedAt: new Date(),
          offline: true,
          metadata: scan.metadata || {}
        }
      });

      // Also create gate log if it was a gate scan
      if (scan.type === 'GATE' && scan.entityId) {
        await prisma.gateLog.create({
          data: {
            schoolId: school.id,
            studentId: scan.studentId || scan.entityId,
            scannedByGuardId: req.user?.id || null,
            deviceId: scan.deviceId || 'OFFLINE-DEVICE',
            direction: scan.direction || 'IN',
            entryStatus: scan.valid ? 'allowed' : 'denied',
            feeStatusSnapshot: scan.valid ? 'PAID' : 'DENIED',
            scannedAt,
            denialReason: scan.valid ? null : scan.reason
          }
        }).catch(() => {});
      }

      inserted++;
    }

    res.json({
      success: true,
      inserted,
      skipped,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error syncing offline scans:', error);
    res.status(500).json({ error: error.message || 'Failed to sync offline scans' });
  }
});

/**
 * POST /api/qr/rotate-keys
 * Admin endpoint to rotate tenant cryptographic keys with a grace period.
 */
router.post('/rotate-keys', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const school = await getTenantSchool(req);
    const graceDays = req.body.graceDays ? parseInt(req.body.graceDays, 10) : 30;

    const newKey = await QrCryptoService.rotateTenantKey(school.id, school.code, graceDays);

    res.json({
      success: true,
      message: `Tenant key rotated successfully. Previous keys valid for ${graceDays} days grace.`,
      activeKey: {
        keyId: newKey.keyId,
        algorithm: newKey.algorithm,
        publicKey: newKey.publicKey
      }
    });
  } catch (error: any) {
    console.error('Error rotating tenant key:', error);
    res.status(500).json({ error: error.message || 'Failed to rotate tenant key' });
  }
});

export default router;
