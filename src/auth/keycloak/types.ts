export interface CustomQueryFilterCondition {
  key: string;
  op?:
    | 'eq'
    | 'ends'
    | 'starts'
    | 'contains'
    | 'in'
    | 'gt'
    | 'lt'
    | 'gte'
    | 'lte';
  value: string | string[];
  not?: boolean;
  ignoreCase?: boolean;
}

export interface CustomQueryFilterGroupCondition {
  key?: string;
  op?: 'any' | 'all' | 'none';
  groups: string[];
}

export interface CustomQueryFilter {
  AND?: CustomQueryFilter[];
  OR?: CustomQueryFilter[];
  q?: CustomQueryFilterCondition;
  groupQ?: CustomQueryFilterGroupCondition;
}

interface BaseFindUsersByAttributeParams {
  order?: string;
  limit?: number;
  offset?: number;
}

export interface FindUsersByAttributeParams
  extends BaseFindUsersByAttributeParams {
  filter?: CustomQueryFilter;
}

export interface InternalFindUsersByAttributeParams
  extends BaseFindUsersByAttributeParams {
  filter?: string;
}

export interface Paginated<T> {
  limit: number;
  offset: number;
  count: number;
  results: T[];
}
