const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Searching for smoke users (email starts with "smoke")...');
  const users = await prisma.user.findMany({
    where: { email: { startsWith: 'smoke' } },
    select: { id: true, email: true, schoolId: true },
  });

  if (users.length === 0) {
    console.log('No smoke users found.');
  } else {
    const userIds = users.map(u => u.id);
    console.log(`Found ${users.length} smoke user(s):`, users.map(u => u.email));

    console.log('Deleting refresh tokens for smoke users...');
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });

    if (prisma.emailVerification) {
      try {
        await prisma.emailVerification.deleteMany({ where: { userId: { in: userIds } } });
        console.log('Deleted email verification records for smoke users (if any).');
      } catch (e) {
        console.log('emailVerification deletion failed or not present, skipped.');
      }
    } else {
      console.log('emailVerification model not present, skipped.');
    }

    if (prisma.userRole) {
      try {
        await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
      } catch {}
    }

    console.log('Deleting smoke user accounts...');
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.log(`Deleted ${users.length} smoke user(s).`);
  }

  console.log('Searching for smoke schools (slug starts with "smoke-test-")...');
  const schools = await prisma.school.findMany({
    where: { slug: { startsWith: 'smoke-test-' } },
    select: { id: true, slug: true },
  });

  if (schools.length === 0) {
    console.log('No smoke schools found.');
  } else {
    console.log(`Found ${schools.length} smoke school(s):`, schools.map(s => s.slug));
    const deletable = [];

    for (const s of schools) {
      const userCount = await prisma.user.count({ where: { schoolId: s.id } });
      if (userCount === 0) {
        deletable.push(s.id);
      } else {
        console.log(`Skipping school ${s.slug} — still has ${userCount} user(s).`);
      }
    }

    if (deletable.length > 0) {
      await prisma.school.deleteMany({ where: { id: { in: deletable } } });
      console.log(`Deleted ${deletable.length} smoke school(s).`);
    } else {
      console.log('No smoke schools were safe to delete (schools with remaining users were skipped).');
    }
  }

  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error('Error during undo script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });