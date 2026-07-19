import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import * as Papa from 'papaparse';
import { Readable } from 'stream';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  /**
   * Convert an array of objects to a CSV stream for download.
   */
  toCsvStream<T extends Record<string, any>>(data: T[], fileName: string): StreamableFile {
    const csv = Papa.unparse(data, {
      header: true,
    });

    const stream = Readable.from([csv]);

    return new StreamableFile(stream, {
      type: 'text/csv',
      disposition: `attachment; filename="${fileName}.csv"`,
    });
  }

  /**
   * Generate a CSV template with the given headers and an example row.
   */
  generateTemplate(headers: string[], exampleRow?: Record<string, string>): string {
    const data = exampleRow ? [exampleRow] : [];
    const csv = Papa.unparse({ fields: headers, data: data as any }, { header: true });
    return csv;
  }
}
