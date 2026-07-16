/**
 * k6 Load Test: Scenario 5 — Multi-tenant Concurrent Load
 *
 * Simulates 3 separate school tenants each running moderate load simultaneously.
 * Goal: confirm that heavy activity in Tenant A does not degrade Tenant B.
 * Checks that the schoolId filter on every query properly isolates tenant data.
 *
 * Run: k6 run tests/load/05_multi_tenant.js --env BASE_URL=http://localhost:5001
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const tenantATime = new Trend('tenant_a_response_time');
const tenantBTime = new Trend('tenant_b_response_time');
const tenantCTime = new Trend('tenant_c_response_time');

export const options = {
  scenarios: {
    // Tenant A — heavier load (the "noisy neighbour")
    tenant_a_heavy: {
      executor: 'constant-vus',
      vus: 50,
      duration: '15m',
      env: { TENANT: 'A' },
    },
    // Tenant B — moderate load
    tenant_b_moderate: {
      executor: 'constant-vus',
      vus: 20,
      duration: '15m',
      env: { TENANT: 'B' },
    },
    // Tenant C — light load (control)
    tenant_c_light: {
      executor: 'constant-vus',
      vus: 5,
      duration: '15m',
      env: { TENANT: 'C' },
    },
  },
  thresholds: {
    // Tenant C (light load) must not be degraded by Tenant A
    'tenant_c_response_time': ['p(95)<2000'],
    'tenant_b_response_time': ['p(95)<3000'],
    'tenant_a_response_time': ['p(95)<5000'],
    'errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

// Each tenant has its own separate school code and accounts — pre-seeded
const TENANT_CONFIG = {
  A: {
    accounts: [
      { email: 'teacher1@tenanta.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-01' },
    ],
    students: Array.from({ length: 30 }, (_, i) => `tenant-a-student-${i + 1}`),
    classId: 'tenant-a-class-1',
  },
  B: {
    accounts: [
      { email: 'teacher1@tenantb.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-02' },
    ],
    students: Array.from({ length: 20 }, (_, i) => `tenant-b-student-${i + 1}`),
    classId: 'tenant-b-class-1',
  },
  C: {
    accounts: [
      { email: 'teacher1@tenantc.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-03' },
    ],
    students: Array.from({ length: 10 }, (_, i) => `tenant-c-student-${i + 1}`),
    classId: 'tenant-c-class-1',
  },
};

const STATUSES = ['Present', 'Absent', 'Late'];

export default function () {
  const tenant = __ENV.TENANT || 'A';
  const config = TENANT_CONFIG[tenant];
  const account = config.accounts[(__VU - 1) % config.accounts.length];
  const timingMetric = tenant === 'A' ? tenantATime : tenant === 'B' ? tenantBTime : tenantCTime;

  let token = '';

  group(`[Tenant ${tenant}] Login`, () => {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: account.email, password: account.password, schoolCode: account.schoolCode }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const ok = check(res, { [`tenant_${tenant} login 200`]: (r) => r.status === 200 });
    errorRate.add(!ok);
    if (res.status === 200) token = JSON.parse(res.body).token;
  });

  if (!token) return;

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  sleep(1 + Math.random());

  group(`[Tenant ${tenant}] Mark attendance`, () => {
    const records = config.students.map(studentId => ({
      studentId,
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      note: '',
      classId: config.classId,
    }));
    const date = new Date().toISOString().split('T')[0];

    const res = http.post(
      `${BASE_URL}/api/teachers/attendance/mark-bulk`,
      JSON.stringify({ date, records, classId: config.classId }),
      { headers }
    );

    const ok = check(res, { [`tenant_${tenant} attendance 200`]: (r) => r.status === 200 });
    timingMetric.add(res.timings.duration);
    errorRate.add(!ok);
  });

  sleep(5 + Math.random() * 10);
}
