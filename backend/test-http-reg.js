const http = require('http');

const payload = JSON.stringify({
  email: 'newteacher@gmail.com',
  password: 'TestPassword123!',
  name: 'Test Teacher',
  firstName: 'Test',
  lastName: 'Teacher',
  role: 'TEACHER',
  schoolCode: 'AX-KHYVF4',
  phone: '+1234567890',
  dob: '1990-01-01',
  gender: 'Male',
  address: '123 Test St',
  departmentId: 'cmqjjwgiq0003oernx6qfuj2y', // Mathematics department ID
  dateAssumedPost: '2026-06-26',
  accountType: 'USD',
  accountTypeZig: 'ZiG',
  subjects: 'Mathematics'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(payload);
req.end();
