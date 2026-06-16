export const PERMISSIONS = {
  // School permissions
  SCHOOL_CREATE: 'school.create',
  SCHOOL_READ: 'school.read',
  SCHOOL_UPDATE: 'school.update',
  SCHOOL_DELETE: 'school.delete',

  // User permissions
  USER_CREATE: 'user.create',
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',

  // Student permissions
  STUDENT_CREATE: 'student.create',
  STUDENT_READ: 'student.read',
  STUDENT_UPDATE: 'student.update',
  STUDENT_DELETE: 'student.delete',

  // Teacher permissions
  TEACHER_CREATE: 'teacher.create',
  TEACHER_READ: 'teacher.read',
  TEACHER_UPDATE: 'teacher.update',
  TEACHER_DELETE: 'teacher.delete',

  // Class permissions
  CLASS_CREATE: 'class.create',
  CLASS_READ: 'class.read',
  CLASS_UPDATE: 'class.update',
  CLASS_DELETE: 'class.delete',

  // Subject permissions
  SUBJECT_CREATE: 'subject.create',
  SUBJECT_READ: 'subject.read',
  SUBJECT_UPDATE: 'subject.update',
  SUBJECT_DELETE: 'subject.delete',

  // Result permissions
  RESULT_CREATE: 'result.create',
  RESULT_READ: 'result.read',
  RESULT_UPDATE: 'result.update',
  RESULT_DELETE: 'result.delete',
  RESULT_PUBLISH: 'result.publish',

  // Assessment permissions
  ASSESSMENT_CREATE: 'assessment.create',
  ASSESSMENT_READ: 'assessment.read',
  ASSESSMENT_UPDATE: 'assessment.update',
  ASSESSMENT_DELETE: 'assessment.delete',
} as const;

export type PermissionType = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
