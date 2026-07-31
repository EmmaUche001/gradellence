import apiClient from '../../../services/apiClient';

export const scoreImportApi = {
  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('csv', file);
    return apiClient.post('/v1/assessments/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
