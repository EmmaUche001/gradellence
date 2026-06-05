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
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
    </RouterRoutes>
  );
}
