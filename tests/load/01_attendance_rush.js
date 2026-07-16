/**
 * k6 Load Test: Scenario 1 — Morning Attendance Rush
 *
 * Simulates 80 teachers all logging in and marking bulk attendance
 * within a 10-minute window (the most realistic peak-load event).
 *
 * Run: k6 run tests/load/01_attendance_rush.js --env BASE_URL=http://localhost:5001
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const attendanceP95 = new Trend('attendance_save_p95');
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    morning_rush: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 80 },  // Ramp up to 80 teachers over 2 min
        { duration: '8m', target: 80 },  // Hold at 80 for 8 minutes (the window)
        { duration: '1m', target: 0 },   // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% of requests must be under 3s
    errors: ['rate<0.05'],              // Less than 5% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

// Teacher accounts — pre-seeded in the staging DB
// Replace with real staging credentials once seeded
const TEACHER_ACCOUNTS = [
  { email: 'teacher1@staging.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-01' },
  { email: 'teacher2@staging.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-01' },
  { email: 'teacher3@staging.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-01' },
  // Add more until you have 80+ accounts matching staging seed data
];

// Classes — pre-seeded in the staging DB
const CLASS_IDS = [
  'staging-class-id-1',
  'staging-class-id-2',
  'staging-class-id-3',
];

// Student IDs per class — pre-seeded (update with real IDs from staging DB)
const STUDENT_RECORDS = {
  'staging-class-id-1': ['student-id-001', 'student-id-002', 'student-id-003', 'student-id-004'],
  'staging-class-id-2': ['student-id-005', 'student-id-006', 'student-id-007', 'student-id-008'],
  'staging-class-id-3': ['student-id-009', 'student-id-010', 'student-id-011', 'student-id-012'],
};

const STATUSES = ['Present', 'Absent', 'Late', 'Excused'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function setup() {
  // Verify the staging API is reachable before starting
  const res = http.get(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    throw new Error(`Staging API not reachable: ${res.status}`);
  }
}

export default function () {
  // Each VU picks a teacher account (cycle through the list)
  const account = TEACHER_ACCOUNTS[(__VU - 1) % TEACHER_ACCOUNTS.length];
  const classId = getRandomItem(CLASS_IDS);
  const students = STUDENT_RECORDS[classId] || [];

  let token = '';

  group('1. Login', () => {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: account.email, password: account.password, schoolCode: account.schoolCode }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const ok = check(loginRes, {
      'login 200': (r) => r.status === 200,
      'token present': (r) => JSON.parse(r.body).token !== undefined,
    });
    errorRate.add(!ok);

    if (loginRes.status === 200) {
      token = JSON.parse(loginRes.body).token;
    }
  });

  if (!token) return;

  // Simulate a teacher reviewing the class list (1–3 seconds think time)
  sleep(1 + Math.random() * 2);

  group('2. Fetch class roster', () => {
    const rosterRes = http.get(
      `${BASE_URL}/api/students?classId=${classId}&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    check(rosterRes, { 'roster 200': (r) => r.status === 200 });
  });

  // Simulate marking attendance (teacher spends 3–7 seconds ticking boxes)
  sleep(3 + Math.random() * 4);

  group('3. Submit bulk attendance', () => {
    const records = students.map(studentId => ({
      studentId,
      status: getRandomItem(STATUSES),
      note: '',
      classId,
    }));

    const date = new Date().toISOString().split('T')[0];

    const saveRes = http.post(
      `${BASE_URL}/api/teachers/attendance/mark-bulk`,
      JSON.stringify({ date, records, classId }),
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
    );

    const ok = check(saveRes, {
      'attendance saved 200': (r) => r.status === 200,
    });

    attendanceP95.add(saveRes.timings.duration);
    errorRate.add(!ok);
  });

  // End of session think time
  sleep(2 + Math.random() * 3);
}
