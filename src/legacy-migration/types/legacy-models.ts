/** Maps to `Client` model. */
export interface Client {
  /** Incremental identifier. */
  c_no: number;
  /** Unique string identifier. */
  c_id: string | null;
  /** Name of the client. */
  c_name: string;
  /** Date of creation. */
  c_date_insert: Date | null;
  /** Status: 1 = Active, 0 = Inactive */
  c_status: number;
  /** Phone number. */
  c_phone: string | null;
  /** Website. */
  c_www: string | null;
}

/** Maps to `Site` model. */
export interface Location {
  /** Incremental identifier. */
  loc_no: number;
  /** Unique string identifier. */
  loc_id: string | null;
  /** Maps to `Client.c_no`. */
  loc_c_no: number | null;
  /** Name. */
  loc_name: string | null;
  /** Phone number. */
  loc_phone: string | null;
  /** Type: 1 = Primary */
  loc_type: number | null;
  /** Date of creation. */
  loc_date_insert: Date | null;
  /** Address line 1. */
  loc_addr1: string | null;
  /** Address line 2. */
  loc_addr2: string | null;
  /** City. */
  loc_city: string | null;
  /** State. */
  loc_state: string | null;
  /** Zip code. */
  loc_zip: string | null;
  /** Status: 1 = Active, 0 = Inactive */
  loc_status: number | null;
  /** Maps to `Group.group_no`. */
  loc_group_no: number | null;
}

/** Maps to `Site` model, for site groups. */
export interface Group {
  /** Incremental identifier. */
  group_no: number;
  /** Unique string identifier. */
  group_id: string | null;
  /** Maps to `Client.c_no`. */
  group_c_no: number | null;
  /** Name. */
  group_name: string | null;
  /** Description. */
  group_desc: string | null;
  /** Status: 1 = Active, 0 = Inactive */
  group_status: number | null;
}

/** Maps to `Asset` model. */
export interface Asset {
  /** Incremental identifier. */
  a_no: number;
  /** Unique string identifier. */
  a_id: string | null;
  /** Maps to `Tag.t_no`. */
  a_t_no: number | null;
  /** Maps to `Tag.t_id`. */
  a_t_id: string | null;
  /** Maps to `Location.loc_no`. */
  a_loc_no: number | null;
  /** Location. */
  a_location: string | null;
  /** Placement. */
  a_placement: string | null;
  /** Serial number. */
  a_serial: string | null;
  /** Maps to `Product.p_no`. */
  a_p_no: number | null;
  /** Date of creation. */
  a_date_insert: Date | null;
  /** Status: 1 = Active, 0 = Inactive */
  a_status: number | null;
}

/** Maps to `Product` model. */
export interface Product {
  /** Incremental identifier. */
  p_no: number;
  /** Unique string identifier. */
  p_id: string | null;
  /** Maps to `Manufacturer.m_no`. */
  p_mfg_no: number | null;
  /** Maps to `Manufacturer.m_id`. */
  p_mfg_id: string | null;
  /** Maps to `Client.c_no`. */
  p_c_no: number | null;
  /** Type: 2 = Consumable, else Primary */
  p_type: number | null;
  /** Name. */
  p_name: string | null;
  /** Description. */
  p_desc: string | null;
  /** SKU */
  p_sku: string | null;
  /** Maps to `Category.cat_no`. */
  p_cat_no: number | null;
  /** Image URL. */
  p_image_url: string | null;
  /** Sales URL. */
  p_sales_url: string | null;
  /** Date of creation. */
  p_date_insert: Date | null;
  /** Status: 1 = Active, 0 = Inactive */
  p_status: number | null;
}

/** Maps to `ProductCategory` model. */
export interface Category {
  /** Incremental identifier. */
  cat_no: number;
  /** Unique string identifier. */
  cat_id: string | null;
  /** Name. */
  cat_name: string | null;
  /** Short name. */
  cat_nic: string | null;
  /** Description. */
  cat_desc: string | null;
  /** FontAwesome icon classes. */
  cat_icon: string | null;
  /** Color. */
  cat_color: string | null;
  /** Image. */
  cat_image: string | null;
  /** Maps to `Client.c_no`, 1 = Global */
  cat_c_no: number | null;
  /** Date of creation. */
  cat_date_insert: Date | null;
  /** Status: 1 = Active, 0 = Inactive */
  cat_status: number | null;
}

/** Maps to `Manufacturer` model. */
export interface Manufacturer {
  /** Incremental identifier. */
  mfg_no: number;
  /** Unique string identifier. */
  mfg_id: string | null;
  /** Maps to `Client.c_no`, 1 = Global */
  mfg_c_no: number | null;
  /** Name. */
  mfg_name: string | null;
  /** Website URL. */
  mfg_www: string | null;
  /** Date of creation. */
  mfg_date_insert: Date | null;
  /** Status: 1 = Active, 0 = Inactive */
  mfg_status: number | null;
}

/** Maps to `Tag` model. */
export interface Tag {
  /** Incremental identifier. */
  t_no: number;
  /** Unique string identifier. */
  t_id: string | null;
  /** Serial number. */
  t_serial: number | null;
  /** Maps to `Client.c_no` */
  t_c_no: number | null;
  /** Maps to `Location.loc_no`. */
  t_loc_no: number | null;
  /** Maps to `Asset.a_no`. */
  t_a_no: number | null;
  /** Date of creation. */
  t_date_setup: Date | null;
}
