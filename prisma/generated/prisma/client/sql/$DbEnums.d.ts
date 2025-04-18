export interface $DbEnums {}


export namespace $DbEnums {
  type InspectionStatus = "PENDING" | "COMPLETE"
  type InspectionSessionStatus = "PENDING" | "COMPLETE"
  type AssetQuestionType = "SETUP" | "INSPECTION"
  type AssetQuestionResponseType = "BINARY" | "INDETERMINATE_BINARY" | "TEXT" | "TEXTAREA" | "DATE" | "NUMBER" | "IMAGE"
  type AlertLevel = "URGENT" | "INFO"
  type ProductRequestStatus = "NEW" | "APPROVED" | "RECEIVED" | "PROCESSING" | "FULFILLED" | "CANCELLED" | "COMPLETE"
  type ClientStatus = "PENDING" | "ACTIVE" | "INACTIVE"
  type ProductType = "CONSUMABLE" | "PRIMARY"
  type ConsumableMappingType = "EXPIRATION_DATE"
  type VaultAccessType = "PUBLIC" | "CLIENT" | "CLIENT_SITE" | "CLIENT_OWNER" | "STRICT_OWNER"
}
