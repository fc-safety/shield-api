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
  /** Maps to `Location.loc_id`. */
  a_loc_id: string | null;
  /** Location. */
  a_location: string | null;
  /** Placement. */
  a_placement: string | null;
  /** Serial number. */
  a_serial: string | null;
  /** Maps to `Product.p_no`. */
  a_p_no: number | null;
  /** Maps to `ProductCategory.cat_no`. */
  a_cat_no: number | null;
  /** Maps to `Manufacturer.mfg_no`. */
  a_mfg_no: number | null;
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

/** Maps to `Inspection` model. */
export interface Log {
  /** Incremental identifier. Primary key. */
  log_no: number;
  /** Unique string identifier. External ID. */
  log_id: string | null;
  /** Date and time of the log. */
  log_utc: Date | null;
  /** Epoch timestamp. */
  log_epoch: number | null;
  /** IP address. */
  log_ip: string | null;
  /** Latitude. */
  log_lat: string | null;
  /** Longitude. */
  log_long: string | null;
  /** Location. @deprecated most values are null. */
  log_location: string | null;
  /** User agent. */
  log_useragent: string | null;
  /** Memo. @deprecated most values are null. */
  log_memo: string | null;
  /** Type of the log. USAGE UNKNOWN. */
  log_type: number | null;
  /** Maps to `Tag.t_id`. @deprecated most values are null. */
  log_t_id: string | null;
  /** Maps to `Tag.t_no`. Foreign key. */
  log_t_no: number | null;
  /** Maps to `Asset.a_id`. @deprecated most values are null. */
  log_a_id: string | null;
  /** Maps to `Asset.a_no`. Foreign key. */
  log_a_no: number | null;
  /** Maps to `Client.c_id`. @deprecated most values are null. */
  log_c_id: string | null;
  /** Maps to `Client.c_no`. Foreign key. */
  log_c_no: number | null;
  /** Maps to `User.u_no`. Foreign key. */
  log_u_no: number | null;
  /** USAGE UNKONWN. @deprecated most values are null. */
  log_pc: string | null;
  /** User name. */
  log_u_name: string | null;
  /** JSON string of inspection responses. Key value pairs of question IDs and responses. */
  log_data: string | null;
  /** USAGE UNKNOWN. @deprecated most values are null. */
  log_status: number | null;
}

/** Maps to Keycloak user combined with `Person` model. */
export interface User {
  /** Incremental identifier. Primary key. */
  u_no: number;
  /** Unique string identifier. External ID. */
  u_id: string | null;
  /** Maps to `Client.c_no`. Foreign key. @deprecated use `u_c_no` instead. */
  _c_no: number | null;
  /** Maps to `Client.c_id`. @deprecated use `u_c_id` instead. */
  _c_id: string | null;
  /** Maps to `Client.c_no`. Foreign key. */
  u_c_no: number | null;
  /** Maps to `Client.c_id`. @deprecated most values are null. */
  u_c_id: string | null;
  /** Maps to `Location.loc_no`. Foreign key. */
  u_loc_no: number | null;
  /** Maps to `Location.loc_id`. @deprecated most values are null. */
  u_loc_id: string | null;
  /** First name. */
  u_first: string | null;
  /** Last name. */
  u_last: string | null;
  /** Username. */
  u_name: string | null;
  /** Password. */
  u_pass: string | null;
  /** SHA hash of the password. @deprecated most values are null. */
  u_SHA: string | null;
  /** Email. */
  u_email: string | null;
  /** Email verification status. @deprecated most values are null. */
  u_email_verify: number | null;
  /** Email active status. @deprecated most values are null. */
  u_email_active: number | null;
  /** Cell phone number. */
  u_cell: string | null;
  /** Cell phone verification status. @deprecated most values are null. */
  u_cell_verify: number | null;
  /** Phone number. */
  u_phone: string | null;
  /** Note. */
  u_note: string | null;
  /** Role. (Description only, not used for authorization.) */
  u_role: string | null;
  /** Admin status. 3 = Unknown (unused), 2 = Supervisor -> Site Coordinator, 1 = Administrator -> Program Manager, 0 = Inspector -> Site Inspector */
  u_admin: number | null;
  /** Source. */
  u_source: string | null;
  /** Date of creation. */
  u_date_insert: Date | null;
  /** Date of update. */
  u_date_update: Date | null;
  /** Date of deletion. */
  u_date_delete: Date | null;
  /** Date of last login. */
  u_date_login: Date | null;
  /** Date of terms of service acceptance. */
  u_date_tos: Date | null;
  /** Status: 1 = Active, 0 = Inactive */
  u_status: number | null;
}

