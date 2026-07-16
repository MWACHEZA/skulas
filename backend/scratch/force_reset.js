const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function forceReset(email, newPassword) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { email: email.trim().toLowerCase() },
      data: { 
        password: hashedPassword,
        mustChangePassword: true,
        passwordLastChanged: new Date()
      }
    });
    console.log(`Successfully reset password for: ${user.email} to: ${newPassword}`);
    console.log('User must change password on next login.');
  } catch (err) {
    console.error('Reset failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Resetting the account from the screenshot
forceReset('stpatricks@gmail.com', 'Password123');
