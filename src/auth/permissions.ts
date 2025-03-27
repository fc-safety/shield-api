import { Prisma } from '@prisma/client';

// Utility type to replace hyphens with underscores
type ReplaceHyphensAndUppercase<T extends string> =
  T extends `${infer Start}-${infer End}`
    ? `${Uppercase<Start>}_${ReplaceHyphensAndUppercase<End>}`
    : Uppercase<T>;

type CamelToKebab<T extends string> = T extends `${infer First}${infer Rest}`
  ? Rest extends Uncapitalize<Rest>
    ? `${Lowercase<First>}${CamelToKebab<Rest>}`
    : `${Lowercase<First>}-${CamelToKebab<Rest>}`
  : T;

type Pluralize<S extends string> = S extends `${infer Base}s`
  ? `${Base}s` // Already ends in -s
  : S extends `${string}sh` | `${string}ch` | `${string}x` | `${string}z`
    ? `${S}es` // Ends in -sh, -ch, -x, -z
    : S extends `${infer Base}y`
      ? Base extends `${string}${'a' | 'e' | 'i' | 'o' | 'u'}` // Ends in -y with a vowel before it
        ? `${S}s`
        : `${Base}ies` // Ends in -y with a consonant before it
      : S extends 'child'
        ? 'children' // Irregulars
        : S extends 'person'
          ? 'people'
          : S extends 'man'
            ? 'men'
            : S extends 'woman'
              ? 'women'
              : S extends 'tooth'
                ? 'teeth'
                : S extends 'foot'
                  ? 'feet'
                  : S extends 'mouse'
                    ? 'mice'
                    : S extends 'goose'
                      ? 'geese'
                      : S extends 'ox'
                        ? 'oxen'
                        : `${S}s`; // Default to adding -s

const replaceHyphensAndUppercase = <T extends string>(s: T) => {
  return s.replace(/-/g, '_').toUpperCase() as ReplaceHyphensAndUppercase<T>;
};

const buildPermissions = <N extends string, P extends string>(
  namespace: N,
  permissions: readonly P[],
) => {
  return Object.fromEntries(
    permissions.map((p) => [
      replaceHyphensAndUppercase(p),
      `${namespace}:${p}`,
    ]),
  ) as Record<ReplaceHyphensAndUppercase<P>, `${N}:${P}`>;
};

export const VISIBILITY_VALUES = [
  'global',
  'client-sites',
  'site-group',
  'multi-site',
  'single-site',
  'self',
] as const;

// Visibility permissions (determines scope of user access).
export const VISIBILITY = buildPermissions('visibility', VISIBILITY_VALUES);

export type TVisibilityPermission =
  (typeof VISIBILITY)[keyof typeof VISIBILITY];
export type TVisibility = (typeof VISIBILITY_VALUES)[number];

export const VISIBILITY_PERMISSIONS = Object.values(VISIBILITY);

// All readable/managable resources.
const prismaResources = [
  'assets',
  'consumables',
  'tags',
  'inspections',
  'inspection-routes',
  'asset-questions',
  'alerts',
  'product-requests',
  'clients',
  'sites',
  'people',
  'product-categories',
  'manufacturers',
  'products',
  'ansi-categories',
] as const satisfies Pluralize<CamelToKebab<Prisma.ModelName>>[];

const resources = [...prismaResources, 'users'] as const;

const readonlyResources: (typeof resources)[number][] = ['alerts'];

export type TResource = (typeof resources)[number];
export type TReadonlyResource = (typeof readonlyResources)[number];

export const RESOURCE = Object.fromEntries(
  resources.map((r) => [replaceHyphensAndUppercase(r), r]),
) as {
  [R in TResource as ReplaceHyphensAndUppercase<R>]: R;
};

// Common CRUD permissions for above resources.

const writeableResources = resources.filter(
  (r) => !readonlyResources.includes(r),
);

export const CREATE = buildPermissions('create', writeableResources);
export const READ = buildPermissions('read', resources);
export const UPDATE = buildPermissions('update', writeableResources);
export const DELETE = buildPermissions('delete', writeableResources);

export const MANAGE = buildPermissions('manage', resources);

