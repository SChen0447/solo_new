import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../store/appStore';
import { FileItem, IncomingFileRequest, CHUNK_SIZE } from '../types';
import { sliceFileIntoChunks, assembleChunksToBlob, triggerFileDownload } from '../utils';

interface SignalMessage {
  to?: string;
  from?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface DataChannelMessage {
  type: 'file-request' | 'file-accept' | 'file-reject' | 'chunk' | 'chunk-ack' | 'file-complete' | 'ping' | 'pong';
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  totalChunks?: number;
  chunkIndex?: number;
  chunkData?: ArrayBuffer;
  payload?: any;
}

const SIGNALING_URL = 'http://localhost:3001';
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

class ConnectionManager {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private peerSocketId: string | null = null;
  private isHost: boolean = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private transferState = new Map<string, {
    chunks?: ArrayBuffer[];
    receivedChunks?: ArrayBuffer[];
    currentChunk?: number;
    lastUpdateTime?: number;
    lastTransferred?: number;
    speedWindow?: number[];
  }>();
  private chunkSendQueue: Array<{
    fileId: string;
    chunkIndex: number;
    data: ArrayBuffer;
  }> = [];
  private isSending: boolean = false;

  connectSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(SIGNALING_URL, {
          transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
          console.log('信令服务器已连接');
          resolve();
        });

        this.socket.on('connect_error', (err) => {
          console.error('信令连接失败:', err);
          useAppStore.getState().setError('无法连接到信令服务器');
          reject(err);
        });

        this.socket.on('room-created', ({ roomCode }: { roomCode: string }) => {
          console.log('房间已创建:', roomCode);
          useAppStore.getState().setRoomCode(roomCode);
          useAppStore.getState().setPeerRole('host');
          this.isHost = true;
        });

        this.socket.on('room-joined', ({ roomCode }: { roomCode: string }) => {
          console.log('已加入房间:', roomCode);
          useAppStore.getState().setRoomCode(roomCode);
          useAppStore.getState().setPeerRole('guest');
          this.isHost = false;
        });

        this.socket.on('room-not-found', ({ roomCode }: { roomCode: string }) => {
          useAppStore.getState().setError(`房间 ${roomCode} 不存在`);
        });

        this.socket.on('room-full', ({ roomCode }: { roomCode: string }) => {
          useAppStore.getState().setError(`房间 ${roomCode} 已满`);
        });

        this.socket.on('peer-connected', ({ role }: { role: 'host' | 'guest' }) => {
          console.log('对等方已连接，角色:', role);
          if (role === 'guest') {
            this.isHost = true;
            this.createPeerConnection(true);
          }
        });

        this.socket.on('peer-disconnected', () => {
          console.log('对等方已断开');
          useAppStore.getState().setConnectionStatus('disconnected');
          this.cleanupPeerConnection();
        });

        this.socket.on('offer', async ({ from, offer }: SignalMessage) => {
          console.log('收到Offer');
          if (!this.peerConnection) {
            this.createPeerConnection(false);
          }
          this.peerSocketId = from!;
          if (this.peerConnection && offer) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            for (const cand of this.pendingCandidates) {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
            }
            this.pendingCandidates = [];
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.socket?.emit('answer', { to: from, answer });
          }
        });

