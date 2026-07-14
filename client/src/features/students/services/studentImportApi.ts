import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const studentImportApi = {
  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('csv', file);
    return axios.post(`${API_BASE}/students/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};