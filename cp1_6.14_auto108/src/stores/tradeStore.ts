import { create } from 'zustand';
import axios from 'axios';
import type { Trade, TradeStatus } from '../types';

interface TradeState {
  trades: Trade[];
  loading: boolean;
  error: string | null;
  fetchTrades: () => Promise<void>;
  createTrade: (itemId: string, myItemId: string) => Promise<Trade>;
  acceptTrade: (id: string) => Promise<void>;
  rejectTrade: (id: string) => Promise<void>;
  cancelTrade: (id: string)