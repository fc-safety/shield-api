import { TypedSql } from '@prisma/client/runtime/library';
import {
  getActiveAssets,
  getInspections,
  getOverdueAssets,
} from '@prisma/client/sql';
import { format } from 'date-fns';
import { CannedReport } from './types';

type TypedSqlResult<T> = T extends TypedSql<[], infer R> ? R : never;

type ActiveAssetRow = TypedSqlResult<
  Awaited<ReturnType<typeof getActiveAssets>>
>;
const ActiveAssetsCannedReport: CannedReport<ActiveAssetRow> = {
  id: 'active-assets',
  name: 'Active Assets',
  description: 'Assets that are currently active.',
  type: 'CANNED',
  columns: [
    {
      alias: 'createdOn',
      valueFn: (row) => format(row.createdOn, 'PPpp'),
    },
    'siteName',
    'tagSerialNumber',
    'name',
    'serialNumber',
    'location',
    'placement',
    {
      alias: 'setupOn',
      valueFn: (row) => (row.setupOn ? format(row.setupOn, 'PPpp') : ''),
    },
    'productName',
    'productCategoryName',
    'productCategoryShortName',
    'manufacturerName',
  ],
  build: async (prismaService) => {
    const prisma = await prismaService.forContext();
    return prisma.$queryRawTyped(getActiveAssets());
  },
};

type OverdueAssetRow = TypedSqlResult<
  Awaited<ReturnType<typeof getOverdueAssets>>
>;
const OverdueAssetsCannedReport: CannedReport<OverdueAssetRow> = {
  id: 'overdue-assets',
  name: 'Overdue Assets',
  description: 'Assets that are overdue for inspection.',
  type: 'CANNED',
  columns: [
    {
      alias: 'lastInspectionDate',
      valueFn: (row) =>
        row.lastInspectionDate ? format(row.lastInspectionDate, 'PPpp') : '',
    },
    'siteName',
    'tagSerialNumber',
    'name',
    'serialNumber',
    'location',
    'placement',
    {
      alias: 'setupOn',
      valueFn: (row) => (row.setupOn ? format(row.setupOn, 'PPpp') : ''),
    },
    'productName',
    'productCategoryName',
    'productCategoryShortName',
    'manufacturerName',
  ],
  build: async (prismaService) => {
    const prisma = await prismaService.forContext();
    return prisma.$queryRawTyped(getOverdueAssets());
  },
};

type InspectionRow = TypedSqlResult<Awaited<ReturnType<typeof getInspections>>>;
const AllInspectionsCannedReport: CannedReport<InspectionRow> = {
  id: 'all-inspections',
  name: 'All Inspections',
  description: 'Results from all asset inspections.',
  type: 'CANNED',
  columns: [
    {
      alias: 'createdOn',
      label: 'Inspection Date',
      valueFn: (row) => format(row.createdOn, 'PPpp'),
    },
    'siteName',
    'inspectorName',
    'tagSerialNumber',
    'assetName',
    'assetSerialNumber',
    'assetLocation',
    'assetPlacement',
    'productName',
    'productCategoryName',
    'productCategoryShortName',
    'manufacturerName',
  ],
  build: async (prismaService) => {
    const prisma = await prismaService.forContext();
    return prisma.$queryRawTyped(getInspections());
  },
};

export const CANNED_REPORTS = [
  ActiveAssetsCannedReport,
  OverdueAssetsCannedReport,
  AllInspectionsCannedReport,
] as const satisfies CannedReport<any>[];
