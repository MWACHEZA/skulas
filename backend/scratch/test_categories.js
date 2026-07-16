async function test() {
  try {
    console.log('Logging in...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'stpatricks@gmail.com',
        password: 'Admin123',
        schoolCode: 'AX-KHYVF4'
      })
    });
    
    if (!loginRes.ok) {
      const errText = await loginRes.text();
      console.error('Login failed:', loginRes.status, errText);
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login success. Token received.');

    console.log('Testing PATCH /api/schools/supplier-categories...');
    const patchRes = await fetch('http://localhost:5000/api/schools/supplier-categories', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ categories: ['Test 1', 'Test 2'] })
    });
    
    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error('PATCH failed:', patchRes.status, errText);
    } else {
      const patchData = await patchRes.json();
      console.log('PATCH success:', patchData);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
