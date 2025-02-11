import axios from 'axios';
import { type Exhibition } from '../../backend/src/routes/api.ts'

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getExhibitions = async () => {
  const response = await apiClient.get('/exhibition');
  return response.data.exhibitions as Exhibition[];
};

export const getExhibitionById = async (id: string) => {
  const response = await apiClient.get(`/exhibition/${id}`);
  return response.data as Exhibition;
};

export const createExhibition = async (title: string, description: string, owner: string) => {
  const response = await apiClient.post('/exhibition', { title, description, owner });
  return response.data as Exhibition;
};

export const updateExhibition = async (id: string, title?: string, description?: string) => {
  const response = await apiClient.put(`/exhibition/${id}`, { title, description });
  return response.status === 204;
};

export const getTableByNumber = async (number: string) => {
  const response = await apiClient.get(`/table/${number}`);
  return response.data;
};
