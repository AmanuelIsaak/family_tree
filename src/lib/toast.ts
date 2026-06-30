import { writable } from 'svelte/store';

export interface ToastMsg {
  id: number;
  text: string;
  kind: 'info' | 'success' | 'error';
}

export const toasts = writable<ToastMsg[]>([]);

let nextId = 0;

export function toast(text: string, kind: ToastMsg['kind'] = 'info', ms = 2600): void {
  const id = nextId++;
  toasts.update((list) => [...list, { id, text, kind }]);
  setTimeout(() => {
    toasts.update((list) => list.filter((t) => t.id !== id));
  }, ms);
}
