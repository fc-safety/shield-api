import * as $runtime from "../runtime/library"

/**
 */
export const getActiveAssets: () => $runtime.TypedSql<getActiveAssets.Parameters, getActiveAssets.Result>

export namespace getActiveAssets {
  export type Parameters = []
  export type Result = {
    id: string
    createdOn: Date
    modifiedOn: Date
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
  }
}
