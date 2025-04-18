
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  setupOn: 'setupOn',
  active: 'active',
  name: 'name',
  productId: 'productId',
  tagId: 'tagId',
  location: 'location',
  placement: 'placement',
  serialNumber: 'serialNumber',
  inspectionCycle: 'inspectionCycle',
  inspectionRouteId: 'inspectionRouteId',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.ConsumableScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  assetId: 'assetId',
  productId: 'productId',
  expiresOn: 'expiresOn',
  quantity: 'quantity',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.TagScalarFieldEnum = {
  id: 'id',
  externalId: 'externalId',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  serialNumber: 'serialNumber',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.InspectionScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  assetId: 'assetId',
  inspectorId: 'inspectorId',
  status: 'status',
  useragent: 'useragent',
  ipv4: 'ipv4',
  ipv6: 'ipv6',
  latitude: 'latitude',
  longitude: 'longitude',
  locationAccuracy: 'locationAccuracy',
  comments: 'comments',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.InspectionRouteScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  name: 'name',
  description: 'description',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.InspectionRoutePointScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  order: 'order',
  inspectionRouteId: 'inspectionRouteId',
  assetId: 'assetId'
};

exports.Prisma.InspectionSessionScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  status: 'status',
  inspectionRouteId: 'inspectionRouteId',
  lastInspectorId: 'lastInspectorId',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.CompletedInspectionRoutePointScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  inspectionSessionId: 'inspectionSessionId',
  inspectionRoutePointId: 'inspectionRoutePointId',
  inspectionId: 'inspectionId'
};

exports.Prisma.AssetQuestionScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  active: 'active',
  type: 'type',
  required: 'required',
  order: 'order',
  prompt: 'prompt',
  valueType: 'valueType',
  productCategoryId: 'productCategoryId',
  productId: 'productId',
  consumableConfigId: 'consumableConfigId',
  clientId: 'clientId'
};

exports.Prisma.AssetQuestionResponseScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  value: 'value',
  assetQuestionId: 'assetQuestionId',
  assetId: 'assetId',
  inspectionId: 'inspectionId',
  responderId: 'responderId',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.AssetAlertCriterionScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  assetQuestionId: 'assetQuestionId',
  rule: 'rule',
  alertLevel: 'alertLevel'
};

exports.Prisma.AlertScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  alertLevel: 'alertLevel',
  message: 'message',
  assetId: 'assetId',
  inspectionId: 'inspectionId',
  assetQuestionResponseId: 'assetQuestionResponseId',
  assetAlertCriterionId: 'assetAlertCriterionId',
  resolved: 'resolved',
  resolvedOn: 'resolvedOn',
  resolutionNote: 'resolutionNote',
  inspectionImageUrl: 'inspectionImageUrl',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.ProductRequestScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  status: 'status',
  requestorId: 'requestorId',
  assetId: 'assetId',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.ProductRequestApprovalScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  approved: 'approved',
  approverId: 'approverId',
  productRequestId: 'productRequestId',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.ProductRequestItemScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  productRequestId: 'productRequestId',
  productId: 'productId',
  quantity: 'quantity',
  addedById: 'addedById',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.AddressScalarFieldEnum = {
  id: 'id',
  street1: 'street1',
  street2: 'street2',
  city: 'city',
  state: 'state',
  zip: 'zip'
};

exports.Prisma.ClientScalarFieldEnum = {
  id: 'id',
  externalId: 'externalId',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  status: 'status',
  startedOn: 'startedOn',
  name: 'name',
  addressId: 'addressId',
  phoneNumber: 'phoneNumber',
  homeUrl: 'homeUrl',
  defaultInspectionCycle: 'defaultInspectionCycle'
};

exports.Prisma.SiteScalarFieldEnum = {
  id: 'id',
  externalId: 'externalId',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  name: 'name',
  addressId: 'addressId',
  phoneNumber: 'phoneNumber',
  primary: 'primary',
  parentSiteId: 'parentSiteId',
  clientId: 'clientId'
};

exports.Prisma.PersonScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  username: 'username',
  idpId: 'idpId',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.ProductCategoryScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  active: 'active',
  name: 'name',
  shortName: 'shortName',
  description: 'description',
  icon: 'icon',
  color: 'color',
  clientId: 'clientId'
};

exports.Prisma.ManufacturerScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  active: 'active',
  name: 'name',
  homeUrl: 'homeUrl',
  clientId: 'clientId'
};

