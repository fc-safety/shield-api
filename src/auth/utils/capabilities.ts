/**
 * Capability-based permissions for the Shield API.
 *
 * Capabilities are high-level permissions that bundle related operations.
 * Unlike the old CRUD-based permissions (create:assets, read:assets, etc.),
 * capabilities represent what a user can DO (perform-inspections, manage-assets).
 *
 * This makes permission management much simpler for administrators:
 * - Inspector role: perform-inspections, submit-requests
 * - Site Manager role: + manage-assets, manage-routes, resolve-alerts, view-reports
 * - Client Admin role: + manage-users, configure-products, approve-requests
 */

export const CAPABILITIES = {
  /** Read tags/assets/questions and create inspection records */
  PERFORM_INSPECTIONS: 'perform-inspections',

  /** Create product and supply requests */
  SUBMIT_REQUESTS: 'submit-requests',

  /** Create, edit, and delete assets, consumables, and tags */
  MANAGE_ASSETS: 'manage-assets',

  /** Create and edit inspection routes and schedules */
  MANAGE_ROUTES: 'manage-routes',

  /** Review and resolve alerts from failed inspections */
  RESOLVE_ALERTS: 'resolve-alerts',

  /** Access compliance reports and statistics */
  VIEW_REPORTS: 'view-reports',

  /** Create users, assign roles, and send invitations */
  MANAGE_USERS: 'manage-users',

  /** Manage product catalog, categories, questions, and manufacturers */
  CONFIGURE_PRODUCTS: 'configure-products',

  /** Approve or reject product and supply requests */
  APPROVE_REQUESTS: 'approve-requests',

  /** Generate tag URLs and program NFC tags (global/paid resource) */
  PROGRAM_TAGS: 'program-tags',

  /** Register assets to tags */
  REGISTER_TAGS: 'register-tags',
} as const;

export type TCapability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

export const VALID_CAPABILITIES = Object.values(CAPABILITIES);

export const isValidCapability = (c: string): c is TCapability =>
  VALID_CAPABILITIES.includes(c as TCapability);

/**
 * Human-readable labels for capabilities (for UI display).
 */
export const CAPABILITY_LABELS: Record<TCapability, string> = {
  'perform-inspections': 'Perform Inspections',
  'submit-requests': 'Submit Requests',
  'manage-assets': 'Manage Assets',
  'manage-routes': 'Manage Inspection Routes',
  'resolve-alerts': 'Resolve Alerts',
  'view-reports': 'View Reports',
  'manage-users': 'Manage Users',
  'configure-products': 'Configure Products',
  'approve-requests': 'Approve Requests',
  'program-tags': 'Program Tags',
  'register-tags': 'Register Tags',
};

/**
 * Descriptions for capabilities (for UI tooltips/help text).
 */
export const CAPABILITY_DESCRIPTIONS: Record<TCapability, string> = {
  'perform-inspections':
    'Read tags, assets, and questions; create inspection records',
  'submit-requests': 'Create product and supply requests',
  'manage-assets': 'Create, edit, and delete assets, consumables, and tags',
  'manage-routes': 'Create and edit inspection routes and schedules',
  'resolve-alerts': 'Review and resolve alerts triggered from inspections',
  'view-reports': 'Access compliance reports and statistics',
  'manage-users': 'Create users, assign roles, and send invitations',
  'configure-products': 'Manage product catalog, categories, and questions',
  'approve-requests': 'Approve or reject product and supply requests',
  'program-tags': 'Generate tag URLs and program NFC tags',
  'register-tags': 'Register assets to tags',
};
