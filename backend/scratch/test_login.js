const axios = require('axios');
const API_URL = 'http://localhost:5000'; // Assuming backend port

async function testLogin() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'supplier@yahoo.com',
      password: 'C0mforter@01',
      schoolCode: ''
    });
    console.log('Login Success:', response.data.user.name);
  } catch (err) {
    console.log('Login Failed:', err.response?.data?.error || err.message);
  }
}

testLogin();
