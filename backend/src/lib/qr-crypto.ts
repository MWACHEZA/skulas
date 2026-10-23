import crypto from 'crypto';
import QRCode from 'qrcode';
import prisma from './prisma';

export type QrType = 'GATE' | 'FEES' | 'LIB' | 'ATT';

export const VALID_QR_TYPES: QrType[] = ['GATE', 'FEES', 'LIB', 'ATT'];

export interface QrPayloadOptions {
  type: QrType;
  schoolCode: string;
  entityId: string;
  extra?: string; // e.g. "150.00_USD" or "BK-1049"
  expiresAt?: Date | string; // yyyymmdd or Date
  keyId?: string; // kid
}

export interface ParsedQrPayload {
  raw: string;
  dataToSign: string;
  version: string;
  type: QrType;
  schoolCode: string;
  entityId: string;
  extra?: string;
  expiresAt?: string; // YYYYMMDD
  keyId?: string;
  signature: string;
  isExpired: boolean;
}

export interface VerifySignatureResult {
  valid: boolean;
  reason?: string;
  payload?: ParsedQrPayload;
}

export class QrCryptoService {
  /**
   * Builds the canonical data string to be signed.
   * Format: v1:{TYPE}:{SCHOOL_CODE}:{ENTITY_ID}[:{EXTRA}][:EXP={yyyymmdd}][:KID={kid}]
   */
  static buildDataToSign(options: QrPayloadOptions): string {
    const { type, schoolCode, entityId, extra, expiresAt, keyId } = options;

    if (!VALID_QR_TYPES.includes(type)) {
      throw new Error(`Invalid QR type: ${type}. Must be one of: ${VALID_QR_TYPES.join(', ')}`);
    }
    if (!schoolCode || typeof schoolCode !== 'string' || schoolCode.trim() === '') {
      throw new Error('School code is required');
    }
    if (!entityId || typeof entityId !== 'string' || entityId.trim() === '') {
      throw new Error('Entity ID is required');
    }

    const parts: string[] = ['v1', type.toUpperCase(), schoolCode.trim().toUpperCase(), entityId.trim()];

    if (extra && extra.trim() !== '') {
      parts.push(extra.trim());
    }

    if (expiresAt) {
      let expStr = '';
      if (expiresAt instanceof Date) {
        expStr = expiresAt.toISOString().slice(0, 10).replace(/-/g, '');
      } else if (typeof expiresAt === 'string') {
        expStr = expiresAt.replace(/-/g, '').trim();
      }
      if (expStr.length === 8 && /^\d{8}$/.test(expStr)) {
        parts.push(`EXP=${expStr}`);
      } else {
        throw new Error(`Invalid expiration format: ${expiresAt}. Expected YYYYMMDD.`);
      }
    }

    if (keyId && keyId.trim() !== '') {
      parts.push(`KID=${keyId.trim()}`);
    }

    return parts.join(':');
  }

  /**
   * Strictly parses an incoming scanned QR string.
   * Rejects malformed payloads with descriptive error messages.
   */
  static parsePayload(rawPayload: string): ParsedQrPayload {
    if (!rawPayload || typeof rawPayload !== 'string') {
      throw new Error('QR payload is empty or not a string');
    }

    const trimmed = rawPayload.trim();
    const lastColonIdx = trimmed.lastIndexOf(':');
    if (lastColonIdx === -1) {
      throw new Error('Malformed QR payload: missing signature delimiter');
    }

    const dataToSign = trimmed.substring(0, lastColonIdx);
    const signature = trimmed.substring(lastColonIdx + 1);

    if (!signature || signature.length < 10) {
      throw new Error('Malformed QR payload: invalid signature length');
    }

    const parts = dataToSign.split(':');
    if (parts.length < 4) {
      throw new Error(`Malformed QR payload: expected at least 4 segments, got ${parts.length}`);
    }

    const [version, typeRaw, schoolCode, entityId, ...rest] = parts;

    if (version !== 'v1') {
      throw new Error(`Unsupported QR payload version: ${version}`);
    }

    const type = typeRaw.toUpperCase() as QrType;
    if (!VALID_QR_TYPES.includes(type)) {
      throw new Error(`Invalid QR type: ${typeRaw}. Expected one of: ${VALID_QR_TYPES.join(', ')}`);
    }

    if (!schoolCode || schoolCode.trim() === '') {
      throw new Error('Malformed QR payload: empty school code');
    }

    if (!entityId || entityId.trim() === '') {
      throw new Error('Malformed QR payload: empty entity ID');
    }

    let extra: string | undefined;
    let expiresAt: string | undefined;
    let keyId: string | undefined;
    let isExpired = false;

    for (const segment of rest) {
      if (segment.startsWith('EXP=')) {
        const val = segment.substring(4);
        if (!/^\d{8}$/.test(val)) {
          throw new Error(`Malformed expiration date in QR: ${segment}`);
        }
        expiresAt = val;
        const year = parseInt(val.substring(0, 4), 10);
        const month = parseInt(val.substring(4, 6), 10) - 1;
        const day = parseInt(val.substring(6, 8), 10);
        // Expiration is at the end of the specified day (23:59:59.999)
        const expDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        if (Date.now() > expDate.getTime()) {
          isExpired = true;
        }
      } else if (segment.startsWith('KID=')) {
        keyId = segment.substring(4);
      } else {
        extra = segment;
      }
    }

    return {
      raw: trimmed,
      dataToSign,
      version,
      type,
      schoolCode: schoolCode.toUpperCase(),
      entityId,
      extra,
      expiresAt,
      keyId,
      signature,
      isExpired
    };
  }

