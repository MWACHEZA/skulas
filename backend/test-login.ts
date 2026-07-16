async function main() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'medical@yahoo.com',
        password: 'password123',
        schoolCode: 'AX-KHYVF4'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', data);
  } catch (err: any) {
    console.error(err);
  }
}
main();
