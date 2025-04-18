import * as $runtime from "@prisma/client/runtime/library"

/**
 */
export const getInspections = $runtime.makeTypedQueryFactory("SELECT\ni.\"id\",\ni.\"createdOn\",\ni.\"assetId\",\ni.\"inspectorId\",\ni.\"siteId\",\nperson.\"firstName\" || ' ' || person.\"lastName\" AS \"inspectorName\",\na.\"name\" AS \"assetName\",\na.\"serialNumber\" AS \"assetSerialNumber\",\na.\"location\" AS \"assetLocation\",\na.\"placement\" AS \"assetPlacement\",\np.\"name\" AS \"productName\",\npc.\"name\" AS \"productCategoryName\",\npc.\"shortName\" AS \"productCategoryShortName\",\npc.\"icon\" AS \"productCategoryIcon\",\npc.\"color\" AS \"productCategoryColor\",\nm.\"name\" AS \"manufacturerName\",\ns.\"name\" AS \"siteName\",\nt.\"serialNumber\" AS \"tagSerialNumber\"\nFROM \"Inspection\" i\nJOIN \"Asset\" a ON i.\"assetId\" = a.\"id\"\nJOIN \"Product\" p ON a.\"productId\" = p.\"id\"\nJOIN \"ProductCategory\" pc ON p.\"productCategoryId\" = pc.\"id\"\nJOIN \"Manufacturer\" m ON p.\"manufacturerId\" = m.\"id\"\nJOIN \"Site\" s ON a.\"siteId\" = s.\"id\"\nJOIN \"Tag\" t ON a.\"tagId\" = t.\"id\"\nJOIN \"Person\" person ON i.\"inspectorId\" = person.\"id\"") as () => $runtime.TypedSql<getInspections.Parameters, getInspections.Result>

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
