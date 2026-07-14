const { PrismaClient } = require('@prisma/client');
const { seedAssessmentConfigs } = require('./dist/src/database/seeds/assessment-config.seed');
const prisma = new PrismaClient();
seedAssessmentConfigs(prisma).then(() => { console.log('Done'); return prisma.disconnect(); }).catch(console.error);
