async function testLogin() {
  const payload = {
    email: 'supplier@yahoo.com',
    password: 'C0mforter@01',
    schoolCode: ''
  };
  
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.log('Fetch Error:', err.message);
  }
}

testLogin();
