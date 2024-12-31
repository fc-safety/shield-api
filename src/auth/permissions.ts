export const VISIBILITY = {
  GLOBAL: 'visibility:global',
  CLIENT_SITES: 'visibility:client-sites',
  SITE_GROUP: 'visibility:site-group',
  MULTI_SITE: 'visibility:multi-site',
  SINGLE_SITE: 'visibility:single-site',
  SELF: 'visibility:self',
} as const;

export type TVisibilityPermissions =
  (typeof VISIBILITY)[keyof typeof VISIBILITY];
export type TVisibility = TVisibilityPermissions extends `visibility:${infer R}`
  ? R
  : never;

export type TPermission = TVisibilityPermissions;

export const VALID_PERMISSIONS = [...Object.values(VISIBILITY)];
export const isValidPermission = (p: string): p is TPermission =>
  VALID_PERMISSIONS.includes(p as TPermission);