        this.socket.on('answer', async ({ from, answer }: SignalMessage) => {
          console.log('收到Answer');
          this.peerSocketId = from!;
          if (this.peerConnection && answer) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            for (const cand of this.pendingCandidates) {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
            }
            this.pendingCandidates = [];
          }
        });

        this.socket.on('ice-candidate', async ({ candidate }: SignalMessage) => {
          if (!candidate) return;
          if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn('添加ICE候选失败:', e);
            }
          } else {
            this.pendingCandidates.push(candidate);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  createRoom(): void {
    if (!this.socket) {
      this.connectSignaling().then(() => {
        this.socket?.emit('create-room');
      });
    } else {
      this.socket.emit('create-room');
    }
  }

  joinRoom(roomCode: string): void {
    if (!this.socket) {
      this.connectSignaling().then(() => {
        this.socket?.emit('join-room', { roomCode });
      });
    } else {
      this.socket.emit('join-room', { roomCode });
    }
  }

  private createPeerConnection(initiator: boolean): void {
    console.log('创建PeerConnection, initiator:', initiator);
    useAppStore.getState().setConnectionStatus('connecting');

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.peerSocketId) {
        this.socket?.emit('ice-candidate', {
          to: this.peerSocketId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('连接状态:', this.peerConnection?.connectionState);
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        useAppStore.getState().setConnectionStatus('connected');
      } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        useAppStore.getState().setConnectionStatus('disconnected');
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      console.log('收到DataChannel');
      this.setupDataChannel(event.channel);
    };

    if (initiator) {
      const channel = this.peerConnection.createDataChannel('file-transfer', {
        ordered: true,
        maxRetransmits: 3
      });
      this.setupDataChannel(channel);

      this.peerConnection.createOffer()
        .then((offer) => this.peerConnection!.setLocalDescription(offer))
        .then(() => {
          setTimeout(() => {
            this.socket?.emit('offer', {
              to: this.peerSocketId,
              offer: this.peerConnection!.localDescription
            });
          }, 100);
        });
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log('DataChannel已打开');
      useAppStore.getState().setConnectionStatus('connected');
    };

    channel.onclose = () => {
      console.log('DataChannel已关闭');
      useAppStore.getState().setConnectionStatus('disconnected');
    };

    channel.onerror = (e) => {
      console.error('DataChannel错误:', e);
    };

    channel.onmessage = (event) => {
      this.handleDataChannelMessage(event.data);
    };
  }

  private handleDataChannelMessage(data: any): void {
    try {
      if (typeof data === 'string') {
        const msg: DataChannelMessage = JSON.parse(data);
        switch (msg.type) {
          case 'file-request':
            this.handleFileRequest(msg);
            break;
          case 'file-accept':
            this.handleFileAccept(msg);
            break;
          case 'file-reject':
            this.handleFileReject(msg);
            break;
          case 'chunk-ack':
            this.handleChunkAck(msg);
            break;
          case 'file-complete':
            this.handleFileComplete(msg);
            break;
          case 'ping':
            this.sendJson({ type: 'pong' });
            break;
        }
      } else if (data instanceof ArrayBuffer) {
        this.handleChunkData(data);
      }
    } catch (e) {
      console.error('处理消息失败:', e);
    }
  }

  private sendJson(msg: DataChannelMessage): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(msg));
    }
  }

  private sendBinary(data: ArrayBuffer): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(data);
    }
  }

  async sendFile(fileItem: FileItem): Promise<void> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      useAppStore.getState().setError('连接未就绪，请稍后再试');
      return;
    }
    if (!fileItem.file) return;

    const { updateSenderFile, setError } = useAppStore.getState();

    updateSenderFile(fileItem.id, { status: 'requesting' });

    const chunks = await sliceFileIntoChunks(fileItem.file);
    this.transferState.set(fileItem.id, {
      chunks,
      currentChunk: 0,
      lastUpdateTime: Date.now(),
      lastTransferred: 0,
      speedWindow: []
    });

    const ext = fileItem.name.includes('.')
      ? fileItem.name.split('.').pop()!.toLowerCase()
      : fileItem.type.split('/')[1] || 'bin';

    this.sendJson({
      type: 'file-request',
      fileId: fileItem.id,
      fileName: fileItem.name,
      fileSize: fileItem.size,
      fileType: ext,
      totalChunks: chunks.length
    });
  }

  private handleFileRequest(msg: DataChannelMessage): void {
    const { fileId, fileName, fileSize, fileType, totalChunks } = msg;
    if (!fileId || !fileName) return;

    const request: IncomingFileRequest = {
      fileId,
      name: fileName,
      size: fileSize || 0,
      type: fileType || '',
      totalChunks: totalChunks || 0
    };
    useAppStore.getState().setIncomingRequest(request);
  }

  acceptFile(request: IncomingFileRequest): void {
    const { addReceiverFile, setIncomingRequest } = useAppStore.getState();

    const fileItem: FileItem = {
      id: request.fileId,
      name: request.name,
      size: request.size,
      type: request.type,
      receivedChunks: new Array(request.totalChunks),
      totalChunks: request.totalChunks,
      currentChunk: 0,
      transferredBytes: 0,
      status: 'transferring',
      progress: 0,
      speed: 0
    };

    addReceiverFile(fileItem);
    setIncomingRequest(null);

    this.transferState.set(request.fileId, {
      receivedChunks: fileItem.receivedChunks,
      currentChunk: 0,
      lastUpdateTime: Date.now(),
      lastTransferred: 0,
      speedWindow: []
    });

    this.sendJson({
      type: 'file-accept',
      fileId: request.fileId
    });
  }

  rejectFile(request: IncomingFileRequest): void {
    useAppStore.getState().setIncomingRequest(null);
    this.sendJson({
      type: 'file-reject',
      fileId: request.fileId
    });
  }

  private handleFileAccept(msg: DataChannelMessage): void {
    const { fileId } = msg;
    if (!fileId) return;

    const state = this.transferState.get(fileId);
    if (!state) return;

    const { updateSenderFile } = useAppStore.getState();
    updateSenderFile(fileId, { status: 'transferring' });

    state.currentChunk = 0;
    this.chunkSendQueue = [];

    for (let i = 0; i < (state.chunks?.length || 0); i++) {
      this.chunkSendQueue.push({
        fileId,
        chunkIndex: i,
        data: state.chunks![i]
      });
    }

    this.processSendQueue();
  }

  private handleFileReject(msg: DataChannelMessage): void {
    const { fileId } = msg;
    if (!fileId) return;

    const { updateSenderFile, setError } = useAppStore.getState();
    updateSenderFile(fileId, { status: 'cancelled' });
    this.transferState.delete(fileId);
    setError('对方拒绝了文件接收');
  }

  private processSendQueue(): void {
    if (this.isSending) return;
    this.isSending = true;

    const sendNext = () => {
      if (this.chunkSendQueue.length === 0) {
        this.isSending = false;
        return;
      }

      const item = this.chunkSendQueue.shift()!;
      const state = this.transferState.get(item.fileId);
      if (!state) {
        this.isSending = false;
        return;
      }

      const header = new Uint8Array(20);
      const fileIdBytes = new TextEncoder().encode(item.fileId.padEnd(16, '\0').slice(0, 16));
      header.set(fileIdBytes, 0);
      const view = new DataView(header.buffer);
      view.setUint32(16, item.chunkIndex, false);

      const combined = new Uint8Array(header.length + item.data.byteLength);
      combined.set(header, 0);
      combined.set(new Uint8Array(item.data), header.length);

      try {
        this.sendBinary(combined.buffer);

        state.currentChunk = item.chunkIndex + 1;
        state.lastTransferred = (state.lastTransferred || 0) + item.data.byteLength;

        const now = Date.now();
        const elapsed = (now - (state.lastUpdateTime || now)) / 1000;
        if (elapsed >= 0.2) {
          const speed = (state.lastTransferred! / (elapsed || 1));
          state.speedWindow = state.speedWindow || [];
          state.speedWindow.push(speed);
          if (state.speedWindow.length > 5) state.speedWindow.shift();
          const avgSpeed = state.speedWindow.reduce((a, b) => a + b, 0) / state.speedWindow.length;

          const totalChunks = state.chunks?.length || 1;
          const progress = Math.min(100, ((state.currentChunk! / totalChunks) * 100));
          const transferred = state.currentChunk! * CHUNK_SIZE;

          useAppStore.getState().updateSenderFile(item.fileId, {
            progress,
            transferredBytes: Math.min(transferred, useAppStore.getState().senderFiles.find(f => f.id === item.fileId)?.size || 0),
            speed: avgSpeed
          });

          state.lastUpdateTime = now;
          state.lastTransferred = 0;
        }

        setTimeout(sendNext, 0);
      } catch (e) {
        console.error('发送分片失败:', e);
        this.chunkSendQueue.unshift(item);
        this.isSending = false;
        setTimeout(() => this.processSendQueue(), 100);
      }
    };

    sendNext();
  }

  private handleChunkData(buffer: ArrayBuffer): void {
    if (buffer.byteLength < 20) return;

    const header = new Uint8Array(buffer, 0, 20);
    const fileId = new TextDecoder().decode(header.slice(0, 16)).replace(/\0/g, '');
    const view = new DataView(buffer);
    const chunkIndex = view.getUint32(16, false);
    const chunkData = buffer.slice(20);

    const state = this.transferState.get(fileId);
    if (!state || !state.receivedChunks) return;

    state.receivedChunks[chunkIndex] = chunkData;
    state.currentChunk = (state.currentChunk || 0) + 1;
    state.lastTransferred = (state.lastTransferred || 0) + chunkData.byteLength;

    const now = Date.now();
    const elapsed = (now - (state.lastUpdateTime || now)) / 1000;
    if (elapsed >= 0.2 || state.currentChunk >= (state.receivedChunks.length)) {
      const speed = state.lastTransferred! / (elapsed || 1);
      state.speedWindow = state.speedWindow || [];
      state.speedWindow.push(speed);
      if (state.speedWindow.length > 5) state.speedWindow.shift();
      const avgSpeed = state.speedWindow.reduce((a, b) => a + b, 0) / state.speedWindow.length;

      const totalChunks = state.receivedChunks.length;
      const receivedCount = state.receivedChunks.filter(c => c).length;
      const progress = Math.min(100, (receivedCount / totalChunks) * 100);
      const file = useAppStore.getState().receiverFiles.find(f => f.id === fileId);
      const transferred = Math.min(receivedCount * CHUNK_SIZE, file?.size || 0);

      useAppStore.getState().updateReceiverFile(fileId, {
        progress,
        transferredBytes: transferred,
        speed: avgSpeed
      });

      state.lastUpdateTime = now;
      state.lastTransferred = 0;
    }

    this.sendJson({
      type: 'chunk-ack',
      fileId,
      chunkIndex
    });

    const allReceived = state.receivedChunks.every(c => c);
    if (allReceived) {
      this.completeReceive(fileId);
    }
  }

  private handleChunkAck(msg: DataChannelMessage): void {
    const { fileId, chunkIndex } = msg;
    if (!fileId || chunkIndex === undefined) return;

    const state = this.transferState.get(fileId);
    if (!state) return;

    const totalChunks = state.chunks?.length || 0;
    if (chunkIndex + 1 >= totalChunks) {
      const { updateSenderFile, setSuccess } = useAppStore.getState();
      const file = useAppStore.getState().senderFiles.find(f => f.id === fileId);
      updateSenderFile(fileId, {
        status: 'completed',
        progress: 100,
        transferredBytes: file?.size,
        speed: 0
      });
      setSuccess('文件已送达');
      this.transferState.delete(fileId);

      this.sendJson({
        type: 'file-complete',
        fileId
      });
    }
  }

  private handleFileComplete(msg: DataChannelMessage): void {
    // noop
  }

  private completeReceive(fileId: string): void {
    const state = this.transferState.get(fileId);
    if (!state || !state.receivedChunks) return;

    const { receiverFiles, updateReceiverFile } = useAppStore.getState();
    const fileItem = receiverFiles.find(f => f.id === fileId);
    if (!fileItem) return;

    const mimeType = this.getMimeTypeFromExtension(fileItem.type);
    const blob = assembleChunksToBlob(state.receivedChunks, mimeType);

    updateReceiverFile(fileId, {
      status: 'completed',
      progress: 100,
      speed: 0
    });

    triggerFileDownload(blob, fileItem.name);
    this.transferState.delete(fileId);
  }

  private getMimeTypeFromExtension(ext: string): string {
    const map: Record<string, string> = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
      'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
      'mp4': 'video/mp4', 'webm': 'video/webm', 'mp3': 'audio/mpeg',
      'wav': 'audio/wav', 'pdf': 'application/pdf',
      'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'zip': 'application/zip', 'rar': 'application/x-rar-compressed',
      'txt': 'text/plain', 'html': 'text/html', 'css': 'text/css',
      'js': 'application/javascript', 'json': 'application/json'
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  saveReceivedFile(fileId: string): void {
    const state = this.transferState.get(fileId);
    const { receiverFiles } = useAppStore.getState();
    const fileItem = receiverFiles.find(f => f.id === fileId);
    if (!fileItem) return;

    if (state && state.receivedChunks) {
      const mimeType = this.getMimeTypeFromExtension(fileItem.type);
      const blob = assembleChunksToBlob(state.receivedChunks, mimeType);
      triggerFileDownload(blob, fileItem.name);
    }
  }

  private cleanupPeerConnection(): void {
    if (this.dataChannel) {
      try { this.dataChannel.close(); } catch (e) {}
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) {}
      this.peerConnection = null;
    }
    this.peerSocketId = null;
    this.pendingCandidates = [];
    this.chunkSendQueue = [];
    this.isSending = false;
    this.transferState.clear();
  }

  disconnect(): void {
    this.cleanupPeerConnection();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    const store = useAppStore.getState();
    store.setRoomCode(null);
    store.setPeerRole(null);
    store.setConnectionStatus('idle');
  }

  isConnected(): boolean {
    return this.dataChannel?.readyState === 'open';
  }
}

export const connectionManager = new ConnectionManager();
