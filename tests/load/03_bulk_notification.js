/**
 * k6 Load Test: Scenario 3 — Bulk Notification Send (WhatsApp)
 *
 * Simulates 10 admin staff triggering bulk WhatsApp notification sends,
 * each targeting ~50 parents. Total volume: ~500 messages enqueued.
 *
 * SAFE: Requires MOCK_WHATSAPP=true in the backend staging environment.
 * The notification-worker.ts intercepts all fetch() calls to Meta and returns
 * a mock success response, so NO real messages are sent.
 *
 * Run: k6 run tests/load/03_bulk_notification.js --env BASE_URL=http://localhost:5001
 */

import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const enqueueTime = new Trend('notification_enqueue_time');

export const options = {
  scenarios: {
    bulk_notification: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },  // 10 admins kick off sends
        { duration: '5m', target: 10 },   // Hold — worker is processing
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<4000'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

const ADMIN_ACCOUNTS = [
  { email: 'admin1@staging.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-01' },
  { email: 'admin2@staging.acadex.com', password: 'StagingPass123!', schoolCode: 'STAGING-01' },
];

// These must match template names registered in your staging WhatsApp settings
// (doesn't matter for mock mode, but mimics real payload structure)
const TEMPLATES = ['fee_reminder', 'attendance_alert', 'report_ready'];

// Staging student IDs — replace with pre-seeded data
const STAGING_STUDENT_IDS = Array.from({ length: 50 }, (_, i) => `staging-student-${String(i + 1).padStart(3, '0')}`);

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

  sleep(1 + Math.random() * 2);

  group('2. Enqueue bulk WhatsApp notifications', () => {
    // Enqueue 50 individual notification jobs (simulating a "send to all parents" action)
    const recipients = STAGING_STUDENT_IDS.slice(0, 50 + Math.floor(Math.random() * 10));
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];

    const payload = {
      template,
      recipientStudentIds: recipients,
      payload: {
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Staging Test School' },
              { type: 'text', text: '2025' }
            ]
          }
        ]
      }
    };

    const res = http.post(
      `${BASE_URL}/api/messages/bulk-notify`,
      JSON.stringify(payload),
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
    );

    const ok = check(res, {
      'notification enqueued': (r) => r.status === 200 || r.status === 202,
    });

    enqueueTime.add(res.timings.duration);
    errorRate.add(!ok);
  });

  // Think time simulating admin navigating away after send
  sleep(10 + Math.random() * 20);
}
