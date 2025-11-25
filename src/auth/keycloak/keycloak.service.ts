import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { RequestArgs } from '@keycloak/keycloak-admin-client/lib/resources/agent';
import { Inject, Injectable, Logger } from '@nestjs/common';
import JSON5 from 'json5';
import EventEmitter from 'node:events';
import pRetry from 'p-retry';
import { isNil } from 'src/common/utils';
import { ApiConfigService } from 'src/config/api-config.service';
import { describePermission, VALID_PERMISSIONS } from '../permissions';
import {
  FindUsersByAttributeParams,
  InternalFindUsersByAttributeParams,
  Paginated,
} from './types';

const logger = new Logger('KeycloakService');

export const KEYCLOAK_ADMIN_CLIENT = 'keycloak-admin-client';

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
  const keycloakClient = new KeycloakAdminClient({
    realmName: config.get('KEYCLOAK_ADMIN_CLIENT_ADMIN_REALM'),
    baseUrl: config.get('KEYCLOAK_ADMIN_CLIENT_BASE_URL'),
  });

  const doRefreshAuth = async () =>
    pRetry(
      async () =>
        refreshAuth(keycloakClient, {
          adminRealm: config.get('KEYCLOAK_ADMIN_CLIENT_ADMIN_REALM'),
          defaultRealm: config.get('KEYCLOAK_ADMIN_CLIENT_DEFAULT_REALM'),
          clientId: config.get('KEYCLOAK_ADMIN_CLIENT_CLIENT_ID'),
          clientSecret: config.get('KEYCLOAK_ADMIN_CLIENT_CLIENT_SECRET'),
        }),
      { retries: 1 },
    ).catch((e) => {
      logger.error(
        'Keycloak admin client failed to (re)establish authentication.',
        e,
      );
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

const resetPasswordEmail = (client: KeycloakAdminClient) => {
  return client.users.makeRequest<
    { id: string; client_id?: string; redirect_uri?: string },
    void
  >({
    method: 'PUT',
    path: '/{id}/reset-password-email',
    urlParamKeys: ['id'],
  });
};

type ModifiedKeycloakAdminClient = KeycloakAdminClient & {
  users: {
    resetPasswordEmail: ReturnType<typeof resetPasswordEmail>;
  };
};

@Injectable()
export class KeycloakService {
  public readonly events = {
    users: new EventEmitter<{
      create: [{ id: string }];
      update: [{ id: string }];
      delete: [{ id: string }];
      addToGroup: [{ id: string; groupId: string }];
      delFromGroup: [{ id: string; groupId: string }];
    }>(),
  };

  constructor(
    @Inject(KEYCLOAK_ADMIN_CLIENT)
    public readonly client: ModifiedKeycloakAdminClient,
    private readonly config: ApiConfigService,
  ) {
    this.client.users.resetPasswordEmail = resetPasswordEmail(this.client);

    // Hook into client.users.create() and emit event when it is called.
    this.client.users.create = new Proxy(this.client.users.create, {
      apply: (target, thisArg, argumentsList) => {
        const result = target.apply(thisArg, argumentsList) as ReturnType<
          typeof target
        >;
        result.then((r) => this.events.users.emit('create', r));
        return result;
      },
    });

    // Hoook into client.users.update() and emit event when it is called.
    this.client.users.update = new Proxy(this.client.users.update, {
      apply: (
        target,
        thisArg,
        argumentsList: Parameters<typeof this.client.users.update>,
      ) => {
        const result = target.apply(thisArg, argumentsList) as ReturnType<
          typeof target
        >;
        result.then((r) =>
          this.events.users.emit('update', { id: argumentsList[0].id }),
        );
        return result;
      },
    });

    // Hook into client.users.delete() and emit event when it is called.
    this.client.users.del = new Proxy(this.client.users.del, {
      apply: (
        target,
        thisArg,
        argumentsList: Parameters<typeof this.client.users.del>,
      ) => {
        const result = target.apply(thisArg, argumentsList) as ReturnType<
          typeof target
        >;
        result.then(
          (r) =>
            argumentsList[0] &&
            this.events.users.emit('delete', { id: argumentsList[0].id }),
        );
        return result;
      },
    });

    // Hook into client.users.addToGroup() and emit event when it is called.
    this.client.users.addToGroup = new Proxy(this.client.users.addToGroup, {
      apply: (
        target,
        thisArg,
        argumentsList: Parameters<typeof this.client.users.addToGroup>,
      ) => {
        const result = target.apply(thisArg, argumentsList) as ReturnType<
          typeof target
        >;
        result.then(
          (r) =>
            argumentsList[0] &&
            this.events.users.emit('addToGroup', {
              id: argumentsList[0].id,
              groupId: argumentsList[0].groupId,
            }),
        );
        return result;
      },
    });

    // Hook into client.users.delFromGroup() and emit event when it is called.
    this.client.users.delFromGroup = new Proxy(this.client.users.delFromGroup, {
      apply: (
        target,
        thisArg,
        argumentsList: Parameters<typeof this.client.users.delFromGroup>,
      ) => {
        const result = target.apply(thisArg, argumentsList) as ReturnType<
          typeof target
        >;
        result.then(
          (r) =>
            argumentsList[0] &&
            this.events.users.emit('delFromGroup', {
              id: argumentsList[0].id,
              groupId: argumentsList[0].groupId,
            }),
        );
        return result;
      },
    });
  }

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

  public static mergeAttributes(
    attributes: Record<string, string[]>,
    ...attributesToAdd: [string, string | string[] | undefined | null][]
  ) {
    return attributesToAdd.reduce((acc, [key, attr]) => {
      if (!isNil(attr)) acc[key] = Array.isArray(attr) ? attr : [attr];
      return acc;
    }, attributes);
  }

  /**
   * Transactionally add a user to multiple groups.
   * If any operation fails, all successful operations are rolled back.
   *
   * @param userId User ID to add to groups
   * @param groupIds Array of group IDs to add user to
   * @returns Promise that resolves if all operations succeed, rejects if any fail
   * @throws Error with details if operations fail or rollback fails
   */
  public async addUserToGroupsTransactional(
    userId: string,
    groupIds: string[],
  ): Promise<void> {
    if (groupIds.length === 0) return;

    logger.log(
      `Starting transactional add: user ${userId} to ${groupIds.length} groups`,
    );

    // Attempt to add user to all groups concurrently
    const results = await Promise.allSettled(
      groupIds.map((groupId) =>
        this.client.users.addToGroup({
          id: userId,
          groupId,
        }),
      ),
    );

    // Track successes and failures
    const successes: string[] = [];
    const failures: Array<{ groupId: string; error: unknown }> = [];

    results.forEach((result, index) => {
      const groupId = groupIds[index];
      if (result.status === 'fulfilled') {
        successes.push(groupId);
      } else {
        failures.push({ groupId, error: result.reason });
        logger.error(
          `Failed to add user ${userId} to group ${groupId}`,
          result.reason,
        );
      }
    });

    // If all succeeded, we're done
    if (failures.length === 0) {
      logger.log(
        `Successfully added user ${userId} to ${successes.length} groups`,
      );
      return;
    }

    // Some operations failed - need to rollback successful ones
    logger.warn(
      `Rolling back ${successes.length} successful operations due to ${failures.length} failures`,
    );

    const rollbackResults = await Promise.allSettled(
      successes.map((groupId) =>
        this.client.users.delFromGroup({
          id: userId,
          groupId,
        }),
      ),
    );

    // Track rollback failures
    const rollbackFailures: Array<{ groupId: string; error: unknown }> = [];
    rollbackResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const groupId = successes[index];
        rollbackFailures.push({ groupId, error: result.reason });
        logger.error(
          `CRITICAL: Failed to rollback group ${groupId} for user ${userId}`,
          result.reason,
        );
      }
    });

    // Build comprehensive error message
    const errorMessage = [
      `Transaction failed: ${failures.length} operations failed while adding user ${userId} to groups.`,
      `Failed operations: ${failures.map((f) => f.groupId).join(', ')}`,
      rollbackFailures.length > 0
        ? `CRITICAL: Rollback failed for ${rollbackFailures.length} groups: ${rollbackFailures.map((f) => f.groupId).join(', ')}. Manual intervention required!`
        : `Successfully rolled back ${successes.length} operations.`,
    ].join('\n');

    const error = new Error(errorMessage);
    (error as any).failures = failures;
    (error as any).rollbackFailures = rollbackFailures;
    (error as any).userId = userId;
    (error as any).groupIds = groupIds;

    throw error;
  }

  /**
   * Transactionally remove a user from multiple groups.
   * If any operation fails, all successful operations are rolled back.
   *
   * @param userId User ID to remove from groups
   * @param groupIds Array of group IDs to remove user from
   * @returns Promise that resolves if all operations succeed, rejects if any fail
   * @throws Error with details if operations fail or rollback fails
   */
  public async removeUserFromGroupsTransactional(
    userId: string,
    groupIds: string[],
  ): Promise<void> {
    if (groupIds.length === 0) return;

    logger.log(
      `Starting transactional remove: user ${userId} from ${groupIds.length} groups`,
    );

    // Attempt to remove user from all groups concurrently
    const results = await Promise.allSettled(
      groupIds.map((groupId) =>
        this.client.users.delFromGroup({
          id: userId,
          groupId,
        }),
      ),
    );

    // Track successes and failures
    const successes: string[] = [];
    const failures: Array<{ groupId: string; error: unknown }> = [];

    results.forEach((result, index) => {
      const groupId = groupIds[index];
      if (result.status === 'fulfilled') {
        successes.push(groupId);
      } else {
        failures.push({ groupId, error: result.reason });
        logger.error(
          `Failed to remove user ${userId} from group ${groupId}`,
          result.reason,
        );
      }
    });

    // If all succeeded, we're done
    if (failures.length === 0) {
      logger.log(
        `Successfully removed user ${userId} from ${successes.length} groups`,
      );
      return;
    }

    // Some operations failed - need to rollback successful ones by re-adding
    logger.warn(
      `Rolling back ${successes.length} successful removals due to ${failures.length} failures`,
    );

    const rollbackResults = await Promise.allSettled(
      successes.map((groupId) =>
        this.client.users.addToGroup({
          id: userId,
          groupId,
        }),
      ),
    );

    // Track rollback failures
    const rollbackFailures: Array<{ groupId: string; error: unknown }> = [];
    rollbackResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const groupId = successes[index];
        rollbackFailures.push({ groupId, error: result.reason });
        logger.error(
          `CRITICAL: Failed to rollback group ${groupId} for user ${userId}`,
          result.reason,
        );
      }
    });

    // Build comprehensive error message
    const errorMessage = [
      `Transaction failed: ${failures.length} operations failed while removing user ${userId} from groups.`,
      `Failed operations: ${failures.map((f) => f.groupId).join(', ')}`,
      rollbackFailures.length > 0
        ? `CRITICAL: Rollback failed for ${rollbackFailures.length} groups: ${rollbackFailures.map((f) => f.groupId).join(', ')}. Manual intervention required!`
        : `Successfully rolled back ${successes.length} operations.`,
    ].join('\n');

    const error = new Error(errorMessage);
    (error as any).failures = failures;
    (error as any).rollbackFailures = rollbackFailures;
    (error as any).userId = userId;
    (error as any).groupIds = groupIds;

    throw error;
  }
}
