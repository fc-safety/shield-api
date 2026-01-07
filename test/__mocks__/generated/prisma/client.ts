// Mock Prisma client for testing purposes
// This file is used instead of the real generated Prisma client during tests

export class PrismaClient {
  $connect() { return Promise.resolve(); }
  $disconnect() { return Promise.resolve(); }
  $executeRaw() { return Promise.resolve(0); }
  $executeRawUnsafe() { return Promise.resolve(0); }
  $queryRaw() { return Promise.resolve([]); }
  $queryRawUnsafe() { return Promise.resolve([]); }
  $transaction() { return Promise.resolve([]); }
}

export namespace Prisma {
  export class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: Record<string, unknown>;
    clientVersion: string;

    constructor(message: string, { code, clientVersion, meta }: { code: string; clientVersion: string; meta?: Record<string, unknown> }) {
      super(message);
      this.code = code;
      this.clientVersion = clientVersion;
      this.meta = meta;
      this.name = 'PrismaClientKnownRequestError';
    }
  }

  export class PrismaClientUnknownRequestError extends Error {
    clientVersion: string;
    constructor(message: string, { clientVersion }: { clientVersion: string }) {
      super(message);
      this.clientVersion = clientVersion;
      this.name = 'PrismaClientUnknownRequestError';
    }
  }

  export class PrismaClientRustPanicError extends Error {
    clientVersion: string;
    constructor(message: string, clientVersion: string) {
      super(message);
      this.clientVersion = clientVersion;
      this.name = 'PrismaClientRustPanicError';
    }
  }

  export class PrismaClientInitializationError extends Error {
    clientVersion: string;
    errorCode?: string;
    constructor(message: string, clientVersion: string, errorCode?: string) {
      super(message);
      this.clientVersion = clientVersion;
      this.errorCode = errorCode;
      this.name = 'PrismaClientInitializationError';
    }
  }

  export class PrismaClientValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PrismaClientValidationError';
    }
  }

  // JSON input types
  export type InputJsonValue = string | number | boolean | null | InputJsonObject | InputJsonArray;
  export interface InputJsonObject { [key: string]: InputJsonValue }
  export interface InputJsonArray extends Array<InputJsonValue> {}

  // JSON output types
  export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
  export interface JsonObject { [key: string]: JsonValue }
  export interface JsonArray extends Array<JsonValue> {}

  // Common types
  export type Decimal = number;

  // Sort order
  export enum SortOrder {
    asc = 'asc',
    desc = 'desc'
  }

  export enum NullsOrder {
    first = 'first',
    last = 'last'
  }

  export enum QueryMode {
    default = 'default',
    insensitive = 'insensitive'
  }

  // Null types for JSON
  export enum NullTypes {
    DbNull = 'DbNull',
    JsonNull = 'JsonNull',
    AnyNull = 'AnyNull'
  }

  export const DbNull: unique symbol = Symbol('DbNull');
  export const JsonNull: unique symbol = Symbol('JsonNull');
  export const AnyNull: unique symbol = Symbol('AnyNull');

  // Model payloads - generic types
  export type AssetPayload<T = unknown> = T;
  export type ConsumablePayload<T = unknown> = T;
  export type TagPayload<T = unknown> = T;
  export type InspectionPayload<T = unknown> = T;
  export type InspectionRoutePayload<T = unknown> = T;
  export type InspectionRoutePointPayload<T = unknown> = T;
  export type InspectionSessionPayload<T = unknown> = T;
  export type CompletedInspectionRoutePointPayload<T = unknown> = T;
  export type AssetQuestionPayload<T = unknown> = T;
  export type FilePayload<T = unknown> = T;
  export type ClientAssetQuestionCustomizationPayload<T = unknown> = T;
  export type SetAssetMetadataConfigPayload<T = unknown> = T;
  export type AssetQuestionResponsePayload<T = unknown> = T;
  export type AssetQuestionConditionPayload<T = unknown> = T;
  export type AssetAlertCriterionPayload<T = unknown> = T;
  export type RegulatoryCodePayload<T = unknown> = T;
  export type AlertPayload<T = unknown> = T;
  export type ProductRequestPayload<T = unknown> = T;
  export type ProductRequestApprovalPayload<T = unknown> = T;
  export type ProductRequestItemPayload<T = unknown> = T;
  export type AddressPayload<T = unknown> = T;
  export type ClientPayload<T = unknown> = T;
  export type SitePayload<T = unknown> = T;
  export type PersonPayload<T = unknown> = T;
  export type ProductCategoryPayload<T = unknown> = T;
  export type ManufacturerPayload<T = unknown> = T;
  export type AnsiCategoryPayload<T = unknown> = T;
  export type ProductPayload<T = unknown> = T;
  export type ConsumableQuestionConfigPayload<T = unknown> = T;
  export type SettingsBlockPayload<T = unknown> = T;
  export type VaultOwnershipPayload<T = unknown> = T;
  export type SigningKeyPayload<T = unknown> = T;

  // GetPayload type helper
  export type GetPayload<T> = T;

  // Model select/include types
  export type AssetSelect<T = unknown> = T;
  export type AssetInclude<T = unknown> = T;
  export type ConsumableSelect<T = unknown> = T;
  export type ConsumableInclude<T = unknown> = T;
  export type TagSelect<T = unknown> = T;
  export type TagInclude<T = unknown> = T;
  export type InspectionSelect<T = unknown> = T;
  export type InspectionInclude<T = unknown> = T;
  export type AlertSelect<T = unknown> = T;
  export type AlertInclude<T = unknown> = T;
  export type ClientSelect<T = unknown> = T;
  export type ClientInclude<T = unknown> = T;
  export type SiteSelect<T = unknown> = T;
  export type SiteInclude<T = unknown> = T;
  export type PersonSelect<T = unknown> = T;
  export type PersonInclude<T = unknown> = T;
  export type ProductSelect<T = unknown> = T;
  export type ProductInclude<T = unknown> = T;
  export type ProductCategorySelect<T = unknown> = T;
  export type ProductCategoryInclude<T = unknown> = T;
  export type ManufacturerSelect<T = unknown> = T;
  export type ManufacturerInclude<T = unknown> = T;
  export type AnsiCategorySelect<T = unknown> = T;
  export type AnsiCategoryInclude<T = unknown> = T;
  export type AssetQuestionSelect<T = unknown> = T;
  export type AssetQuestionInclude<T = unknown> = T;
  export type VaultOwnershipSelect<T = unknown> = T;
  export type VaultOwnershipInclude<T = unknown> = T;
  export type SettingsBlockSelect<T = unknown> = T;
  export type ProductRequestSelect<T = unknown> = T;
  export type ProductRequestInclude<T = unknown> = T;
  export type InspectionRouteSelect<T = unknown> = T;
  export type InspectionRouteInclude<T = unknown> = T;

  // Input types for create/update
  export type AssetCreateInput = Record<string, unknown>;
  export type AssetUpdateInput = Record<string, unknown>;
  export type ConsumableCreateInput = Record<string, unknown>;
  export type ConsumableUpdateInput = Record<string, unknown>;
  export type TagCreateInput = Record<string, unknown>;
  export type TagUpdateInput = Record<string, unknown>;
  export type InspectionCreateInput = Record<string, unknown>;
  export type InspectionUpdateInput = Record<string, unknown>;
  export type AlertCreateInput = Record<string, unknown>;
  export type AlertUpdateInput = Record<string, unknown>;
  export type ClientCreateInput = Record<string, unknown>;
  export type ClientUpdateInput = Record<string, unknown>;
  export type SiteCreateInput = Record<string, unknown>;
  export type SiteUpdateInput = Record<string, unknown>;
  export type PersonCreateInput = Record<string, unknown>;
  export type PersonUpdateInput = Record<string, unknown>;
  export type ProductCreateInput = Record<string, unknown>;
  export type ProductUpdateInput = Record<string, unknown>;
  export type ProductCategoryCreateInput = Record<string, unknown>;
  export type ProductCategoryUpdateInput = Record<string, unknown>;
  export type ManufacturerCreateInput = Record<string, unknown>;
  export type ManufacturerUpdateInput = Record<string, unknown>;
  export type AnsiCategoryCreateInput = Record<string, unknown>;
  export type AnsiCategoryUpdateInput = Record<string, unknown>;
  export type AssetQuestionCreateInput = Record<string, unknown>;
  export type AssetQuestionUpdateInput = Record<string, unknown>;
  export type VaultOwnershipCreateInput = Record<string, unknown>;
  export type VaultOwnershipUpdateInput = Record<string, unknown>;
  export type SettingsBlockCreateInput = Record<string, unknown>;
  export type SettingsBlockUpdateInput = Record<string, unknown>;
  export type ProductRequestCreateInput = Record<string, unknown>;
  export type ProductRequestUpdateInput = Record<string, unknown>;
  export type InspectionRouteCreateInput = Record<string, unknown>;
  export type InspectionRouteUpdateInput = Record<string, unknown>;

  // Where input types
  export type AssetWhereInput = Record<string, unknown>;
  export type AssetWhereUniqueInput = Record<string, unknown>;
  export type ConsumableWhereInput = Record<string, unknown>;
  export type ConsumableWhereUniqueInput = Record<string, unknown>;
  export type TagWhereInput = Record<string, unknown>;
  export type TagWhereUniqueInput = Record<string, unknown>;
  export type InspectionWhereInput = Record<string, unknown>;
  export type InspectionWhereUniqueInput = Record<string, unknown>;
  export type AlertWhereInput = Record<string, unknown>;
  export type AlertWhereUniqueInput = Record<string, unknown>;
  export type ClientWhereInput = Record<string, unknown>;
  export type ClientWhereUniqueInput = Record<string, unknown>;
  export type SiteWhereInput = Record<string, unknown>;
  export type SiteWhereUniqueInput = Record<string, unknown>;
  export type PersonWhereInput = Record<string, unknown>;
  export type PersonWhereUniqueInput = Record<string, unknown>;
  export type ProductWhereInput = Record<string, unknown>;
  export type ProductWhereUniqueInput = Record<string, unknown>;
  export type ProductCategoryWhereInput = Record<string, unknown>;
  export type ProductCategoryWhereUniqueInput = Record<string, unknown>;
  export type ManufacturerWhereInput = Record<string, unknown>;
  export type ManufacturerWhereUniqueInput = Record<string, unknown>;
  export type AnsiCategoryWhereInput = Record<string, unknown>;
  export type AnsiCategoryWhereUniqueInput = Record<string, unknown>;
  export type AssetQuestionWhereInput = Record<string, unknown>;
  export type AssetQuestionWhereUniqueInput = Record<string, unknown>;
  export type VaultOwnershipWhereInput = Record<string, unknown>;
  export type VaultOwnershipWhereUniqueInput = Record<string, unknown>;
  export type SettingsBlockWhereInput = Record<string, unknown>;
  export type SettingsBlockWhereUniqueInput = Record<string, unknown>;
  export type ProductRequestWhereInput = Record<string, unknown>;
  export type ProductRequestWhereUniqueInput = Record<string, unknown>;
  export type InspectionRouteWhereInput = Record<string, unknown>;
  export type InspectionRouteWhereUniqueInput = Record<string, unknown>;

  // Order by types
  export type AssetOrderByWithRelationInput = Record<string, unknown>;
  export type ConsumableOrderByWithRelationInput = Record<string, unknown>;
  export type TagOrderByWithRelationInput = Record<string, unknown>;
  export type InspectionOrderByWithRelationInput = Record<string, unknown>;
  export type AlertOrderByWithRelationInput = Record<string, unknown>;
  export type ClientOrderByWithRelationInput = Record<string, unknown>;
  export type SiteOrderByWithRelationInput = Record<string, unknown>;
  export type PersonOrderByWithRelationInput = Record<string, unknown>;
  export type ProductOrderByWithRelationInput = Record<string, unknown>;
  export type ProductCategoryOrderByWithRelationInput = Record<string, unknown>;
  export type ManufacturerOrderByWithRelationInput = Record<string, unknown>;
  export type AnsiCategoryOrderByWithRelationInput = Record<string, unknown>;
  export type AssetQuestionOrderByWithRelationInput = Record<string, unknown>;
  export type VaultOwnershipOrderByWithRelationInput = Record<string, unknown>;
  export type SettingsBlockOrderByWithRelationInput = Record<string, unknown>;
  export type ProductRequestOrderByWithRelationInput = Record<string, unknown>;
  export type InspectionRouteOrderByWithRelationInput = Record<string, unknown>;
}

