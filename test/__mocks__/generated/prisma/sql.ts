// Stub for src/generated/prisma/sql
// This allows Jest to resolve the module before applying mocks from jest-setup.ts

const createQueryStub = () => () => ({ sql: '', values: [] });

export const getActiveAssets = createQueryStub();
export const getAssetsToRenewForDemoClient = createQueryStub();
export const getExpiredConsumables = createQueryStub();
export const getExpiringConsumables = createQueryStub();
export const getOverdueAssets = createQueryStub();
export const getRecentAlerts = createQueryStub();
export const getRecentInspections = createQueryStub();
export const getUnresolvedAlerts = createQueryStub();