export interface UserJoin {
  /** Incremental identifier. Primary key. */
  uj_no: number;
  /** Unique string identifier. External ID. */
  uj_id: string | null;
  /** Maps to `Client.c_no`. Foreign key. */
  uj_c_no: number | null;
  /** Maps to `User.u_no`. Foreign key. */
  uj_u_no: number | null;
  /** Maps to `Location.loc_no`. Foreign key. */
  uj_loc_no: number | null;
  uj_access: number | null;
  uj_admin: number | null;
  uj_u_admin: number | null;
  uj_utc: Date | null;
}

/** Maps to `AssetQuestion` model. */
export interface Question {
  /** Incremental identifier. Primary key. */
  q_no: number;
  /** Unique string identifier. External ID. */
  q_id: string | null;
  /** USAGE UNKNOWN. @deprecated most values are null. */
  at_id: string | null;
  /** USAGE UNKNOWN. @deprecated most values are null. */
  at_no: number | null;
  /** USAGE UNKNOWN. @deprecated most values are null. */
  q_at_id: string | null;
  /** USAGE UNKNOWN. @deprecated most values are null. */
  q_at_no: number | null;
  /** Precursor to Product Category. @deprecated most values are null. */
  q_group: string | null;
  /** Maps to `Client.c_no`. Foreign key. */
  q_c_no: number | null;
  /** Maps to `Category.cat_no`. Foreign key. */
  q_cat_no: number | null;
  /** Maps to `Manufacturer.mfg_no`. Foreign key. */
  q_mfg_no: number | null;
  /** Maps to `Product.p_no`. Foreign key. */
  q_p_no: number | null;
  /** Type of the question. 2 = Inspection, 1 = Setup */
  q_type: string | null;
  /** Regulatory code. */
  q_code: string | null;
  /** Sort order. */
  q_sort: number | null;
  /** Question prompt. */
  q_text: string | null;
  /** Required. 1 = Yes, 0 = No */
  q_required: number | null;
  /** Input type. 1 = Binary, 2 = Text, 3 = Textarea, 4 = Date, 5 = Image, 7 = Indeterminate Binary */
  q_input: number | null;
  /** Alert. 1 = Yes, Else No. */
  q_alert: number | null;
  /** USAGE UNKNOWN. @deprecated most values are null. */
  q_alert_10: string | null;
  /** Alert criteria. Alert if answer is equal to this value. */
  q_alert_data: string | null;
  /** Auto-configure consumable. 1 = Yes, Else No. */
  q_inventory: number | null;
  /** Name of auto-configured consumable. */
  q_inventory_data: string | null;
  /** Condition: State. Maps to REGION condition. */
  q_state: string | null;
  /** Condition: Country. @deprecated most values are null. */
  q_country: string | null;
  /** Image URL. @deprecated not in use. */
  q_image: string | null;
  /** Date of creation. */
  q_date_insert: Date | null;
  /** Date of update. */
  q_date_update: Date | null;
  /** Date of lock. */
  q_date_locked: Date | null;
  /** Date of deletion. */
  q_date_delete: Date | null;
  /** Status: 1 = Active, Else Inactive. */
  q_status: number | null;
}
