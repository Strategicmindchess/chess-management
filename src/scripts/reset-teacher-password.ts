import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function main() {
  const email = "teacher@gmail.com";
  const newPassword = "password123";

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.error(`User with email ${email} not found.`);
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(`Password for ${email} has been successfully reset to: ${newPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

