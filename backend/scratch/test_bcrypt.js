const bcrypt = require('bcryptjs');

async function testBcrypt() {
  const password = 'Password123';
  // Use a hash from the diagnosis output
  const hash = '$2b$10$t.A'; // This is just the preview
  
  // Let's create a new hash and compare it
  const newHash = await bcrypt.hash(password, 10);
  console.log('New Hash:', newHash);
  
  const isValid = await bcrypt.compare(password, newHash);
  console.log('Compare Success:', isValid);
  
  // Try with $2b$ prefix
  const testHash = '$2b$10$1234567890123456789012345678901234567890123456789012'; // Invalid but for testing
  try {
    await bcrypt.compare(password, testHash);
  } catch (e) {
    console.log('Error with dummy hash:', e.message);
  }
}

testBcrypt();
