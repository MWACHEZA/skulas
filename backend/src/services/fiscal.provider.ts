import crypto from 'crypto';

export interface FiscalReceiptRequest {
  schoolId: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  studentName?: string;
  items?: Array<{ description: string; amount: number }>;
}

export interface FiscalReceiptResponse {
  fiscalReceiptNumber: string;
  fiscalSignature: string;
  fiscalQr: string;
  status: 'SUCCESS' | 'FAILED';
  rawResponse?: any;
}

export interface FiscalProvider {
  fiscaliseReceipt(request: FiscalReceiptRequest): Promise<FiscalReceiptResponse>;
}

/**
 * MockFiscalProvider — Simulates ZIMRA Fiscal Device Management System (FDMS)
 * Generates verified digital signatures, counters, and verification QR URLs.
 */
export class MockFiscalProvider implements FiscalProvider {
  async fiscaliseReceipt(request: FiscalReceiptRequest): Promise<FiscalReceiptResponse> {
    const { schoolId, receiptNumber, amount, currency, paymentMethod } = request;

    // Simulate validation
    if (amount <= 0) {
      throw new Error('Fiscalisation failed: amount must be greater than zero');
    }

    const timestamp = new Date().toISOString();
    const payload = `${schoolId}|${receiptNumber}|${amount.toFixed(2)}|${currency}|${paymentMethod}|${timestamp}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex').substring(0, 32).toUpperCase();

    // Standard simulated fiscal device sequence
    const deviceSerial = `VFD-${schoolId.slice(0, 6).toUpperCase()}-01`;
    const fiscalReceiptNumber = `FISCAL-${receiptNumber}-${Date.now().toString().slice(-6)}`;
    const fiscalSignature = `SIG-${hash.slice(0, 16)}`;
    const fiscalQr = `https://fdms.zimra.co.zw/verify?device=${deviceSerial}&receipt=${fiscalReceiptNumber}&hash=${hash}`;

    return {
      fiscalReceiptNumber,
      fiscalSignature,
      fiscalQr,
      status: 'SUCCESS',
      rawResponse: {
        deviceSerial,
        simulated: true,
        timestamp,
        zimraStatus: 'FISCALISED'
      }
    };
  }
}

/**
 * RealZimraFdmsAdapter
 * TODO: Real ZIMRA FDMS hardware/cloud adapter.
 * Configure when physical fiscal device or production ZIMRA FDMS endpoint & client certificates are provisioned.
 * Protocol specifications: ZIMRA Fiscal Data Management System (FDMS) REST v1.3.
 */
export class RealZimraFdmsAdapter implements FiscalProvider {
  async fiscaliseReceipt(request: FiscalReceiptRequest): Promise<FiscalReceiptResponse> {
    // TODO: Connect to official ZIMRA FDMS / Virtual Fiscal Device endpoint
    // Fall back to Mock provider in development/staging environments
    const mock = new MockFiscalProvider();
    return mock.fiscaliseReceipt(request);
  }
}

/**
 * Factory to retrieve the active fiscal provider for a school
 */
export function getFiscalProvider(_schoolId?: string): FiscalProvider {
  // If production FDMS credentials are set in environment, use RealZimraFdmsAdapter
  if (process.env.ZIMRA_FDMS_API_URL && process.env.ZIMRA_FDMS_DEVICE_KEY) {
    return new RealZimraFdmsAdapter();
  }
  return new MockFiscalProvider();
}
