import apiClient from '../services/apiClient';

/**
 * Downloads a PDF from a server endpoint and triggers a browser file download.
 * Works by fetching the binary response and creating a temporary object URL.
 */
export async function downloadPdf(
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

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Failed to download PDF';
    onError?.(msg);
  } finally {
    onDone?.();
  }
}
