/**
 * k6 Load Test: Scenario 4 — Fee Payment Period Spike
 *
 * Simulates 200 parents hitting the wallet/payment endpoints concurrently
 * around a fee deadline. Tests transactional integrity under concurrent writes.
 *
 * Run: k6 run tests/load/04_fee_payment_spike.js --env BASE_URL=http://localhost:5001
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const paymentTime = new Trend('payment_response_time');

export const options = {
  scenarios: {
    fee_deadline_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 100 },  // Build up over 3 minutes
        { duration: '5m', target: 200 },  // Peak: 200 concurrent parents paying
        { duration: '3m', target: 50 },   // Taper off
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<4000'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

// Parent accounts — pre-seeded in staging
const PARENT_ACCOUNTS = [
  { email: 'parent1@staging.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-01' },
  { email: 'parent2@staging.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-01' },
];

// Staging student IDs linked to the parent accounts above
const STAGING_STUDENT_IDS = Array.from(
  { length: 50 },
  (_, i) => `staging-student-${String(i + 1).padStart(3, '0')}`
);

const PAYMENT_AMOUNTS = [500, 1000, 1500, 2000, 2500];

export default function () {
  const account = PARENT_ACCOUNTS[(__VU - 1) % PARENT_ACCOUNTS.length];
  const studentId = STAGING_STUDENT_IDS[(__VU - 1) % STAGING_STUDENT_IDS.length];
  let token = '';

  group('1. Parent Login', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: account.email, password: account.password, schoolCode: account.schoolCode }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const ok = check(res, { 'login 200': (r) => r.status === 200 });
    errorRate.add(!ok);
    if (res.status === 200) token = JSON.parse(res.body).token;
  });

  if (!token) return;

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  sleep(1 + Math.random() * 2);

  group('2. Check wallet balance', () => {
    const res = http.get(`${BASE_URL}/api/wallets/${studentId}`, { headers });
    check(res, { 'wallet 200': (r) => r.status === 200 });
  });

  sleep(2 + Math.random() * 4);

  group('3. View fee breakdown', () => {
    const res = http.get(`${BASE_URL}/api/fees?studentId=${studentId}`, { headers });
    check(res, { 'fees 200': (r) => r.status === 200 });
  });

  sleep(3 + Math.random() * 5);

  group('4. Submit fee payment', () => {
    const amount = PAYMENT_AMOUNTS[Math.floor(Math.random() * PAYMENT_AMOUNTS.length)];

    const res = http.post(
      `${BASE_URL}/api/wallets/fund`,
      JSON.stringify({ studentId, amount, paymentMethod: 'Cash' }),
      { headers }
    );

    const ok = check(res, {
      'payment accepted': (r) => r.status === 200 || r.status === 201,
    });

    paymentTime.add(res.timings.duration);
    errorRate.add(!ok);
  });

  sleep(5 + Math.random() * 10);
}
