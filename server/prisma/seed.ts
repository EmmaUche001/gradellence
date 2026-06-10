import { PrismaClient } from '@prisma/client';

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