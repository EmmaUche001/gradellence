import React, { useState } from 'react';
import { studentImportApi } from '../services/studentImportApi';

export const StudentImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await studentImportApi.uploadCsv(file);
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Import Students</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Importing...' : 'Import Students'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 font-medium">
              Successfully imported {result.successCount} students
            </p>
            {result.failureCount > 0 && (
              <p className="text-red-700 font-medium mt-1">
                Failed: {result.failureCount} rows
              </p>
            )}
          </div>

          {result.errors?.length > 0 && (
            <div className="border rounded overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Column</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Error</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.errors.map((err: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700">{err.row}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{err.column || '-'}</td>
                      <td className="px-4 py-2 text-sm text-red-600">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};