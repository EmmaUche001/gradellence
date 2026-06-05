import { useAuthStore } from '@store/authStore';

export function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to SRMS</h2>
        <p className="text-gray-600 mb-4">
          Hello, {user?.firstName} {user?.lastName}!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900">Students</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900">Teachers</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900">Classes</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}