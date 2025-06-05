// src/store/taskStore.ts
import { create } from 'zustand';
import { Task, TaskState } from '../types';
import { taskService } from '../services/taskService';
import { socketService } from '../services/socketService'; // For real-time updates

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  subscribedTaskIds: new Set<string>(),
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await taskService.getMyTasks(); // Add pagination if needed
      if (response.success && response.data) {
        set({ tasks: response.data, isLoading: false });
        // Automatically subscribe to updates for non-terminal tasks
        response.data.forEach(task => {
          if (task.status === 'pending' || task.status === 'processing' || task.status === 'queued') {
            get().subscribeToTask(task.id);
          }
        });
      } else {
        throw new Error(response.error || 'Failed to fetch tasks');
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  getTaskDetails: async (taskId: string): Promise<Task | null> => {
    // This can be used to refresh a single task or fetch one not in the list
    set(state => ({
        isLoading: state.tasks.find(t => t.id === taskId) ? false : true, // Only full load if not present
        error: null
    }));
    try {
      const response = await taskService.getTaskDetails(taskId);
      if (response.success && response.data) {
        const task = response.data;
        get().updateTaskInList(task); // Use common update/add logic
        set({ isLoading: false });
        return task;
      } else {
        throw new Error(response.error || `Failed to fetch task ${taskId}`);
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },

  updateTaskInList: (task: Task) => {
    set((state) => {
      const taskExists = state.tasks.some(t => t.id === task.id);
      let newTasks;
      if (taskExists) {
        newTasks = state.tasks.map(t => (t.id === task.id ? task : t));
      } else {
        newTasks = [...state.tasks, task];
      }
      // If task is now terminal, unsubscribe from updates
      if (task.status === 'completed' || task.status === 'failed') {
        if (state.subscribedTaskIds.has(task.id)) {
          // socketService.unsubscribeFromTask(task.id); // If backend needed specific unsubs
          const newSubscribedTaskIds = new Set(state.subscribedTaskIds);
          newSubscribedTaskIds.delete(task.id);
          return { tasks: newTasks, subscribedTaskIds: newSubscribedTaskIds };
        }
      }
      return { tasks: newTasks };
    });
  },

  subscribeToTask: (taskId: string) => {
    // The actual WebSocket event listener is global in socketService.
    // This store method just tracks which tasks the client is interested in.
    // If backend needed explicit per-task subscription messages via WebSocket,
    // socketService.subscribeToTask(taskId) would be called here.
    set(state => {
        if (state.subscribedTaskIds.has(taskId)) return {}; // Already subscribed
        const newSubscribedTaskIds = new Set(state.subscribedTaskIds);
        newSubscribedTaskIds.add(taskId);
        console.log(`Subscribed to updates for task (client-side): ${taskId}`);
        return { subscribedTaskIds: newSubscribedTaskIds };
    });
  },

  unsubscribeFromTask: (taskId: string) => {
    set(state => {
        if (!state.subscribedTaskIds.has(taskId)) return {};
        const newSubscribedTaskIds = new Set(state.subscribedTaskIds);
        newSubscribedTaskIds.delete(taskId);
        console.log(`Unsubscribed from updates for task (client-side): ${taskId}`);
        // socketService.unsubscribeFromTask(taskId); // If backend needed explicit unsubs
        return { subscribedTaskIds: newSubscribedTaskIds };
    });
  },
}));

// Initialize: Potentially fetch tasks when the store is first used or user logs in.
// This can be triggered from a component or App.tsx
// e.g., useEffect(() => { useTaskStore.getState().fetchTasks(); }, []);
