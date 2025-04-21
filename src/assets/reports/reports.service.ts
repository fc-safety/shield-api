import * as csv from '@fast-csv/format';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CANNED_REPORTS } from './canned-reports';
import { BaseCannedReportsQueryDto } from './dto/base-canned-reports-query.dto';
import { CannedReport } from './types';

type ReportColumn<T> = CannedReport<T>['columns'][number];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllReports() {
    return CANNED_REPORTS.map(
      ({ id, name, description, type, supportsDateRange }) => ({
        id,
        name,
        description,
        type,
        supportsDateRange,
      }),
    );
  }

  async buildReport(id: string, query: BaseCannedReportsQueryDto) {
    const { build, columns, ...report } = this.getCannedReport(id);
    const data = await build(this.prisma, query);
    const mappedData = data.map((r) =>
      this.mapColumnData<typeof r>(r, columns),
    );
    return {
      ...report,
      data: mappedData,
      columns: this.mapColumns<object>(columns as ReportColumn<object>[]),
    };
  }

  async buildReportCsv(id: string, query: BaseCannedReportsQueryDto) {
    const { data } = await this.buildReport(id, query);
    const stream = csv.write<(typeof data)[number], (typeof data)[number]>(
      data,
      {
        headers: true,
      },
    );
    return stream;
  }

  private getCannedReport(id: string) {
    const report = CANNED_REPORTS.find(({ id: rId }) => rId === id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  private mapColumnData<T>(row: T, columns: ReportColumn<T>[]) {
    return Object.fromEntries(
      columns.map((c) => {
        if (
          typeof c === 'string' ||
          typeof c === 'number' ||
          typeof c === 'symbol'
        ) {
          return [this.toTitleCase(String(c)), row[c]];
        }
        const value = c.valueFn ? c.valueFn(row) : row[c.alias];
        const label = c.label ?? this.toTitleCase(c.alias.toString());
        return [label, value];
      }),
    );
  }

  private mapColumns<T>(columns: ReportColumn<T>[]) {
    return columns.map((c) => {
      if (
        typeof c === 'string' ||
        typeof c === 'number' ||
        typeof c === 'symbol'
      ) {
        return this.toTitleCase(String(c));
      }
      const label = c.label ?? this.toTitleCase(c.alias.toString());
      return label;
    });
  }

  private toTitleCase(str: string) {
    return str
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, (char) => char.toUpperCase()) // Capitalize first letter
      .trim(); // Remove any leading/trailing spaces
  }
}
