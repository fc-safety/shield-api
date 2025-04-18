import * as $runtime from "@prisma/client/runtime/library"

/**
 */
export const getActiveAssets = $runtime.makeTypedQueryFactory("SELECT\na.\"id\",\na.\"createdOn\",\na.\"modifiedOn\",\na.\"name\",\na.\"serialNumber\",\na.\"location\",\na.\"placement\",\na.\"setupOn\",\np.\"name\" AS \"productName\",\npc.\"name\" AS \"productCategoryName\",\npc.\"shortName\" AS \"productCategoryShortName\",\npc.\"icon\" AS \"productCategoryIcon\",\npc.\"color\" AS \"productCategoryColor\",\nm.\"name\" AS \"manufacturerName\",\ns.\"name\" AS \"siteName\",\nt.\"serialNumber\" AS \"tagSerialNumber\"\nFROM \"Asset\" a\nJOIN \"Product\" p ON a.\"productId\" = p.\"id\"\nJOIN \"ProductCategory\" pc ON p.\"productCategoryId\" = pc.\"id\"\nJOIN \"Manufacturer\" m ON p.\"manufacturerId\" = m.\"id\"\nJOIN \"Site\" s ON a.\"siteId\" = s.\"id\"\nJOIN \"Tag\" t ON a.\"tagId\" = t.\"id\"\nWHERE a.\"active\" = TRUE;") as () => $runtime.TypedSql<getActiveAssets.Parameters, getActiveAssets.Result>

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
