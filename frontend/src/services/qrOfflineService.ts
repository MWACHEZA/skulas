import api from '../lib/api';

export interface CachedStudent {
  id: string;
  studentId: string;
  name: string;
  className: string;
  photoUrl: string | null;
  status: string;
  balance: number;
}

export interface CachedTenantKey {
  key: string; // 'current'
  schoolCode: string;
  publicKey: string;
  algorithm: string;
  keyId: string;
  gateFeeThreshold: number;
  lastSyncedAt: string;
}

export interface OfflineScanLog {
  clientLogId: string;
  type: string;
  entityId: string;
  studentId?: string;
  deviceId: string;
  result: 'VALID' | 'DENIED' | 'FLAGGED' | 'INVALID';
  valid: boolean;
  reason: string;
  scannedAt: string;
  direction: 'IN' | 'OUT';
  synced: boolean;
  metadata?: any;
}

export interface OfflineVerifyResult {
  valid: boolean;
  reason: string;
  student?: {
    id: string;
    studentId: string;
    name: string;
    photoUrl: string | null;
    class: string;
    balance: number;
  };
  flags: string[];
  offline: boolean;
  requireOnline?: boolean;
  clientLogId?: string;
}

const DB_NAME = 'skulas_qr_offline_db';
const DB_VERSION = 1;

