import { format } from 'date-fns';
import {
  getActiveAssets,
  getExpiredConsumables,
  getExpiringConsumables,
  getOverdueAssets,
  getRecentAlerts,
  getRecentInspections,
  getUnresolvedAlerts,
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
  build: async (prismaService) => {
    const prisma = await prismaService.forContext();
    return prisma.$queryRawTyped(getActiveAssets());
  },
  dateRangeSupport: 'NONE',
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
  dateRangeSupport: 'NONE',
};

type InspectionRow = getRecentInspections.Result;
const AllInspectionsCannedReport: CannedReport<InspectionRow> = {
  id: 'recent-inspections',
  name: 'Recent Inspections',
  description: 'Results from recent asset inspections.',
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
      getRecentInspections(query.startDate ?? null, query.endDate ?? null),
    );
  },
  dateRangeSupport: 'PAST',
};

type ExpiringConsumableRow = getExpiringConsumables.Result;
const ExpiringConsumablesCannedReport: CannedReport<ExpiringConsumableRow> = {
  id: 'expiring-consumables',
  name: 'Expiring Consumables',
  description: 'Consumables that are expiring soon.',
  type: 'CANNED',
  columns: [
    {
      alias: 'createdOn',
      valueFn: (row) => format(row.createdOn, 'PPpp'),
    },
    {
      alias: 'expiresOn',
      valueFn: (row) => (row.expiresOn ? format(row.expiresOn, 'PPpp') : ''),
    },
    'quantity',
    'assetName',
    'assetSerialNumber',
    'assetLocation',
    'assetPlacement',
    'productName',
    'productCategoryName',
    'productCategoryShortName',
    'manufacturerName',
    'siteName',
  ],
  build: async (prismaService, query) => {
    const prisma = await prismaService.forContext();
    return prisma.$queryRawTyped(
      getExpiringConsumables(query.startDate ?? null, query.endDate ?? null),
    );
  },
  dateRangeSupport: 'FUTURE',
};

type ExpiredConsumableRow = getExpiredConsumables.Result;
const ExpiredConsumablesCannedReport: CannedReport<ExpiredConsumableRow> = {
  id: 'expired-consumables',
  name: 'Expired Consumables',
  description: 'Consumables that have expired.',
  type: 'CANNED',
  columns: [
    {
      alias: 'createdOn',
      valueFn: (row) => format(row.createdOn, 'PPpp'),
    },
    {
      alias: 'expiresOn',
      valueFn: (row) => (row.expiresOn ? format(row.expiresOn, 'PPpp') : ''),
    },
    'quantity',
    'assetName',
    'assetSerialNumber',
    'assetLocation',
    'assetPlacement',
    'productName',
    'productCategoryName',
    'productCategoryShortName',
    'manufacturerName',
    'siteName',
  ],
  build: async (prismaService) => {
    const prisma = await prismaService.forContext();
    return prisma.$queryRawTyped(getExpiredConsumables());
  },
  dateRangeSupport: 'NONE',
};

type RecentAlertRow = getRecentAlerts.Result;
const RecentAlertsCannedReport: CannedReport<RecentAlertRow> = {
  id: 'recent-alerts',
  name: 'Recent Alerts',
  description: 'Inspection alerts that have occurred recently.',
  type: 'CANNED',
  columns: [
    {
      alias: 'createdOn',
      valueFn: (row) => format(row.createdOn, 'PPpp'),
    },
    'alertLevel',
    'message',
    'resolved',
    {
      alias: 'resolvedOn',
      valueFn: (row) => (row.resolvedOn ? format(row.resolvedOn, 'PPpp') : ''),
    },
    'resolutionNote',
    {
      alias: 'inspectionDate',
      valueFn: (row) => format(row.inspectionDate, 'PPpp'),
    },
    'inspectorName',
    'assetName',
    'assetSerialNumber',
    'assetLocation',
    'assetPlacement',
    'productName',
    'productCategoryName',
    'productCategoryShortName',
    'manufacturerName',
    'siteName',
  ],
  build: async (prismaService, query) => {
    const prisma = await prismaService.forContext();
    return prisma.$queryRawTyped(
      getRecentAlerts(query.startDate ?? null, query.endDate ?? null),
    );
  },
  dateRangeSupport: 'PAST',
};

type UnresolvedAlertRow = getUnresolvedAlerts.Result;
const UnresolvedAlertsCannedReport: CannedReport<UnresolvedAlertRow> = {
  id: 'unresolved-alerts',
  name: 'Unresolved Alerts',
  description: 'Inspection alerts that have not been resolved.',
  type: 'CANNED',
  columns: [
    {
      alias: 'createdOn',
      valueFn: (row) => format(row.createdOn, 'PPpp'),
    },
    'alertLevel',
    'message',
    'resolved',
    {
      alias: 'resolvedOn',
      valueFn: (row) => (row.resolvedOn ? format(row.resolvedOn, 'PPpp') : ''),
    },
    'resolutionNote',
    {
      alias: 'inspectionDate',
      valueFn: (row) => format(row.inspectionDate, 'PPpp'),
    },
    'inspectorName',
    'assetName',
    'assetSerialNumber',
    'assetLocation',
    'assetPlacement',
    'productName',
    'productCategoryName',
    'productCategoryShortName',
    'manufacturerName',
    'siteName',
  ],
  build: async (prismaService, query) => {
    const prisma = await prismaService.forContext();
    return prisma.$queryRawTyped(
      getUnresolvedAlerts(query.startDate ?? null, query.endDate ?? null),
    );
  },
  dateRangeSupport: 'PAST',
};

export const CANNED_REPORTS = [
  ActiveAssetsCannedReport,
  OverdueAssetsCannedReport,
  AllInspectionsCannedReport,
  ExpiringConsumablesCannedReport,
  ExpiredConsumablesCannedReport,
  RecentAlertsCannedReport,
  UnresolvedAlertsCannedReport,
] as const satisfies CannedReport<any>[];
