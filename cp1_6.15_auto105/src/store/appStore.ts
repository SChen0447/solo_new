import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { AppState, AppActions, FileItem, MAX_FILE_SIZE } from '../types';

type Store = AppState & AppActions;

const initialState: AppState = {
  roomCode: null,
  connectionStatus: 'idle',
  peerRole: null,
  senderFiles: [],
  receiverFiles: [],
  incomingRequest: null,
  errorMessage: null,
  successMessage: null
};

export const useAppStore = create<Store>((set, get) => ({
  ...initialState,

  setRoomCode: (code) => set({ roomCode: code }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setPeerRole: (role) => set({ peerRole: role }),

  addSenderFiles: (files) => {
    const validFiles: FileItem[] = [];
    let errorMsg: string | null = null;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errorMsg = `文件 "${file.name}" 超过最大限制 500MB`;
        continue;
      }
      const id = uuidv4();
      validFiles.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        status: 'pending',
        progress: 0,
        speed: 0,
        transferredBytes: 0
      });
    }

    if (errorMsg) {
      set({ errorMessage: errorMsg });
      setTimeout(() => {
        if (get().errorMessage === errorMsg) {
          set({ errorMessage: null });
        }
      }, 4000);
    }

    if (validFiles.length > 0) {
      set((state) => ({ senderFiles: [...state.senderFiles, ...validFiles] }));
    }
  },

  removeSenderFile: (id) =>
    set((state) => ({ senderFiles: state.senderFiles.filter((f) => f.id !== id) })),

  clearSenderFiles: () => set({ senderFiles: [] }),

  updateSenderFile: (id, updates) =>
    set((state) => ({
      senderFiles: state.senderFiles.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      )
    })),

  addReceiverFile: (file) =>
    set((state) => ({ receiverFiles: [...state.receiverFiles, file] })),

  updateReceiverFile: (id, updates) =>
    set((state) => ({
      receiverFiles: state.receiverFiles.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      )
    })),

  clearReceiverFiles: () => set({ receiverFiles: [] }),

  setIncomingRequest: (req) => set({ incomingRequest: req }),

  setError: (msg) => {
    set({ errorMessage: msg });
    if (msg) {
      setTimeout(() => {
        if (get().errorMessage === msg) {
          set({ errorMessage: null });
        }
      }, 4000);
    }
  },

  setSuccess: (msg) => {
    set({ successMessage: msg });
    if (msg) {
      setTimeout(() => {
        if (get().successMessage === msg) {
          set({ successMessage: null });
        }
      }, 3000);
    }
  },

  resetAll: () =>
    set({
      senderFiles: [],
      receiverFiles: [],
      incomingRequest: null,
      errorMessage: null,
      successMessage: null
    })
}));
