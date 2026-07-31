import { Routes as RouterRoutes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
import { DashboardLayout } from '../layouts/DashboardLayout';
import SuperAdminLayout from '../layouts/SuperAdminLayout';
import SuperAdminGuard from '../components/guards/SuperAdminGuard';
import SuperAdminDashboard from '../features/super-admin/pages/SuperAdminDashboard';
import SchoolsPage from '../features/super-admin/pages/SchoolsPage';
import SuperAdminSubscriptionsPage from '../features/super-admin/pages/SubscriptionsPage';
import ActiveSubscriptionsPage from '../features/super-admin/pages/ActiveSubscriptionsPage';
import PlatformAnalyticsPage from '../features/super-admin/pages/PlatformAnalyticsPage';
import PlatformAuditLogsPage from '../features/super-admin/pages/PlatformAuditLogsPage';
import { SuperAdminLoginPage } from '../features/super-admin/pages/SuperAdminLoginPage';
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
import { SubscriptionsPage } from '../features/subscriptions/pages/SubscriptionsPage';
import { UsersListPage } from '../features/users/pages/UsersListPage';
import { RolesListPage } from '../features/roles/pages/RolesListPage';
import { RoleFormPage } from '../features/roles/pages/RoleFormPage';
import { AuditLogsListPage } from '../features/audit-logs/pages/AuditLogsListPage';
import { AnnouncementsPage } from '../features/announcements/pages/AnnouncementsPage';
import { BillingPage } from '../features/billing/pages/BillingPage';
import { SchoolSettingsPage } from '../features/schools/pages/SchoolSettingsPage';
import { AnalyticsDashboardPage } from '../features/analytics/pages/AnalyticsDashboardPage';
import ParentLoginPage from '../features/parents/pages/ParentLoginPage';
import ParentRegisterPage from '../features/parents/pages/ParentRegisterPage';
import ParentDashboard from '../features/parents/pages/ParentDashboard';
import StudentResultsPage from '../features/parents/pages/StudentResultsPage';
import StudentAnalyticsPage from '../features/parents/pages/StudentAnalyticsPage';
import ParentRoute from '../features/parents/guards/ParentRoute';
import { StudentImportPage } from '../features/students/pages/StudentImportPage';
import { ScoreImportPage } from '../features/assessments/pages/ScoreImportPage';
import { ScoreEntryPage } from '../features/assessments/pages/ScoreEntryPage';
import { MyResultsPage } from '../features/results/pages/MyResultsPage';

function RedirectToDashboard() {
  const location = useLocation();
  return <Navigate to={`/dashboard${location.pathname}`} replace />;
}

const routes = [
  { path: 'dashboard', element: <DashboardPage />, index: true },
  { path: 'students', element: <StudentsListPage /> },
  { path: 'students/new', element: <StudentFormPage /> },
  { path: 'students/import', element: <StudentImportPage /> },
  { path: 'students/:id/edit', element: <StudentFormPage /> },
  { path: 'teachers', element: <TeachersListPage /> },
  { path: 'teachers/new', element: <TeacherFormPage /> },
  { path: 'teachers/:id/edit', element: <TeacherFormPage /> },
  { path: 'classes', element: <ClassesListPage /> },
  { path: 'classes/new', element: <ClassFormPage /> },
  { path: 'classes/:id/edit', element: <ClassFormPage /> },
  { path: 'subjects', element: <SubjectsListPage /> },
  { path: 'subjects/new', element: <SubjectFormPage /> },
  { path: 'subjects/:id/edit', element: <SubjectFormPage /> },
  { path: 'sessions', element: <SessionsListPage /> },
  { path: 'sessions/new', element: <SessionFormPage /> },
  { path: 'sessions/:id/edit', element: <SessionFormPage /> },
  { path: 'enrollments', element: <EnrollmentsListPage /> },
  { path: 'enrollments/new', element: <EnrollmentFormPage /> },
  { path: 'enrollments/bulk', element: <BulkEnrollmentPage /> },
  { path: 'assessments', element: <AssessmentsListPage /> },
  { path: 'assessments/new', element: <AssessmentFormPage /> },
  { path: 'assessments/import', element: <ScoreImportPage /> },
  { path: 'assessments/:id/edit', element: <AssessmentFormPage /> },
  { path: 'results', element: <ResultsListPage /> },
  { path: 'results/broadsheet', element: <BroadsheetPage /> },
  { path: 'grade-scales', element: <GradeScalesListPage /> },
  { path: 'grade-scales/new', element: <GradeScaleFormPage /> },
  { path: 'grade-scales/:id/edit', element: <GradeScaleFormPage /> },
  { path: 'subscriptions', element: <SubscriptionsPage /> },
  { path: 'users', element: <UsersListPage /> },
  { path: 'roles', element: <RolesListPage /> },
  { path: 'roles/new', element: <RoleFormPage /> },
  { path: 'roles/:id/edit', element: <RoleFormPage /> },
  { path: 'audit-logs', element: <AuditLogsListPage /> },
  { path: 'announcements', element: <AnnouncementsPage /> },
  { path: 'billing', element: <BillingPage /> },
  { path: 'settings', element: <SchoolSettingsPage /> },
  { path: 'analytics', element: <AnalyticsDashboardPage /> },
  { path: 'assessments/score-entry', element: <ScoreEntryPage /> },
  { path: 'my-results', element: <MyResultsPage /> },
];

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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Hidden Super Admin Login */}
      <Route path="/super-admin-login" element={<SuperAdminLoginPage />} />

      {/* Protected Routes — nested under /dashboard */}
      <Route
        path="/dashboard"
        element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}
      >
        <Route index element={<DashboardPage />} />
        {routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>

      {/* Root-level aliases for direct access without /dashboard prefix */}
      <Route
        element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}
      >
        {routes.map((r) => (
          <Route key={r.path} path={r.path} element={<RedirectToDashboard />} />
        ))}
      </Route>

      {/* Parent Portal Routes */}
      <Route path="/parent/login" element={<ParentLoginPage />} />
      <Route path="/parent/register" element={<ParentRegisterPage />} />
      <Route element={<ParentRoute />}>
        <Route path="/parent/dashboard" element={<ParentDashboard />} />
        <Route path="/parent/students/:studentId/results" element={<StudentResultsPage />} />
        <Route path="/parent/students/:studentId/analytics" element={<StudentAnalyticsPage />} />
      </Route>

      {/* Import Routes */}

      {/* Super Admin Routes */}
      <Route element={<SuperAdminGuard />}>
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="schools" element={<SchoolsPage />} />
          <Route path="subscriptions" element={<SuperAdminSubscriptionsPage />} />
          <Route path="active-subs" element={<ActiveSubscriptionsPage />} />
          <Route path="analytics" element={<PlatformAnalyticsPage />} />
          <Route path="audit-logs" element={<PlatformAuditLogsPage />} />
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
    </RouterRoutes>
  );
}