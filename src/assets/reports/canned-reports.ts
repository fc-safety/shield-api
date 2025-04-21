import { format } from 'date-fns';
import {
  getActiveAssets,
  getInspections,
  getOverdueAssets,
} from 'src/generated/prisma/client/sql';
import { CannedReport } from './types';

type ActiveAssetRow = getActiveAssets.Result;
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
  build: async (prismaService, query) => {
    const prisma = await prismaService.forContext();
    return prisma.$queryRawTyped(
      getActiveAssets(query.startDate, query.endDate),
    );
  },
  supportsDateRange: true,
};

type OverdueAssetRow = getOverdueAssets.Result;
const OverdueAssetsCannedReport: CannedReport<OverdueAssetRow> = {
  id: 'overdue-assets',
  name: 'Overdue Assets',
  description: 'Assets that are overdue for inspection.',
  type: 'CANNED',
  columns: [
    {
      alias: 'lastInspectionDate',
      label: 'Last Inspected',
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
  supportsDateRange: false,
};

type InspectionRow = getInspections.Result;
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
  build: async (prismaService, query) => {
    const prisma = await prismaService.forContext();
    return prisma.$queryRawTyped(
      getInspections(query.startDate, query.endDate),
    );
  },
  supportsDateRange: true,
};

export const CANNED_REPORTS = [
  ActiveAssetsCannedReport,
  OverdueAssetsCannedReport,
  AllInspectionsCannedReport,
] as const satisfies CannedReport<any>[];