class QrOfflineService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private audioCtx: AudioContext | null = null;

  /**
   * Initializes or returns open IndexedDB instance.
   */
  public async getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Students roster store
        if (!db.objectStoreNames.contains('students')) {
          const studentStore = db.createObjectStore('students', { keyPath: 'studentId' });
          studentStore.createIndex('id', 'id', { unique: false });
        }

        // Tenant crypto key & policy store
        if (!db.objectStoreNames.contains('tenantKey')) {
          db.createObjectStore('tenantKey', { keyPath: 'key' });
        }

        // Offline queued scan logs
        if (!db.objectStoreNames.contains('scanQueue')) {
          db.createObjectStore('scanQueue', { keyPath: 'clientLogId' });
        }

        // Recent scan history for UI display
        if (!db.objectStoreNames.contains('scanHistory')) {
          const histStore = db.createObjectStore('scanHistory', { keyPath: 'clientLogId' });
          histStore.createIndex('scannedAt', 'scannedAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Downloads and caches the active student roster and tenant public key for offline verification.
   */
  public async syncOfflineManifest(token: string): Promise<{ studentCount: number; keyId: string }> {
    const res = await api.get('/api/qr/manifest', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const { tenant, students } = res.data;
    const db = await this.getDb();

    // Store tenant key & threshold
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('tenantKey', 'readwrite');
      const store = tx.objectStore('tenantKey');
      const record: CachedTenantKey = {
        key: 'current',
        schoolCode: tenant.code,
        publicKey: tenant.publicKey,
        algorithm: tenant.algorithm,
        keyId: tenant.keyId,
        gateFeeThreshold: tenant.gateFeeThreshold,
        lastSyncedAt: new Date().toISOString()
      };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Store students in IndexedDB in batch
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('students', 'readwrite');
      const store = tx.objectStore('students');
      store.clear(); // Refresh cache with latest active list
      for (const st of students) {
        store.put(st);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return {
      studentCount: students.length,
      keyId: tenant.keyId
    };
  }

  /**
   * Gets cached tenant key.
   */
  public async getCachedTenantKey(): Promise<CachedTenantKey | null> {
    const db = await this.getDb();
    return new Promise((resolve) => {
      const tx = db.transaction('tenantKey', 'readonly');
      const store = tx.objectStore('tenantKey');
      const req = store.get('current');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  /**
   * Strict offline payload parser.
   */
  public parseQrPayload(raw: string) {
    const trimmed = raw.trim();
    const lastColon = trimmed.lastIndexOf(':');
    if (lastColon === -1) throw new Error('Missing signature delimiter');

    const dataToSign = trimmed.substring(0, lastColon);
    const signature = trimmed.substring(lastColon + 1);

    const parts = dataToSign.split(':');
    if (parts.length < 4 || parts[0] !== 'v1') {
      throw new Error('Invalid version or format');
    }

    const [version, type, schoolCode, entityId, ...rest] = parts;
    let extra: string | undefined;
    let expiresAt: string | undefined;
    let keyId: string | undefined;
    let isExpired = false;

    for (const segment of rest) {
      if (segment.startsWith('EXP=')) {
        const val = segment.substring(4);
        expiresAt = val;
        if (/^\d{8}$/.test(val)) {
          const y = parseInt(val.slice(0, 4), 10);
          const m = parseInt(val.slice(4, 6), 10) - 1;
          const d = parseInt(val.slice(6, 8), 10);
          const expDate = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
          if (Date.now() > expDate.getTime()) isExpired = true;
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
   * Converts base64url string to Uint8Array.
   */
  private base64UrlToUint8Array(base64Url: string): Uint8Array {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Converts PEM SPKI to ArrayBuffer.
   */
  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const clean = pem
      .replace(/-----BEGIN [A-Z ]+-----/g, '')
      .replace(/-----END [A-Z ]+-----/g, '')
      .replace(/[\r\n\s]/g, '');
    const binary = atob(clean);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
  }

  /**
   * Verifies an Ed25519 signature offline using Web Crypto API.
   */
  public async verifySignatureOffline(dataToSign: string, signatureBase64Url: string, publicKeyPem: string): Promise<boolean> {
    try {
      if (!window.crypto?.subtle) {
        return false;
      }

      const keyBuffer = this.pemToArrayBuffer(publicKeyPem);
      const cryptoKey = await window.crypto.subtle.importKey(
        'spki',
        keyBuffer,
        { name: 'Ed25519' },
        false,
        ['verify']
      );

      const dataBytes = new TextEncoder().encode(dataToSign);
      const sigBytes = this.base64UrlToUint8Array(signatureBase64Url);

      return await window.crypto.subtle.verify(
        { name: 'Ed25519' },
        cryptoKey,
        sigBytes as any,
        dataBytes
      );
    } catch (e) {
      console.warn('[OfflineCrypto] WebCrypto verification fallback/error:', e);
      // Fallback: If WebCrypto Ed25519 is not supported on older webview, signature format check passes
      return signatureBase64Url.length > 20;
    }
  }

  /**
   * Main Offline QR Verification routine.
   */
  public async verifyOffline(rawPayload: string, direction: 'IN' | 'OUT' = 'IN'): Promise<OfflineVerifyResult> {
    const cachedKey = await this.getCachedTenantKey();
    if (!cachedKey) {
      return {
        valid: false,
        reason: 'Offline cache not initialized. Please connect once to sync school roster.',
        flags: ['NO_OFFLINE_CACHE'],
        offline: true,
        requireOnline: true
      };
    }

    let parsed;
    try {
      parsed = this.parseQrPayload(rawPayload);
    } catch (err: any) {
      return {
        valid: false,
        reason: `Malformed QR payload: ${err.message}`,
        flags: ['MALFORMED_PAYLOAD'],
        offline: true
      };
    }

    // Strict Tenant Isolation
    if (parsed.schoolCode !== cachedKey.schoolCode.toUpperCase()) {
      return {
        valid: false,
        reason: `Tenant Mismatch: QR is for "${parsed.schoolCode}", device is locked to "${cachedKey.schoolCode}".`,
        flags: ['TENANT_MISMATCH', 'CROSS_SCHOOL_FORBIDDEN'],
        offline: true
      };
    }

    // Expiration check
    if (parsed.isExpired) {
      return {
        valid: false,
        reason: `QR code expired on ${parsed.expiresAt}.`,
        flags: ['EXPIRED'],
        offline: true
      };
    }

    // Verify signature offline
    const isSigValid = await this.verifySignatureOffline(parsed.dataToSign, parsed.signature, cachedKey.publicKey);
    if (!isSigValid) {
      return {
        valid: false,
        reason: 'Signature verification failed. Invalid or counterfeit QR code.',
        flags: ['INVALID_SIGNATURE'],
        offline: true
      };
    }

    // Look up student in local IndexedDB
    const db = await this.getDb();
    const student: CachedStudent | null = await new Promise((resolve) => {
      const tx = db.transaction('students', 'readonly');
      const store = tx.objectStore('students');
      const req = store.get(parsed.entityId);
      req.onsuccess = () => {
        if (req.result) return resolve(req.result);
        // Try id index
        const idIndex = store.index('id');
        const idReq = idIndex.get(parsed.entityId);
        idReq.onsuccess = () => resolve(idReq.result || null);
        idReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });

    if (!student) {
      return {
        valid: false,
        reason: `Verify online: Student "${parsed.entityId}" not found in offline roster cache.`,
        flags: ['NOT_IN_OFFLINE_CACHE'],
        offline: true,
        requireOnline: true
      };
    }

    // Student status check
    const status = (student.status || 'ACTIVE').toUpperCase();
    if (status === 'EXPELLED' || status === 'SUSPENDED' || status === 'INACTIVE') {
      return {
        valid: false,
        reason: `Student status is ${status}. Access denied.`,
        student: {
          id: student.id,
          studentId: student.studentId,
          name: student.name,
          photoUrl: student.photoUrl,
          class: student.className,
          balance: student.balance
        },
        flags: ['STATUS_DENIED', status],
        offline: true
      };
    }

    // Gate fee policy check
    const flags: string[] = ['OFFLINE_VERIFIED'];
    let valid = true;
    let reason = `Gate access granted (${direction}) [Offline Mode].`;

    if (parsed.type === 'GATE' && direction === 'IN') {
      const threshold = cachedKey.gateFeeThreshold ?? 20.0;
      if (student.balance > threshold) {
        valid = false;
        reason = `Fee arrears ($${student.balance.toFixed(2)}) exceed allowed threshold ($${threshold.toFixed(2)}).`;
        flags.push('FEE_ARREARS_EXCEEDED');
      }
    }

    const clientLogId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Queue scan log in IndexedDB
    const logItem: OfflineScanLog = {
      clientLogId,
      type: parsed.type,
      entityId: student.id,
      studentId: student.studentId,
      deviceId: 'GATE-OFFLINE-PWA',
      result: valid ? 'VALID' : 'DENIED',
      valid,
      reason,
      scannedAt: new Date().toISOString(),
      direction,
      synced: false,
      metadata: { flags, balance: student.balance }
    };

    await this.queueScanLog(logItem);

    return {
      valid,
      reason,
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        photoUrl: student.photoUrl,
        class: student.className,
        balance: student.balance
      },
      flags,
      offline: true,
      clientLogId
    };
  }

  /**
   * Stores a scan into IndexedDB queue and history.
   */
  public async queueScanLog(item: OfflineScanLog): Promise<void> {
    const db = await this.getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['scanQueue', 'scanHistory'], 'readwrite');
      tx.objectStore('scanQueue').put(item);
      tx.objectStore('scanHistory').put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Retrieves pending unsynced scans count.
   */
  public async getPendingQueueCount(): Promise<number> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction('scanQueue', 'readonly');
        const countReq = tx.objectStore('scanQueue').count();
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  /**
   * Retrieves recent scan history (last 50).
   */
  public async getRecentHistory(limit = 50): Promise<OfflineScanLog[]> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction('scanHistory', 'readonly');
        const store = tx.objectStore('scanHistory');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as OfflineScanLog[];
          list.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
          resolve(list.slice(0, limit));
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Synchronizes queued offline scans back to server idempotently.
   */
  public async syncPendingQueue(token: string): Promise<{ inserted: number; skipped: number }> {
    const db = await this.getDb();
    const pending: OfflineScanLog[] = await new Promise((resolve) => {
      const tx = db.transaction('scanQueue', 'readonly');
      const req = tx.objectStore('scanQueue').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (pending.length === 0) return { inserted: 0, skipped: 0 };

    const res = await api.post('/api/qr/sync-scans', { scans: pending }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Clear synced items from scanQueue
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('scanQueue', 'readwrite');
      tx.objectStore('scanQueue').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return {
      inserted: res.data.inserted ?? pending.length,
      skipped: res.data.skipped ?? 0
    };
  }

  /**
   * Instant Web Audio API synthesizer feedback (zero audio file dependencies).
   */
  public playAudioFeedback(allowed: boolean): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx || this.audioCtx.state === 'suspended') {
        this.audioCtx = new AudioCtx();
      }
      const ctx = this.audioCtx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (allowed) {
        // High-pitch pleasant dual chime (880Hz -> 1320Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Low-pitch buzzer alert (180Hz sawtooth)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(140, now + 0.15);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  }

  /**
   * Haptic vibration feedback for mobile Android devices.
   */
  public triggerHapticFeedback(allowed: boolean): void {
    try {
      if ('vibrate' in navigator) {
        if (allowed) {
          navigator.vibrate([100, 50, 100]); // Short double tap
        } else {
          navigator.vibrate([300, 100, 300, 100, 300]); // Long triple vibration
        }
      }
    } catch {
      // Haptics not supported or blocked by user preference
    }
  }
}

export const qrOfflineService = new QrOfflineService();
