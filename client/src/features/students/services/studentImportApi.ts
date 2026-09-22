import apiClient from '../../../services/apiClient';

export const studentImportApi = {
  uploadCsv: (file: File, classId?: string, termId?: string) => {
    const formData = new FormData();
    formData.append('csv', file);
    if (classId) formData.append('classId', classId);
    if (termId)  formData.append('termId', termId);
    return apiClient.post('/v1/students/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
