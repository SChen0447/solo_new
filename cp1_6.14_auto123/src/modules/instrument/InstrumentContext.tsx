import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';
import type { Instrument, InstrumentReview, RenovationRecord, InstrumentCategory, RenovationType, RenovationPhoto } from '../../types';
import { CATEGORY_PRESET_HOURS } from '../../types';

interface InstrumentContextType {
  instruments: Instrument[];
  loading: boolean;
  addInstrument: (data: Omit<Instrument, 'id' | 'renovations' | 'reviews' | 'listed' | 'sold' | 'createdAt' | 'updatedAt'>) => Promise<Instrument>;
  updateInstrument: (id: string, data: Partial<Instrument>) => Promise<void>;
  addRenovation: (instrumentId: string, data: { type: RenovationType; materials: string; hours: number; photos: RenovationPhoto[] }) => Promise<void>;
  addReview: (instrumentId: string, data: Omit<InstrumentReview, 'id' | 'createdAt'>) => Promise<void>;
  getInstrumentById: (id: string) => Instrument | undefined;
  getProgress: (instrument: Instrument) => number;
  getProgressColor: (progress: number) => string;
  getAverageRating: (instrument: Instrument) => number;
  uploadPhotos: (files: File[]) => Promise<string[]>;
  generateThumbnail: (file: File) => Promise<string>;
}

const InstrumentContext = createContext<InstrumentContextType | undefined>(undefined);

export const useInstrument = () => {
  const ctx = useContext(InstrumentContext);
  if (!ctx) throw new Error('useInstrument must be used within InstrumentProvider');
  return ctx;
};

export const InstrumentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/instruments');
        setInstruments(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getProgress = useCallback((instrument: Instrument): number => {
    const totalHours = instrument.renovations.reduce((s, r) => s + r.hours, 0);
    const preset = CATEGORY_PRESET_HOURS[instrument.category] || 25;
    return Math.min(100, Math.round((totalHours / preset) * 100));
  }, []);

  const getProgressColor = useCallback((progress: number): string => {
    if (progress < 30) return '#B0B0B0';
    if (progress < 70) return 'linear-gradient(90deg, #5B9BD5, #2E75B6)';
    return 'linear-gradient(90deg, #70AD47, #548235)';
  }, []);

  const getAverageRating = useCallback((instrument: Instrument): number => {
    if (!instrument.reviews || instrument.reviews.length === 0) return 0;
    const sum = instrument.reviews.reduce((s, r) => s + r.rating, 0);
    return Math.round((sum / instrument.reviews.length) * 10) / 10;
  }, []);

  const addInstrument = useCallback(async (data: Omit<Instrument, 'id' | 'renovations' | 'reviews' | 'listed' | 'sold' | 'createdAt' | 'updatedAt'>): Promise<Instrument> => {
    const res = await axios.post('/api/instruments', data);
    setInstruments((prev) => [res.data, ...prev]);
    return res.data;
  }, []);

  const updateInstrument = useCallback(async (id: string, data: Partial<Instrument>) => {
    await axios.put(`/api/instruments/${id}`, data);
    setInstruments((prev) => prev.map((i) => (i.id === id ? { ...i, ...data, updatedAt: Date.now() } : i)));
  }, []);

  const addRenovation = useCallback(async (instrumentId: string, data: { type: RenovationType; materials: string; hours: number; photos: RenovationPhoto[] }) => {
    const res = await axios.post(`/api/instruments/${instrumentId}/renovations`, data);
    setInstruments((prev) =>
      prev.map((i) =>
        i.id === instrumentId
          ? { ...i, renovations: [...i.renovations, res.data], updatedAt: Date.now() }
          : i
      )
    );
  }, []);

  const addReview = useCallback(async (instrumentId: string, data: Omit<InstrumentReview, 'id' | 'createdAt'>) => {
    const res = await axios.post(`/api/instruments/${instrumentId}/reviews`, data);
    setInstruments((prev) =>
      prev.map((i) =>
        i.id === instrumentId
          ? { ...i, reviews: [...i.reviews, res.data], updatedAt: Date.now() }
          : i
      )
    );
  }, []);

  const getInstrumentById = useCallback(
    (id: string) => instruments.find((i) => i.id === id),
    [instruments]
  );

  const uploadPhotos = useCallback(async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));
    const res = await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.urls;
  }, []);

  const generateThumbnail = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas not available'));
          ctx.drawImage(img, 0, 0, 100, 100);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  return (
    <InstrumentContext.Provider
      value={{
        instruments,
        loading,
        addInstrument,
        updateInstrument,
        addRenovation,
        addReview,
        getInstrumentById,
        getProgress,
        getProgressColor,
        getAverageRating,
        uploadPhotos,
        generateThumbnail,
      }}
    >
      {children}
    </InstrumentContext.Provider>
  );
};
