import { create } from 'zustand';
import type { Task } from '@shared/types';

interface TasksState {
  tasks: Task[];
  loaded: boolean;
  load: () => Promise<void>;
  apply: (tasks: Task[]) => void;
}

export const useTasksStore = create<TasksState>((set) => ({
  tasks: [],
  loaded: false,
  load: async () => set({ tasks: await window.api.tasks.list('all'), loaded: true }),
  apply: (tasks) => set({ tasks, loaded: true }),
}));
