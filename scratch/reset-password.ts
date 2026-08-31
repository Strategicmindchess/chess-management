import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  const email = 'rajveershivhare047@gmail.com';
  const plainTextPassword = 'Password@123';
  
  const user = await prisma.user.findUnique({
    where: { email: email }
  });

  if (!user) {
    console.log(`User not found with email: ${email}`);
    return;
  }

  // Same logic as src/lib/password.ts: bcrypt.hash(password, 10)
  const hashedPassword = await bcrypt.hash(plainTextPassword, 10);

  await prisma.user.update({
    where: { email: email },
    data: { passwordHash: hashedPassword }
  });

  console.log(`Password successfully reset for ${email}`);
  console.log(`New Password: ${plainTextPassword}`);
}

resetPassword().catch(console.error);
