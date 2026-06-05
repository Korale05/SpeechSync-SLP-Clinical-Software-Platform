import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning database...');
  await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE;');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public;');
  console.log('Database cleaned successfully.');
}

main()
  .catch((e) => {
    console.error('Failed to clean database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