export type TCreatePermission = (typeof CREATE)[keyof typeof CREATE];
export type TReadPermission = (typeof READ)[keyof typeof READ];
export type TUpdatePermission = (typeof UPDATE)[keyof typeof UPDATE];
export type TDeletePermission = (typeof DELETE)[keyof typeof DELETE];

export type TManagePermissions = (typeof MANAGE)[keyof typeof MANAGE];

// Specific/custom actions on resources.
export const SETUP = buildPermissions('setup', [RESOURCE.ASSETS] as const);
export const UPDATE_STATUS = buildPermissions('update-status', [
  RESOURCE.PRODUCT_REQUESTS,
] as const);
export const CANCEL = buildPermissions('cancel', [
  RESOURCE.PRODUCT_REQUESTS,
] as const);
export const RESOLVE = buildPermissions('resolve', [RESOURCE.ALERTS] as const);
export const REVIEW = buildPermissions('review', [
  RESOURCE.PRODUCT_REQUESTS,
] as const);
export const NOTIFY = buildPermissions('notify', [RESOURCE.USERS] as const);

export type TSetupPermission = (typeof SETUP)[keyof typeof SETUP];
export type TUpdateStatusPermission =
  (typeof UPDATE_STATUS)[keyof typeof UPDATE_STATUS];
export type TCancelPermission = (typeof CANCEL)[keyof typeof CANCEL];
export type TResolvePermission = (typeof RESOLVE)[keyof typeof RESOLVE];
export type TReviewPermission = (typeof REVIEW)[keyof typeof REVIEW];
export type TNotifyPermission = (typeof NOTIFY)[keyof typeof NOTIFY];
export type TActionPermission =
  | TCreatePermission
  | TReadPermission
  | TUpdatePermission
  | TDeletePermission
  | TManagePermissions
  | TSetupPermission
  | TUpdateStatusPermission
  | TCancelPermission
  | TResolvePermission
  | TReviewPermission
  | TNotifyPermission;

// Parse permissions into { namespace: string; value: string }
type ParsePermissions<T extends string> = T extends `${infer N}:${infer V}`
  ? { namespace: N; value: V }
  : never;

// Convert { namespace: string; value: string }[] to { namespace: string; value: string }
type NamespacesToValues<T extends { namespace: string; value: string }> = {
  [N in T['namespace']]: Extract<T, { namespace: N }>['value'];
};

export type TAction = TActionPermission extends `${infer A}:${TResource}`
  ? A
  : never;

export type TPermission = TVisibilityPermission | TActionPermission;

export const ACTION_PERMISSIONS = [
  ...Object.values(CREATE),
  ...Object.values(READ),
  ...Object.values(UPDATE),
  ...Object.values(DELETE),
  ...Object.values(MANAGE),
  ...Object.values(SETUP),
  ...Object.values(UPDATE_STATUS),
  ...Object.values(CANCEL),
  ...Object.values(RESOLVE),
  ...Object.values(REVIEW),
  ...Object.values(NOTIFY),
];

export const VALID_PERMISSIONS = [
  ...VISIBILITY_PERMISSIONS,
  ...ACTION_PERMISSIONS,
];
export const isValidPermission = (p: string): p is TPermission =>
  VALID_PERMISSIONS.includes(p as TPermission);

type ActionResourceMap = NamespacesToValues<
  ParsePermissions<TActionPermission>
>;
export type ActionableResource<A extends TAction> = ActionResourceMap[A];

export const getResourcePermission = <A extends TAction>(
  action: A,
  resource: ActionableResource<A>,
) => {
  return `${action}:${resource}` as TActionPermission;
};

export const humanize = (s: string) =>
  s.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
export const titleize = (s: string) =>
  humanize(s).replace(/(?:^|\s)(.)/g, (m) => m.toUpperCase());

export const namePermission = (p: TPermission) => {
  const [namespace, value] = p.split(':');

  if (VISIBILITY_PERMISSIONS.includes(p as TVisibilityPermission)) {
    return `${titleize(value)}`;
  }

  return titleize(`${namespace} ${value}`);
};

export const describePermission = (p: TPermission) => {
  const [namespace, value] = p.split(':');

  if (VISIBILITY_PERMISSIONS.includes(p as TVisibilityPermission)) {
    return `Has visibility of ${humanize(value)}`;
  }

  return `Can ${humanize(namespace)} ${humanize(value)}`;
};
