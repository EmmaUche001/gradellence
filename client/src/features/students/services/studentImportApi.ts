import apiClient from '../../../services/apiClient';

export const studentImportApi = {
  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('csv', file);
    return apiClient.post('/v1/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