exports.Prisma.AnsiCategoryScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  name: 'name',
  description: 'description',
  color: 'color',
  icon: 'icon'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  active: 'active',
  manufacturerId: 'manufacturerId',
  type: 'type',
  name: 'name',
  description: 'description',
  sku: 'sku',
  productUrl: 'productUrl',
  imageUrl: 'imageUrl',
  productCategoryId: 'productCategoryId',
  parentProductId: 'parentProductId',
  quantity: 'quantity',
  price: 'price',
  ansiCategoryId: 'ansiCategoryId',
  perishable: 'perishable',
  ansiMinimumRequired: 'ansiMinimumRequired',
  clientId: 'clientId'
};

exports.Prisma.ConsumableQuestionConfigScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  consumableProductId: 'consumableProductId',
  mappingType: 'mappingType'
};

exports.Prisma.SettingsBlockScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  friendlyId: 'friendlyId',
  data: 'data'
};

exports.Prisma.VaultOwnershipScalarFieldEnum = {
  id: 'id',
  createdOn: 'createdOn',
  modifiedOn: 'modifiedOn',
  key: 'key',
  bucketName: 'bucketName',
  accessType: 'accessType',
  ownerId: 'ownerId',
  siteId: 'siteId',
  clientId: 'clientId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.InspectionStatus = exports.$Enums.InspectionStatus = {
  PENDING: 'PENDING',
  COMPLETE: 'COMPLETE'
};

exports.InspectionSessionStatus = exports.$Enums.InspectionSessionStatus = {
  PENDING: 'PENDING',
  COMPLETE: 'COMPLETE'
};

exports.AssetQuestionType = exports.$Enums.AssetQuestionType = {
  SETUP: 'SETUP',
  INSPECTION: 'INSPECTION'
};

exports.AssetQuestionResponseType = exports.$Enums.AssetQuestionResponseType = {
  BINARY: 'BINARY',
  INDETERMINATE_BINARY: 'INDETERMINATE_BINARY',
  TEXT: 'TEXT',
  TEXTAREA: 'TEXTAREA',
  DATE: 'DATE',
  NUMBER: 'NUMBER',
  IMAGE: 'IMAGE'
};

exports.AlertLevel = exports.$Enums.AlertLevel = {
  URGENT: 'URGENT',
  INFO: 'INFO'
};

exports.ProductRequestStatus = exports.$Enums.ProductRequestStatus = {
  NEW: 'NEW',
  APPROVED: 'APPROVED',
  RECEIVED: 'RECEIVED',
  PROCESSING: 'PROCESSING',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
  COMPLETE: 'COMPLETE'
};

exports.ClientStatus = exports.$Enums.ClientStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

exports.ProductType = exports.$Enums.ProductType = {
  CONSUMABLE: 'CONSUMABLE',
  PRIMARY: 'PRIMARY'
};

exports.ConsumableMappingType = exports.$Enums.ConsumableMappingType = {
  EXPIRATION_DATE: 'EXPIRATION_DATE'
};

exports.VaultAccessType = exports.$Enums.VaultAccessType = {
  PUBLIC: 'PUBLIC',
  CLIENT: 'CLIENT',
  CLIENT_SITE: 'CLIENT_SITE',
  CLIENT_OWNER: 'CLIENT_OWNER',
  STRICT_OWNER: 'STRICT_OWNER'
};

exports.Prisma.ModelName = {
  Asset: 'Asset',
  Consumable: 'Consumable',
  Tag: 'Tag',
  Inspection: 'Inspection',
  InspectionRoute: 'InspectionRoute',
  InspectionRoutePoint: 'InspectionRoutePoint',
  InspectionSession: 'InspectionSession',
  CompletedInspectionRoutePoint: 'CompletedInspectionRoutePoint',
  AssetQuestion: 'AssetQuestion',
  AssetQuestionResponse: 'AssetQuestionResponse',
  AssetAlertCriterion: 'AssetAlertCriterion',
  Alert: 'Alert',
  ProductRequest: 'ProductRequest',
  ProductRequestApproval: 'ProductRequestApproval',
  ProductRequestItem: 'ProductRequestItem',
  Address: 'Address',
  Client: 'Client',
  Site: 'Site',
  Person: 'Person',
  ProductCategory: 'ProductCategory',
  Manufacturer: 'Manufacturer',
  AnsiCategory: 'AnsiCategory',
  Product: 'Product',
  ConsumableQuestionConfig: 'ConsumableQuestionConfig',
  SettingsBlock: 'SettingsBlock',
  VaultOwnership: 'VaultOwnership'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
