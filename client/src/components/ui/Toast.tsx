import { useToastStore } from '../../store/toastStore';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all animate-slide-in ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">
              {toast.type === 'success' ? '✓' : '✗'}
            </span>
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-3 text-white/80 hover:text-white"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}