  /**
   * Signs a payload using either Ed25519 (asymmetric) or HMAC-SHA256.
   */
  static sign(
    options: QrPayloadOptions,
    secretOrPrivateKeyPem: string,
    algorithm: 'ED25519' | 'HMAC_SHA256' = 'ED25519'
  ): string {
    const dataToSign = this.buildDataToSign(options);

    let signature = '';
    if (algorithm === 'ED25519') {
      const sigBuffer = crypto.sign(null, Buffer.from(dataToSign, 'utf8'), secretOrPrivateKeyPem);
      signature = sigBuffer.toString('base64url');
    } else {
      // HMAC-SHA256 truncated to 16 bytes (represented in base64url = 22 chars)
      const hmac = crypto.createHmac('sha256', secretOrPrivateKeyPem).update(dataToSign, 'utf8').digest();
      signature = hmac.subarray(0, 16).toString('base64url');
    }

    return `${dataToSign}:${signature}`;
  }

  /**
   * Constant-time timing-safe signature verification.
   */
  static verifySignatureWithKey(
    parsed: ParsedQrPayload,
    secretOrPublicKeyPem: string,
    algorithm: 'ED25519' | 'HMAC_SHA256' = 'ED25519'
  ): boolean {
    try {
      if (algorithm === 'ED25519') {
        const sigBuffer = Buffer.from(parsed.signature, 'base64url');
        return crypto.verify(null, Buffer.from(parsed.dataToSign, 'utf8'), secretOrPublicKeyPem, sigBuffer);
      } else {
        const expectedHmac = crypto.createHmac('sha256', secretOrPublicKeyPem).update(parsed.dataToSign, 'utf8').digest();
        const expectedSig = expectedHmac.subarray(0, 16).toString('base64url');

        const actualBuf = Buffer.from(parsed.signature, 'utf8');
        const expectedBuf = Buffer.from(expectedSig, 'utf8');

        if (actualBuf.length !== expectedBuf.length) {
          return false;
        }

        return crypto.timingSafeEqual(actualBuf, expectedBuf);
      }
    } catch {
      return false;
    }
  }

  /**
   * Retrieves or provisions an active cryptographic key for a school.
   */
  static async getOrCreateActiveKey(schoolId: string, schoolCode: string): Promise<{
    keyId: string;
    algorithm: 'ED25519' | 'HMAC_SHA256';
    publicKey: string;
    privateKey: string;
  }> {
    const existing = await prisma.tenantKey.findFirst({
      where: {
        schoolId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existing) {
      return {
        keyId: existing.keyId,
        algorithm: existing.algorithm as 'ED25519' | 'HMAC_SHA256',
        publicKey: existing.publicKey,
        privateKey: existing.encryptedPrivateKey
      };
    }

    // Generate new Ed25519 keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const keyId = `k_${Date.now().toString(36)}`;

    const created = await prisma.tenantKey.create({
      data: {
        schoolId,
        schoolCode: schoolCode.toUpperCase(),
        keyId,
        algorithm: 'ED25519',
        publicKey,
        encryptedPrivateKey: privateKey,
        isActive: true
      }
    });

    return {
      keyId: created.keyId,
      algorithm: 'ED25519',
      publicKey: created.publicKey,
      privateKey: created.encryptedPrivateKey
    };
  }

  /**
   * Finds a key by keyId, or falls back to all school keys (active & grace period) for key rotation.
   */
  static async findTenantKeys(schoolId: string, keyId?: string) {
    if (keyId) {
      const specific = await prisma.tenantKey.findFirst({
        where: { schoolId, keyId }
      });
      if (specific) return [specific];
    }

    return prisma.tenantKey.findMany({
      where: {
        schoolId,
        OR: [{ isActive: true }, { expiresAt: { gt: new Date() } }]
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Rotates a tenant's signing key.
   * Gives previous keys a 30-day grace period so already printed cards keep working.
   */
  static async rotateTenantKey(schoolId: string, schoolCode: string, graceDays = 30) {
    const graceExpiry = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);

    // Deactivate current active keys with grace expiry
    await prisma.tenantKey.updateMany({
      where: { schoolId, isActive: true },
      data: {
        isActive: false,
        expiresAt: graceExpiry
      }
    });

    // Create a fresh key
    return this.getOrCreateActiveKey(schoolId, schoolCode);
  }

  /**
   * Generates a QR image locally using the `qrcode` library.
   * Supports PNG (for ID cards / printing) and SVG (for payment slips).
   * Sizes: Gate ID = 20mm (~236px at 300dpi), Fees slip = 15mm (~177px), Library = 10mm (~118px).
   */
  static async renderQrCode(
    payload: string,
    options: {
      format?: 'png' | 'svg';
      sizeMm?: 10 | 15 | 20 | number;
      dpi?: number;
    } = {}
  ): Promise<{ data: Buffer | string; mimeType: string }> {
    const format = options.format || 'png';
    const sizeMm = options.sizeMm || 20;
    const dpi = options.dpi || 300;

    // Convert millimeters to pixels: px = (mm / 25.4) * dpi
    const pixelWidth = Math.round((sizeMm / 25.4) * dpi);

    if (format === 'svg') {
      const svgString = await QRCode.toString(payload, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        width: pixelWidth,
        margin: 1
      });
      return { data: svgString, mimeType: 'image/svg+xml' };
    }

    const pngBuffer = await QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      width: pixelWidth,
      margin: 1
    });

    return { data: pngBuffer, mimeType: 'image/png' };
  }
}
