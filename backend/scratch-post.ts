async function run() {
  const payload = {
    email: 'librarian@gmail.com',
    password: 'Password123!',
    firstName: 'Jane',
    lastName: 'Doe',
    name: 'Jane Doe',
    role: 'LIBRARIAN',
    schoolCode: 'AX-KHYVF4',
    department: 'Library Affairs',
    designation: 'Lead Librarian',
    dateAssumedPost: '2026-06-24',
    bankName: 'CBZ',
    bankBranch: 'Borrowdale',
    branchCode: '123',
    accountType: 'USD',
    accountNumber: '1234567890',
    accountHolderName: 'Jane Doe',
    nationalId: '12-345678X90',
    gender: 'Female'
  };

  try {
    const res = await fetch('http://localhost:5000/api/auth/register-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error posting registration:', err);
  }
}

run();
