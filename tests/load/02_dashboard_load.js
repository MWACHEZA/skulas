/**
 * k6 Load Test: Scenario 2 — Admin Dashboard & Report Load
 *
 * Simulates 30 admin staff loading dashboard and report pages concurrently,
 * targeting aggregated queries that are most likely to cause N+1 issues.
 *
 * Run: k6 run tests/load/02_dashboard_load.js --env BASE_URL=http://localhost:5001
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    dashboard_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },  // Gradual ramp to 10
        { duration: '3m', target: 30 },  // Continue ramp to 30
        { duration: '10m', target: 30 }, // Hold sustained load
        { duration: '2m', target: 0 },   // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // Dashboards can be slower; 5s p95 threshold
    errors: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

const ADMIN_ACCOUNTS = [
  { email: 'admin1@staging.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-01' },
  { email: 'admin2@staging.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-01' },
];

const REPORT_TYPES = ['fees', 'attendance', 'grades'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export default function () {
  const account = ADMIN_ACCOUNTS[(__VU - 1) % ADMIN_ACCOUNTS.length];
  let token = '';

  group('1. Admin Login', () => {
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

  const headers = { Authorization: `Bearer ${token}` };

  sleep(1 + Math.random());

  group('2. Load admin dashboard', () => {
    const res = http.get(`${BASE_URL}/api/dashboard`, { headers });
    const ok = check(res, { 'dashboard 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  });

  sleep(2 + Math.random() * 3);

  group('3. Load fee report', () => {
    const res = http.get(`${BASE_URL}/api/report-data/fees?term=Term+1&year=2025`, { headers });
    check(res, { 'fee report 200': (r) => r.status === 200 });
  });

  sleep(2 + Math.random() * 3);

  group('4. Load attendance summary', () => {
    const res = http.get(`${BASE_URL}/api/report-data/attendance?term=Term+1&year=2025`, { headers });
    check(res, { 'attendance report 200': (r) => r.status === 200 });
  });

  sleep(3 + Math.random() * 5);
}
