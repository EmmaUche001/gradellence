import { PrismaClient } from '@prisma/client';

export async function seedAssessmentConfigs(prisma: PrismaClient) {
  const schools = await prisma.school.findMany({ where: { isActive: true } });

  if (schools.length === 0) {
    console.log('No active schools found. Skipping AssessmentConfig seeding.');
    return;
  }

  const defaults = [
    { type: 'CA1', label: '1st CA', maxScore: 20, weight: 0.2, order: 1 },
    { type: 'CA2', label: '2nd CA', maxScore: 20, weight: 0.2, order: 2 },
    { type: 'EXAM', label: 'Exam', maxScore: 60, weight: 0.6, order: 3 },
  ];

  const createdCount = 0;

  /* for (const school of schools) {
    for (const config of defaults) {
      await prisma.assessmentConfig.upsert({
        where: { schoolId_type: { schoolId: school.id, type: config.type } },
        update: {},
        create: {
          schoolId: school.id,
          ...config,
        },
      });
      createdCount++;
    }
  } */

  console.log(
    `AssessmentConfig seeded: ${createdCount} records upserted across ${schools.length} school(s)`,
  );
}
