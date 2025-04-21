import { PrismaService } from 'src/prisma/prisma.service';
import { z } from 'zod';
import { BaseCannedReportsQuerySchema } from './dto/base-canned-reports-query.dto';

export interface Report {
  id: string;
  name: string;
  description: string;
  type: 'CANNED';
}

export interface CannedReport<T> extends Report {
  id: string;
  name: string;
  description: string;
  type: 'CANNED';
  columns: (
    | keyof T
    | {
        alias: keyof T;
        label?: string;
        valueFn?: (row: T) => string;
      }
  )[];
  build: (
    prismaService: PrismaService,
    query: z.infer<typeof BaseCannedReportsQuerySchema>,
  ) => Promise<T[]>;
  supportsDateRange: boolean;
}
