import { create } from 'zustand';

// Design system: 4 toast types, 4-second auto-dismiss, top-right position
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const DURATION_MS = 4000; // design system: 4 seconds

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (type, message, title) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((state) => ({ toasts: [...state.toasts, { id, type, message, title }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, DURATION_MS);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
