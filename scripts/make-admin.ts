// Usage: npx tsx scripts/make-admin.ts <email>
// Promotes an existing user to ADMIN role

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log("Usage: npx tsx scripts/make-admin.ts <email>");
    console.log("\nExisting users:");
    const users = await prisma.user.findMany({ select: { email: true, name: true, role: true } });
    users.forEach(u => console.log(`  ${u.email} — ${u.name} (${u.role})`));
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`✅ ${user.name} (${email}) is now an ADMIN`);
  console.log(`\nLog in at /login with this email, then visit /admin`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
