import * as $runtime from "../runtime/library"

/**
 */
export const getOverdueAssets: () => $runtime.TypedSql<getOverdueAssets.Parameters, getOverdueAssets.Result>

export namespace getOverdueAssets {
  export type Parameters = []
  export type Result = {
    id: string
    createdOn: Date
    modifiedOn: Date
    active: boolean
    name: string
    serialNumber: string
    location: string
    placement: string
    setupOn: Date | null
    productName: string
    productCategoryName: string
    productCategoryShortName: string | null
    productCategoryIcon: string | null
    productCategoryColor: string | null
    manufacturerName: string
    siteName: string
    tagSerialNumber: string
    lastInspectionDate: Date
  }
}
