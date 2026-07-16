const axios = require('axios');

async function testRegistration() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/register-user', {
      firstName: 'Test',
      lastName: 'Librarian',
      name: 'Test Librarian',
      email: 'libtest' + Math.random() + '@example.com',
      password: 'Password123!',
      schoolCode: 'AX-C7L0O0', // I need a real one, I'll check DB
      role: 'LIBRARIAN',
      phone: '123456789'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testRegistration();
