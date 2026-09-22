import apiClient from '../services/apiClient';

/**
 * Downloads a binary file (PDF, ZIP, etc.) from a server endpoint and triggers
 * a browser file download using the provided filename.
 */
export async function downloadBlob(
  endpoint: string,
  filename: string,
  onStart?: () => void,
  onDone?: () => void,
  onError?: (msg: string) => void,
): Promise<void> {
  onStart?.();
  try {
    const response = await apiClient.get(endpoint, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Failed to download file';
    onError?.(msg);
  } finally {
    onDone?.();
  }
}