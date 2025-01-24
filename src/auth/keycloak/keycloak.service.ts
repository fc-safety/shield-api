import type KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import { type NetworkError } from '@keycloak/keycloak-admin-client';
import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { RequestArgs } from '@keycloak/keycloak-admin-client/lib/resources/agent';
import { Inject, Injectable, Logger } from '@nestjs/common';
import JSON5 from 'json5';
import { ApiConfigService } from 'src/config/api-config.service';
import { describePermission, VALID_PERMISSIONS } from '../permissions';
import {
  FindUsersByAttributeParams,
  InternalFindUsersByAttributeParams,
  Paginated,
} from './types';

const logger = new Logger('KeycloakService');

export const KEYCLOAK_ADMIN_CLIENT = 'keycloak-admin-client';
export let KCNetworkError: typeof NetworkError | undefined;

export const MANAGED_ROLES_GROUP_NAME = 'Roles (managed by Shield API)';

const refreshAuth = async (
  client: KeycloakAdminClient,
  config: {
    adminRealm: string;
    defaultRealm: string;
    clientId: string;
    clientSecret: string;
  },
) => {
  client.setConfig({
    realmName: config.adminRealm,
  });

  await client.auth({
    grantType: 'client_credentials',
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  client.setConfig({
    realmName: config.defaultRealm,
  });
};

async function loadKeycloakModule() {
  try {
    return (await eval(
      "import('@keycloak/keycloak-admin-client')",
    )) as typeof import('@keycloak/keycloak-admin-client');
  } catch {
    return await import('@keycloak/keycloak-admin-client');
  }
}

export async function loadKeycloakAdminClient() {
  const { default: KeycloakAdminClient, NetworkError } =
    await loadKeycloakModule();
  KCNetworkError = NetworkError;
  return KeycloakAdminClient;
}

export const getShieldClient = async (
  adminClient: KeycloakAdminClient,
  clientId: string,
) => {
  return (await adminClient.clients.find({ clientId })).at(0);
};

const syncShieldClientPermissions = async (
  adminClient: KeycloakAdminClient,
  clientId: string,
) => {
  const client = await getShieldClient(adminClient, clientId);
  if (!client?.id) return;
  const roles = await adminClient.clients.listRoles({ id: client.id });
  const rolesByName = Object.fromEntries(roles.map((r) => [r.name, r]));

  const permissionsToCreate = VALID_PERMISSIONS.filter(
    (p) => !(p in rolesByName),
  );
  // Create any missing permissions (called roles in Keycloak).
  await Promise.allSettled(
    permissionsToCreate.map((p) =>
      adminClient.clients
        .createRole({
          id: client.id,
          name: p,
          description: describePermission(p),
          composite: false,
          clientRole: true,
        })
        .catch((e) => {
          logger.error(`Failed to create role: ${p}`, e);
        }),
    ),
  );
};

export const keycloakAdminClientFactory = async (config: ApiConfigService) => {
  const KCAdminClient = await loadKeycloakAdminClient();

  const keycloakClient = new KCAdminClient({
    realmName: config.get('KEYCLOAK_ADMIN_CLIENT_ADMIN_REALM'),
    baseUrl: config.get('KEYCLOAK_ADMIN_CLIENT_BASE_URL'),
  });

  const doRefreshAuth = async () =>
    refreshAuth(keycloakClient, {
      adminRealm: config.get('KEYCLOAK_ADMIN_CLIENT_ADMIN_REALM'),
      defaultRealm: config.get('KEYCLOAK_ADMIN_CLIENT_DEFAULT_REALM'),
      clientId: config.get('KEYCLOAK_ADMIN_CLIENT_CLIENT_ID'),
      clientSecret: config.get('KEYCLOAK_ADMIN_CLIENT_CLIENT_SECRET'),
    });

  await doRefreshAuth();

  setInterval(
    () => doRefreshAuth(),
    config.get('KEYCLOAK_ADMIN_CLIENT_REFRESH_INTERVAL_SECONDS') * 1000,
  );

  syncShieldClientPermissions(keycloakClient, config.get('AUTH_AUDIENCE'));

  return keycloakClient;
};

type ConditionalGroupReturnType<T extends boolean> = T extends true
  ? GroupRepresentation & { id: string }
  : { id: string };

@Injectable()
export class KeycloakService {
  constructor(
    @Inject(KEYCLOAK_ADMIN_CLIENT) public readonly client: KeycloakAdminClient,
    private readonly config: ApiConfigService,
  ) {}

  public async getOrCreateManagedRolesGroup<F extends boolean = false>(
    returnFull?: F,
  ): Promise<F extends true ? GroupRepresentation : { id: string }> {
    let group = (
      await this.client.groups.find({ q: 'managed_by:shield-api' })
    ).at(0);
    if (group) {
      if (!group.id) {
        throw new Error('Failed to create managed roles group');
      }

      return (
        returnFull ? group : { id: group.id }
      ) as ConditionalGroupReturnType<F>;
    }

    const { id } = await this.client.groups.create({
      name: MANAGED_ROLES_GROUP_NAME,
      attributes: {
        managed_by: ['shield-api'],
      },
    });

    if (!returnFull) return { id };

    group = await this.client.groups.findOne({ id });

    if (!group?.id) {
      throw new Error('Failed to create managed roles group');
    }

    return group as ConditionalGroupReturnType<F>;
  }

  async findUsersByAttribute(
    payload: FindUsersByAttributeParams = {},
    options?: Pick<RequestArgs, 'catchNotFound'>,
  ) {
    return this.client.users.makeRequest<
      InternalFindUsersByAttributeParams,
      Paginated<UserRepresentation>
    >({
      method: 'GET',
      path: '/../users-by-attribute',
      queryParamKeys: ['filter', 'order', 'limit', 'offset'],
    })(
      {
        ...payload,
        filter: payload.filter && JSON5.stringify(payload.filter),
      },
      options,
    );
  }
}
