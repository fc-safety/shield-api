export interface KeycloakEvent {
  type: string;
  realmId: string;
  clientId?: string;
  userId?: string;
  ipAddress?: string;
  time: number;
  details?: Record<string, string>;
  // Admin events
  resourceType?: string;
  operationType?: string;
  resourcePath?: string;
  /** JSON-encoded representation of the resource */
  representation?: string;
  /** Resource ID (e.g., Keycloak user ID for USER events) */
  resourceId?: string;
}

export interface KeycloakUserRepresentation {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  emailVerified?: boolean;
  enabled?: boolean;
  attributes?: {
    user_id?: string[];
    client_id?: string[];
    site_id?: string[];
    phone_number?: string[];
    user_position?: string[];
    user_created_at?: string[];
    user_updated_at?: string[];
  };
}
