import * as $runtime from "../runtime/library"

/**
 */
export const getInspections: () => $runtime.TypedSql<getInspections.Parameters, getInspections.Result>

export namespace getInspections {
  export type Parameters = []
  export type Result = {
    id: string
    createdOn: Date
    assetId: string
    inspectorId: string
    siteId: string
    inspectorName: string | null
    assetName: string
    assetSerialNumber: string
    assetLocation: string
    assetPlacement: string
    productName: string
    productCategoryName: string
    productCategoryShortName: string | null
    productCategoryIcon: string | null
    productCategoryColor: string | null
    manufacturerName: string
    siteName: string
    tagSerialNumber: string
  }
}
