import axios from 'axios';
import type { EcosystemState } from '../simulation/ecosystem';

export interface SceneInfo {
  id: string;
  name: string;
  createdAt: number;
  data: EcosystemState;
}

export interface SaveSceneResponse {
  success: boolean;
  id: string;
  scene: SceneInfo;
}

export interface LoadScenesResponse {
  success: boolean;
  scenes: SceneInfo[];
}

export interface LoadSceneResponse {
  success: boolean;
  scene: SceneInfo;
}

export async function saveScene(name: string, data: EcosystemState): Promise<SaveSceneResponse> {
  const response = await axios.post('/api/save', { name, data });
  return response.data;
}

export async function loadScenes(): Promise<LoadScenesResponse> {
  const response = await axios.get('/api/load');
  return response.data;
}

export async function loadScene(id: string): Promise<LoadSceneResponse> {
  const response = await axios.get(`/api/load/${id}`);
  return response.data;
}
