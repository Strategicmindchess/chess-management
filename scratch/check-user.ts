import { prisma } from '../src/lib/prisma';

async function checkUser() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Sanskrit7', mode: 'insensitive' } },
        { email: { contains: 'Sanskrit7', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      password: true,
      status: true
    }
  });

  if (users.length === 0) {
    console.log('No user found matching Sanskrit7.');
    return;
  }

  for (const user of users) {
    console.log(`User ID: ${user.id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Status: ${user.status}`);
    console.log(`Email Verified: ${user.emailVerified}`);
    console.log(`Has Password: ${user.password ? 'Yes' : 'No'}`);
    console.log('-------------------------');
  }
}

checkUser().catch(console.error);
