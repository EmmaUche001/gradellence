import { Injectable, Logger } from '@nestjs/common';
import * as Papa from 'papaparse';
import { ImportResult, ImportError } from './import-result.interface';

@Injectable()
export class BaseImportService {
  protected readonly logger = new Logger(BaseImportService.name);
  protected readonly maxRows = parseInt(process.env.MAX_IMPORT_ROWS || '500', 10);

  /**
   * Parse a CSV string into an array of row objects.
   * Returns { data, errors } where errors are parse-level issues (malformed rows).
   */
  parseCsv<T = Record<string, string>>(
    csvContent: string,
    expectedHeaders: string[],
  ): { data: T[]; errors: ImportError[] } {
    const result = Papa.parse<T>(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    const errors: ImportError[] = [];

    if (result.errors.length > 0) {
      for (const err of result.errors) {
        errors.push({
          row: (err.row ?? 0) + 2, // +2 for header row + 1-based
          message: err.message,
        });
      }
    }

    // Validate headers
    const actualHeaders = result.meta.fields || [];
    const missingHeaders = expectedHeaders.filter((h) => !actualHeaders.includes(h));
    if (missingHeaders.length > 0) {
      errors.push({
        row: 1,
        message: `Missing required columns: ${missingHeaders.join(', ')}`,
      });
    }

    // Enforce row limit
    if (result.data.length > this.maxRows) {
      errors.push({
        row: 0,
        message: `Import exceeds maximum of ${this.maxRows} rows. Found ${result.data.length}.`,
      });
      return { data: [], errors };
    }

    return { data: result.data as T[], errors };
  }

  /**
   * Build a successful ImportResult.
   */
  success<T = any>(count: number, data?: T[]): ImportResult<T> {
    return { successCount: count, failureCount: 0, errors: [], warnings: [], data };
  }

  /**
   * Build a failed ImportResult from collected errors.
   */
  failure<T = any>(errors: ImportError[], successCount = 0): ImportResult<T> {
    return {
      successCount,
      failureCount: errors.length,
      errors,
      warnings: [],
    };
  }
}