// Enums
export enum InspectionStatus {
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE'
}

export enum InspectionSessionStatus {
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum AssetQuestionType {
  CONFIGURATION = 'CONFIGURATION',
  SETUP_AND_INSPECTION = 'SETUP_AND_INSPECTION',
  SETUP = 'SETUP',
  INSPECTION = 'INSPECTION'
}

export enum AssetQuestionResponseType {
  BINARY = 'BINARY',
  INDETERMINATE_BINARY = 'INDETERMINATE_BINARY',
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  DATE = 'DATE',
  NUMBER = 'NUMBER',
  SELECT = 'SELECT',
  IMAGE = 'IMAGE'
}

export enum AssetQuestionConditionType {
  REGION = 'REGION',
  MANUFACTURER = 'MANUFACTURER',
  PRODUCT_CATEGORY = 'PRODUCT_CATEGORY',
  PRODUCT = 'PRODUCT',
  METADATA = 'METADATA'
}

export enum AlertLevel {
  CRITICAL = 'CRITICAL',
  URGENT = 'URGENT',
  WARNING = 'WARNING',
  INFO = 'INFO',
  AUDIT = 'AUDIT'
}

export enum ProductRequestStatus {
  NEW = 'NEW',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
  COMPLETE = 'COMPLETE'
}

export enum ClientStatus {
  LEGACY = 'LEGACY',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export enum ProductType {
  CONSUMABLE = 'CONSUMABLE',
  PRIMARY = 'PRIMARY'
}

export enum ConsumableMappingType {
  EXPIRATION_DATE = 'EXPIRATION_DATE'
}

export enum VaultAccessType {
  PUBLIC = 'PUBLIC',
  CLIENT = 'CLIENT',
  CLIENT_SITE = 'CLIENT_SITE',
  CLIENT_OWNER = 'CLIENT_OWNER',
  STRICT_OWNER = 'STRICT_OWNER'
}

// $Enums namespace for compatibility
export const $Enums = {
  InspectionStatus,
  InspectionSessionStatus,
  AssetQuestionType,
  AssetQuestionResponseType,
  AssetQuestionConditionType,
  AlertLevel,
  ProductRequestStatus,
  ClientStatus,
  ProductType,
  ConsumableMappingType,
  VaultAccessType
};

// Type aliases for model types (basic placeholders)
export type Asset = {
  id: string;
  legacyAssetId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  setupOn: Date | null;
  configured: boolean;
  active: boolean;
  name: string;
  productId: string;
  tagId: string | null;
  location: string;
  placement: string;
  serialNumber: string;
  inspectionCycle: number | null;
  metadata: Prisma.JsonValue | null;
  inspectionRouteId: string | null;
  siteId: string;
  clientId: string;
};

export type Consumable = {
  id: string;
  legacyInventoryId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  assetId: string | null;
  productId: string;
  expiresOn: Date | null;
  quantity: number;
  siteId: string;
  clientId: string;
};

export type Tag = {
  id: string;
  externalId: string;
  createdOn: Date;
  modifiedOn: Date;
  serialNumber: string;
  legacyTagId: string | null;
  siteId: string | null;
  clientId: string | null;
};

export type Inspection = {
  id: string;
  legacyLogId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  assetId: string;
  inspectorId: string;
  status: InspectionStatus;
  useragent: string | null;
  ipv4: string | null;
  ipv6: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  comments: string | null;
  siteId: string;
  clientId: string;
};

export type Alert = {
  id: string;
  legacyAlertId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  alertLevel: AlertLevel;
  message: string;
  assetId: string;
  inspectionId: string;
  assetQuestionResponseId: string;
  assetAlertCriterionId: string;
  resolved: boolean;
  resolvedOn: Date | null;
  resolutionNote: string | null;
  resolvedById: string | null;
  inspectionImageUrl: string | null;
  siteId: string;
  clientId: string;
};

export type Client = {
  id: string;
  externalId: string;
  legacyClientId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  status: ClientStatus;
  startedOn: Date;
  name: string;
  addressId: string;
  phoneNumber: string;
  homeUrl: string | null;
  defaultInspectionCycle: number;
  demoMode: boolean;
};

export type Site = {
  id: string;
  externalId: string;
  legacySiteId: string | null;
  legacyGroupId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  active: boolean;
  name: string;
  addressId: string;
  phoneNumber: string;
  primary: boolean;
  parentSiteId: string | null;
  clientId: string;
};

export type Person = {
  id: string;
  createdOn: Date;
  modifiedOn: Date;
  firstName: string;
  lastName: string;
  email: string;
  username: string | null;
  idpId: string | null;
  legacyUsername: string | null;
  siteId: string;
  clientId: string;
};

export type Product = {
  id: string;
  legacyProductId: string | null;
  legacyConsumableId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  active: boolean;
  manufacturerId: string;
  type: ProductType;
  name: string;
  description: string | null;
  sku: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  metadata: Prisma.JsonValue | null;
  productCategoryId: string;
  parentProductId: string | null;
  displayExpirationDate: boolean;
  quantity: number | null;
  price: number | null;
  ansiCategoryId: string | null;
  perishable: boolean;
  ansiMinimumRequired: boolean;
  clientId: string | null;
};

export type ProductCategory = {
  id: string;
  legacyCategoryId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  active: boolean;
  name: string;
  shortName: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  clientId: string | null;
};

export type Manufacturer = {
  id: string;
  legacyManufacturerId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  active: boolean;
  name: string;
  homeUrl: string | null;
  clientId: string | null;
};

export type AnsiCategory = {
  id: string;
  createdOn: Date;
  modifiedOn: Date;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
};

export type AssetQuestion = {
  id: string;
  legacyQuestionId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  active: boolean;
  type: AssetQuestionType;
  tone: string | null;
  required: boolean;
  order: number | null;
  prompt: string;
  valueType: AssetQuestionResponseType;
  helpText: string | null;
  placeholder: string | null;
  selectOptions: Prisma.JsonValue | null;
  productCategoryId: string | null;
  productId: string | null;
  parentQuestionId: string | null;
  consumableConfigId: string | null;
  clientId: string | null;
};

export type VaultOwnership = {
  id: string;
  createdOn: Date;
  modifiedOn: Date;
  key: string;
  bucketName: string | null;
  accessType: VaultAccessType;
  ownerId: string;
  siteId: string;
  clientId: string;
};

export type SettingsBlock = {
  id: string;
  createdOn: Date;
  modifiedOn: Date;
  friendlyId: string;
  data: Prisma.JsonValue;
};

export type ProductRequest = {
  id: string;
  legacyRequestId: string | null;
  createdOn: Date;
  modifiedOn: Date;
  status: ProductRequestStatus;
  requestorId: string;
  assetId: string | null;
  siteId: string;
  clientId: string;
};

export type InspectionRoute = {
  id: string;
  createdOn: Date;
  modifiedOn: Date;
  name: string;
  description: string | null;
  siteId: string;
  clientId: string;
};
