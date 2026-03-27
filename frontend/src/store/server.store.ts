import { create } from 'zustand';
import { serverService } from '@/services/api';

interface Server {
  id: string;
  name?: string;
  publicIp: string;
  sshPort: number;
  status: 'online' | 'offline' | 'unknown';
  openclawStatus: 'running' | 'stopped' | 'error' | 'unknown';
}

interface ServerState {
  servers: Server[];
  selectedServer: Server | null;
  isLoading: boolean;

  fetchServers: () => Promise<void>;
  setSelectedServer: (server: Server | null) => void;
  addServer: (data: any) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  selectedServer: null,
  isLoading: false,

  fetchServers: async () => {
    set({ isLoading: true });
    try {
      const { data } = await serverService.list();
      set({ servers: data.data || [], isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch servers:', error);
    }
  },

  setSelectedServer: (server) => set({ selectedServer: server }),

  addServer: async (data) => {
    await serverService.add(data);
    await get().fetchServers();
  },

  deleteServer: async (id) => {
    await serverService.delete(id);
    await get().fetchServers();
  },
}));
