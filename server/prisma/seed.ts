import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedPermissions } from '../src/database/seeds/permissions.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking/Creating subscription plans...');

  // Check if Basic plan exists
  let basic = await prisma.subscriptionPlan.findFirst({
    where: { name: 'Basic' }
  });
   
  if (!basic) {
    basic = await prisma.subscriptionPlan.create({
      data: {
        name: 'Basic',
        description: 'Perfect for small private schools and nursery schools',
        priceNGN: 15000, // ₦15,000/month
        duration: 30,
        maxStudents: 500,
        maxUsers: 50,
        maxBranches: 1,
        storageGB: 10, // Changed from 5 to 10 GB as requested
        features: {
          aiRemarks: false,
          aiStudentSummary: false,
          aiTeacherInsights: false,
          aiAcademicAdvisor: false,
          aiRiskPrediction: false,
          aiForecasting: false,
          aiChatAssistant: false,
          aiExecutiveReports: false,
          parentPortal: false,
          communication: false,
          analyticsDashboard: true,
          multiBranch: false,
          bulkOperations: false,
        },
      },
    });
    console.log('Created Basic plan');
  } else {
    console.log('Basic plan already exists');
    // Update the storageGB for existing Basic plan
    basic = await prisma.subscriptionPlan.update({
      where: { id: basic.id },
      data: { storageGB: 10 }
    });
  }

  // Check if Standard plan exists
  let standard = await prisma.subscriptionPlan.findFirst({
    where: { name: 'Standard' }
  });
   
  if (!standard) {
    standard = await prisma.subscriptionPlan.create({
      data: {
        name: 'Standard',
        description: 'Ideal for medium-sized schools and secondary schools',
        priceNGN: 50000, // ₦50,000/month
        duration: 30,
        maxStudents: 2000,
        maxUsers: 200,
        maxBranches: 3,
        storageGB: 50,
        features: {
          aiRemarks: true,
          aiStudentSummary: true,
          aiTeacherInsights: true,
          aiAcademicAdvisor: false,
          aiRiskPrediction: false,
          aiForecasting: false,
          aiChatAssistant: false,
          aiExecutiveReports: false,
          parentPortal: true,
          communication: true,
          analyticsDashboard: true,
          multiBranch: true,
          bulkOperations: true,
        },
      },
    });
    console.log('Created Standard plan');
  } else {
    console.log('Standard plan already exists');
  }

  // Check if Premium plan exists
  let premium = await prisma.subscriptionPlan.findFirst({
    where: { name: 'Premium' }
  });
   
  if (!premium) {
    premium = await prisma.subscriptionPlan.create({
      data: {
        name: 'Premium',
        description: 'Enterprise solution for large schools and school groups',
        priceNGN: 150000, // ₦150,000/month
        duration: 30,
        maxStudents: 99999, // Effectively unlimited
        maxUsers: 9999,
        maxBranches: 999, // Unlimited
        storageGB: 9999, // Unlimited
        features: {
          aiRemarks: true,
          aiStudentSummary: true,
          aiTeacherInsights: true,
          aiAcademicAdvisor: true,
          aiRiskPrediction: true,
          aiForecasting: true,
          aiChatAssistant: true,
          aiExecutiveReports: true,
          parentPortal: true,
          communication: true,
          analyticsDashboard: true,
          multiBranch: true,
          bulkOperations: true,
        },
      },
    });
    console.log('Created Premium plan');
  } else {
    console.log('Premium plan already exists');
  }

  console.log('Subscription plans seeding complete!');

  // Seed permissions and role-permission mappings
  await seedPermissions(prisma);

  // ── Create SUPER ADMIN user ──────────────────────
  const superAdminEmail = 'irismonde.black@gmail.com';
  let superAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (!superAdmin) {
    // Find the first school to use as a reference (SUPER_ADMIN bypasses tenant isolation via TenantGuard)
    const firstSchool = await prisma.school.findFirst({ where: { deletedAt: null } });
    if (!firstSchool) {
      console.warn('No schools found, skipping SUPER_ADMIN user creation');
      return;
    }

    const passwordHash = await bcrypt.hash('Laptop-me-llence', 12);

    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash,
        firstName: 'Iris',
        lastName: 'Monde',
        schoolId: firstSchool.id,
        isActive: true,
        emailVerified: true,
      },
    });
    console.log(`Created SUPER ADMIN user: ${superAdminEmail}`);
  } else {
    console.log(`SUPER ADMIN user already exists: ${superAdminEmail}`);
  }

  // Assign SUPER_ADMIN role to the user
  const superAdminRole = await prisma.role.findFirst({
    where: { schoolId: null, name: 'SUPER_ADMIN' },
  });

  if (superAdminRole && superAdmin) {
    const existingAssignment = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
    });

    if (!existingAssignment) {
      await prisma.userRole.create({
        data: {
          userId: superAdmin.id,
          roleId: superAdminRole.id,
        },
      });
      console.log(`Assigned SUPER_ADMIN role to user ${superAdminEmail}`);
    } else {
      console.log(`SUPER_ADMIN role already assigned to ${superAdminEmail}`);
    }
  }

}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    // Don't exit with error - allow app to start even if seeding fails
    console.log('Continuing with application startup...');
  })
  .finally(async () => {
    await prisma.$disconnect();
  });