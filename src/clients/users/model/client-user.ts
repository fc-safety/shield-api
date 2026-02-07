import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { databaseRoleToRole, Role } from 'src/admin/roles/model/role';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export interface ClientUser {
  id: string;
  createdOn: string;
  modifiedOn: string;
  idpId: string;
  active: boolean;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phoneNumber?: string;
  username?: string;
  siteExternalId: string;
  clientExternalId: string;
  /** @deprecated Use roles array instead. Returns first role for backward compatibility. */
  roleName?: string;
  roles: Pick<
    Role,
    'id' | 'name' | 'scope' | 'capabilities' | 'notificationGroups'
  >[];
  position?: string;
}

export const keycloakUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  attributes: z.object({
    user_id: z.array(z.string()).min(1),
    client_id: z.array(z.string()).min(1),
    site_id: z.array(z.string()).min(1),
    phone_number: z.array(z.string()).optional(),
    user_position: z.array(z.string()).optional(),
    user_created_at: z.array(z.string()),
    user_updated_at: z.array(z.string()),
  }),
});

export type ValidatedUserRepresentation = UserRepresentation &
  z.infer<typeof keycloakUserSchema>;

export const validateKeycloakUser = (
  user: UserRepresentation,
): user is ValidatedUserRepresentation =>
  keycloakUserSchema.safeParse(user).success;

/**
 * Converts a Keycloak user representation and roles from database to ClientUser.
 * Roles are now loaded from the database via PersonClientAccess, not Keycloak groups.
 */
export const keycloakUserAsClientUser = (
  user: ValidatedUserRepresentation,
  roles: Role[],
): ClientUser => {
  return {
    id: user.attributes.user_id[0],
    createdOn: user.attributes.user_created_at[0],
    modifiedOn: user.attributes.user_updated_at[0],
    idpId: user.id,
    active: !!user.enabled,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phoneNumber: user.attributes.phone_number?.[0],
    username: user.username,
    siteExternalId: user.attributes.site_id[0],
    clientExternalId: user.attributes.client_id[0],
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      scope: r.scope,
      capabilities: r.capabilities,
      notificationGroups: r.notificationGroups,
    })),
    // Backward compatibility: return first role or undefined
    roleName: roles[0]?.name ?? undefined,
    position: user.attributes.user_position?.[0],
  };
};

/**
 * Converts a PersonClientAccess record with relations to ClientUser.
 * Used for database-first user listings.
 */
export const personClientAccessToClientUser = (
  pca: Prisma.PersonClientAccessGetPayload<{
    include: {
      person: true;
      site: { select: { externalId: true } };
      client: { select: { externalId: true } };
      role: true;
    };
  }>,
): ClientUser => {
  const { person, site, client, role } = pca;
  const convertedRole = databaseRoleToRole(role);

  return {
    id: person.id,
    idpId: person.idpId ?? '',
    createdOn: person.createdOn.toISOString(),
    modifiedOn: person.modifiedOn.toISOString(),
    active: person.active,
    firstName: person.firstName,
    lastName: person.lastName,
    name: `${person.firstName} ${person.lastName}`.trim(),
    email: person.email,
    username: person.username ?? undefined,
    phoneNumber: person.phoneNumber ?? undefined,
    position: person.position ?? undefined,
    siteExternalId: site.externalId,
    clientExternalId: client.externalId,
    roles: [
      {
        id: convertedRole.id,
        name: convertedRole.name,
        scope: convertedRole.scope,
        capabilities: convertedRole.capabilities,
        notificationGroups: convertedRole.notificationGroups,
      },
    ],
    roleName: convertedRole.name,
  };
};
