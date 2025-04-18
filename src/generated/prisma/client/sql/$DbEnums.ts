export interface $DbEnums {
  InspectionStatus: "PENDING" | "COMPLETE"
  InspectionSessionStatus: "PENDING" | "COMPLETE"
  AssetQuestionType: "SETUP" | "INSPECTION"
  AssetQuestionResponseType: "BINARY" | "INDETERMINATE_BINARY" | "TEXT" | "TEXTAREA" | "DATE" | "NUMBER" | "IMAGE"
  AlertLevel: "URGENT" | "INFO"
  ProductRequestStatus: "NEW" | "APPROVED" | "RECEIVED" | "PROCESSING" | "FULFILLED" | "CANCELLED" | "COMPLETE"
  ClientStatus: "PENDING" | "ACTIVE" | "INACTIVE"
  ProductType: "CONSUMABLE" | "PRIMARY"
  ConsumableMappingType: "EXPIRATION_DATE"
  VaultAccessType: "PUBLIC" | "CLIENT" | "CLIENT_SITE" | "CLIENT_OWNER" | "STRICT_OWNER"
}
