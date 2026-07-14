import { PrismaClient } from '@prisma/client';

const PERMISSIONS = [
  // Schools
  { name: 'schools.manage', description: 'Manage schools (Super Admin)' },
  // Users
  { name: 'users.manage', description: 'Manage users' },
  // Students
  { name: 'students.create', description: 'Create students' },
  { name: 'students.view', description: 'View students' },
  { name: 'students.edit', description: 'Edit students' },
  { name: 'students.delete', description: 'Delete students' },
  // Teachers
  { name: 'teachers.manage', description: 'Manage teachers' },
  // Classes
  { name: 'classes.manage', description: 'Manage classes' },
  // Subjects
  { name: 'subjects.manage', description: 'Manage subjects' },
  // Sessions
  { name: 'sessions.manage', description: 'Manage sessions and terms' },
  // Assessments
  { name: 'assessments.create', description: 'Create assessments' },
  { name: 'assessments.edit', description: 'Edit assessments' },
  { name: 'assessments.view', description: 'View assessments' },
  // Results
  { name: 'results.view', description: 'View results' },
  { name: 'results.publish', description: 'Publish/unpublish results' },
  // Reports
  { name: 'reports.view', description: 'View reports and broadsheets' },
  // Billing
  { name: 'billing.manage', description: 'Manage billing and subscriptions' },
  // Analytics
  { name: 'analytics.view', description: 'View analytics dashboard' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'schools.manage',
    'users.manage',
    'students.create',
    'students.view',
    'students.edit',
    'students.delete',
    'teachers.manage',
    'classes.manage',
    'subjects.manage',
    'sessions.manage',
    'assessments.create',
    'assessments.edit',
    'assessments.view',
    'results.view',
    'results.publish',
    'reports.view',
    'billing.manage',
    'analytics.view',
  ],
  SCHOOL_ADMIN: [
    'users.manage',
    'students.create',
    'students.view',
    'students.edit',
    'students.delete',
    'teachers.manage',
    'classes.manage',
    'subjects.manage',
    'sessions.manage',
    'assessments.create',
    'assessments.edit',
    'assessments.view',
    'results.view',
    'results.publish',
    'reports.view',
    'billing.manage',
    'analytics.view',
  ],
  TEACHER: [
    'students.view',
    'assessments.create',
    'assessments.edit',
    'assessments.view',
    'results.view',
    'reports.view',
    'analytics.view',
  ],
  STUDENT: ['assessments.view', 'results.view', 'reports.view'],
  PARENT: ['results.view', 'reports.view'],
};

export async function seedPermissions(prisma: PrismaClient) {
  console.log('Seeding permissions...');

  // 1. Upsert all permissions
  const permissionMap = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: { name: perm.name, description: perm.description },
    });
    permissionMap.set(perm.name, record.id);
  }

  // 2. Find all schools
  const schools = await prisma.school.findMany();
  console.log(`Found ${schools.length} school(s) for role seeding`);

  // 3. For each school, find or create roles and assign permissions
  for (const school of schools) {
    for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
      // Find or create the role
      let role = await prisma.role.findFirst({
        where: { schoolId: school.id, name: roleName },
      });
      if (!role) {
        role = await prisma.role.create({
          data: {
            schoolId: school.id,
            name: roleName,
            description: getRoleDescription(roleName),
          },
        });
        console.log(`Created role "${roleName}" for school ${school.name}`);
      }

      // Assign permissions to the role
      for (const permName of permNames) {
        const permissionId = permissionMap.get(permName);
        if (!permissionId) {
          console.warn(`Permission "${permName}" not found, skipping`);
          continue;
        }
        try {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId,
            },
          });
        } catch (e) {
          // Ignore unique constraint errors from concurrent runs
        }
      }
    }
  }

  // Also handle SUPER_ADMIN role where schoolId is null (global)
  let superAdminRole = await prisma.role.findFirst({
    where: { schoolId: null, name: 'SUPER_ADMIN' },
  });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        schoolId: null,
        name: 'SUPER_ADMIN',
        description: 'System-wide super administrator',
      },
    });
  }

  // Assign all permissions to global SUPER_ADMIN
  for (const perm of PERMISSIONS) {
    const permissionId = permissionMap.get(perm.name);
    if (!permissionId) continue;
    try {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId,
        },
      });
    } catch (e) {
      // Ignore
    }
  }

  console.log('Permissions seeding complete!');
}

function getRoleDescription(roleName: string): string {
  const descriptions: Record<string, string> = {
    SUPER_ADMIN: 'System-wide super administrator',
    SCHOOL_ADMIN: 'School administrator with full school-level access',
    TEACHER: 'Teacher with subject and assessment management',
    STUDENT: 'Student with view-only access to results',
    PARENT: 'Parent with view-only access to wards results',
  };
  return descriptions[roleName] || roleName;
}
