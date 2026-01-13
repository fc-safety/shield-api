// Mock for @keycloak/keycloak-admin-client

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class MockKeycloakAdminClient {
  users = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
    listGroups: jest.fn(),
    addToGroup: jest.fn(),
    delFromGroup: jest.fn(),
    makeRequest: jest.fn().mockReturnValue(jest.fn()),
  };
  groups = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
    listMembers: jest.fn(),
    setOrCreateChild: jest.fn(),
  };
  clients = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  roles = {
    find: jest.fn(),
    findOneByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
  };

  setConfig = jest.fn();
  auth = jest.fn();
}

export default MockKeycloakAdminClient;
export { MockKeycloakAdminClient as KeycloakAdminClient };
