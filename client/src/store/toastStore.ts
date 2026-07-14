import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (type: 'success' | 'error', message: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));