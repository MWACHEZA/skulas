async function testRegistration() {
  try {
    const payload = {
      firstName: 'Test',
      lastName: 'Librarian',
      name: 'Test Librarian',
      email: 'libtest' + Math.floor(Math.random() * 10000) + '@example.com',
      password: 'Password123!',
      schoolCode: 'AX-EMBAKWE', 
      role: 'LIBRARIAN',
      phone: '123456789',
      nationalId: '123456789X12',
      gender: 'Male',
      department: 'Library Affairs',
      designation: 'Assistant Librarian'
    };

    console.log('Sending payload:', payload);

    const res = await fetch('http://localhost:5000/api/auth/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
        console.log('Success:', data);
    } else {
        console.error('Failure:', data);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testRegistration();
