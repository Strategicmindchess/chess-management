import { config } from 'dotenv';
config();
import { prisma } from '../src/lib/prisma';
import { Role } from '../src/lib/enums';

async function main() {
  try {
    await prisma.$transaction(async (tx) => {
      // Create something that fails uniquely
      try {
        await tx.user.create({
          data: {
            id: 'ayush-existing', 
            email: 'admin@strategicmindchess.com', 
            name: 'test',
            passwordHash: 'pwd',
            role: Role.TEACHER
          }
        });
      } catch (err: any) {
        console.log("Caught error inside tx:", err.code);
        // Now try another query
        const existing = await tx.user.findFirst();
        console.log("Got existing:", !!existing);
      }
    });
  } catch (e: any) {
    console.log("Transaction failed:", e.message);
  }
}

main().finally(() => prisma.$disconnect());
