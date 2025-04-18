import * as $runtime from "@prisma/client/runtime/library"

/**
 */
export const getOverdueAssets = $runtime.makeTypedQueryFactory("SELECT\na.\"id\",\na.\"createdOn\",\na.\"modifiedOn\",\na.\"active\",\na.\"name\",\na.\"serialNumber\",\na.\"location\",\na.\"placement\",\na.\"setupOn\",\np.\"name\" AS \"productName\",\npc.\"name\" AS \"productCategoryName\",\npc.\"shortName\" AS \"productCategoryShortName\",\npc.\"icon\" AS \"productCategoryIcon\",\npc.\"color\" AS \"productCategoryColor\",\nm.\"name\" AS \"manufacturerName\",\ns.\"name\" AS \"siteName\",\nt.\"serialNumber\" AS \"tagSerialNumber\",\ni.\"createdOn\" AS \"lastInspectionDate\"\nFROM \"Asset\" a\nJOIN \"Client\" c ON a.\"clientId\" = c.\"id\"\nJOIN \"Product\" p ON a.\"productId\" = p.\"id\"\nJOIN \"ProductCategory\" pc ON p.\"productCategoryId\" = pc.\"id\"\nJOIN \"Manufacturer\" m ON p.\"manufacturerId\" = m.\"id\"\nJOIN \"Site\" s ON a.\"siteId\" = s.\"id\"\nJOIN \"Tag\" t ON a.\"tagId\" = t.\"id\"\nLEFT JOIN (\nSELECT DISTINCT ON (i.\"assetId\") i.\"assetId\", i.\"createdOn\"\nFROM \"Inspection\" i\nORDER BY i.\"assetId\", i.\"createdOn\" DESC\n) i ON a.\"id\" = i.\"assetId\"\nWHERE (i.\"createdOn\" IS NOT  NULL AND i.\"createdOn\" < NOW() - (INTERVAL '1 day' * COALESCE(a.\"inspectionCycle\", c.\"defaultInspectionCycle\")))\nAND a.\"active\" = TRUE;") as () => $runtime.TypedSql<getOverdueAssets.Parameters, getOverdueAssets.Result>

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
