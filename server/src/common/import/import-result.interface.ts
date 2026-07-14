export interface ImportError {
  row: number;
  column?: string;
  message: string;
  value?: string;
}

export interface ImportWarning {
  row: number;
  message: string;
}

export interface ImportResult<T = any> {
  successCount: number;
  failureCount: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  data?: T[];
}