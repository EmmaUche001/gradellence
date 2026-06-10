import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { StudentsListPage } from '../features/students/pages/StudentsListPage';
import { StudentFormPage } from '../features/students/pages/StudentFormPage';
import { TeachersListPage } from '../features/teachers/pages/TeachersListPage';
import { TeacherFormPage } from '../features/teachers/pages/TeacherFormPage';
import { ClassesListPage } from '../features/classes/pages/ClassesListPage';
import { ClassFormPage } from '../features/classes/pages/ClassFormPage';
import { SubjectsListPage } from '../features/subjects/pages/SubjectsListPage';
import { SubjectFormPage } from '../features/subjects/pages/SubjectFormPage';
import { SessionsListPage } from '../features/sessions/pages/SessionsListPage';
import { SessionFormPage } from '../features/sessions/pages/SessionFormPage';
import { EnrollmentsListPage } from '../features/enrollments/pages/EnrollmentsListPage';
import { EnrollmentFormPage } from '../features/enrollments/pages/EnrollmentFormPage';
import { BulkEnrollmentPage } from '../features/enrollments/pages/BulkEnrollmentPage';
import { AssessmentsListPage } from '../features/assessments/pages/AssessmentsListPage';
import { AssessmentFormPage } from '../features/assessments/pages/AssessmentFormPage';
import { ResultsListPage } from '../features/results/pages/ResultsListPage';
import { BroadsheetPage } from '../features/results/pages/BroadsheetPage';
import { GradeScalesListPage } from '../features/grade-scales/pages/GradeScalesListPage';
import { GradeScaleFormPage } from '../features/grade-scales/pages/GradeScaleFormPage';

export function Routes() {
  const { isAuthenticated } = useAuthStore();

  return (
    <RouterRoutes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />}
      />
      <Route
        path="/register"
        element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />}
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}
      >
        <Route index element={<DashboardPage />} />
        <Route path="students" element={<StudentsListPage />} />
        <Route path="students/new" element={<StudentFormPage />} />
        <Route path="students/:id/edit" element={<StudentFormPage />} />
        <Route path="teachers" element={<TeachersListPage />} />
        <Route path="teachers/new" element={<TeacherFormPage />} />
        <Route path="teachers/:id/edit" element={<TeacherFormPage />} />
        <Route path="classes" element={<ClassesListPage />} />
        <Route path="classes/new" element={<ClassFormPage />} />
        <Route path="classes/:id/edit" element={<ClassFormPage />} />
        <Route path="subjects" element={<SubjectsListPage />} />
        <Route path="subjects/new" element={<SubjectFormPage />} />
        <Route path="subjects/:id/edit" element={<SubjectFormPage />} />
        <Route path="sessions" element={<SessionsListPage />} />
        <Route path="sessions/new" element={<SessionFormPage />} />
        <Route path="sessions/:id/edit" element={<SessionFormPage />} />
        <Route path="enrollments" element={<EnrollmentsListPage />} />
        <Route path="enrollments/new" element={<EnrollmentFormPage />} />
        <Route path="enrollments/bulk" element={<BulkEnrollmentPage />} />
        <Route path="assessments" element={<AssessmentsListPage />} />
        <Route path="assessments/new" element={<AssessmentFormPage />} />
        <Route path="assessments/:id/edit" element={<AssessmentFormPage />} />
        <Route path="results" element={<ResultsListPage />} />
        <Route path="results/broadsheet" element={<BroadsheetPage />} />
        <Route path="grade-scales" element={<GradeScalesListPage />} />
        <Route path="grade-scales/new" element={<GradeScaleFormPage />} />
        <Route path="grade-scales/:id/edit" element={<GradeScaleFormPage />} />
      </Route>

      {/* Also accessible without /dashboard prefix */}
      <Route
        element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}
      >
        <Route path="students" element={<StudentsListPage />} />
        <Route path="students/new" element={<StudentFormPage />} />
        <Route path="students/:id/edit" element={<StudentFormPage />} />
        <Route path="teachers" element={<TeachersListPage />} />
        <Route path="teachers/new" element={<TeacherFormPage />} />
        <Route path="teachers/:id/edit" element={<TeacherFormPage />} />
        <Route path="classes" element={<ClassesListPage />} />
        <Route path="classes/new" element={<ClassFormPage />} />
        <Route path="classes/:id/edit" element={<ClassFormPage />} />
        <Route path="subjects" element={<SubjectsListPage />} />
        <Route path="subjects/new" element={<SubjectFormPage />} />
        <Route path="subjects/:id/edit" element={<SubjectFormPage />} />
        <Route path="sessions" element={<SessionsListPage />} />
        <Route path="sessions/new" element={<SessionFormPage />} />
        <Route path="sessions/:id/edit" element={<SessionFormPage />} />
        <Route path="enrollments" element={<EnrollmentsListPage />} />
        <Route path="enrollments/new" element={<EnrollmentFormPage />} />
        <Route path="enrollments/bulk" element={<BulkEnrollmentPage />} />
        <Route path="assessments" element={<AssessmentsListPage />} />
        <Route path="assessments/new" element={<AssessmentFormPage />} />
        <Route path="assessments/:id/edit" element={<AssessmentFormPage />} />
        <Route path="results" element={<ResultsListPage />} />
        <Route path="results/broadsheet" element={<BroadsheetPage />} />
        <Route path="grade-scales" element={<GradeScalesListPage />} />
        <Route path="grade-scales/new" element={<GradeScaleFormPage />} />
        <Route path="grade-scales/:id/edit" element={<GradeScaleFormPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
    </RouterRoutes>
  );
}
