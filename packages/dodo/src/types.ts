import type { ZodError, ZodSchema } from "zod"

export type DodoKey = {
  pk: string
  sk: string
}

export type SKCondition =
  | { eq: string }
  | { beginsWith: string }
  | { between: [string, string] }
  | { gt: string }
  | { gte: string }
  | { lt: string }
  | { lte: string }

export type QueryParams = {
  pk: string
  sk?: SKCondition
  limit?: number
  cursor?: string
  ascending?: boolean
  index?: string
  filter?: FilterExpression
  projection?: string[]
}

export type FilterExpression =
  | { attribute: string; eq: any }
  | { attribute: string; ne: any }
  | { attribute: string; exists: boolean }
  | { attribute: string; contains: string }
  | { attribute: string; in: any[] }
  | { and: FilterExpression[] }
  | { or: FilterExpression[] }
  | { not: FilterExpression }

export type QueryResult<T> = {
  items: T[]
  count: number
  scannedCount?: number
  hasMore: boolean
  cursor?: string
}

export type BatchGetParams = {
  keys: DodoKey[]
  projection?: string[]
}

export type BatchWriteParams<T> = {
  puts?: (T & DodoKey)[]
  deletes?: DodoKey[]
}

export type TransactionItem<T> =
  | { put: T & DodoKey }
  | { update: { key: DodoKey; updates: Partial<T> } }
  | { delete: DodoKey }
  | { conditionCheck: { key: DodoKey; condition: FilterExpression } }

export type Dodo = {
  get<T>(key: DodoKey): Promise<T | null>
  put<T>(item: T & DodoKey): Promise<void>
  delete(key: DodoKey): Promise<void>
  update<T>(key: DodoKey, updates: Partial<T>): Promise<void>
  query<T>(params: QueryParams): Promise<QueryResult<T>>
  scan<T>(params?: Partial<QueryParams>): Promise<QueryResult<T>>
  batchGet<T>(params: BatchGetParams): Promise<T[]>
  batchWrite<T>(params: BatchWriteParams<T>): Promise<void>
  transaction<T>(items: TransactionItem<T>[]): Promise<void>
  entity<TInput, TOutput = TInput>(
    config: EntityConfig<TInput, TOutput>,
  ): Entity<TOutput>
}

export type EntityConfig<T, TOutput = T> = {
  name: string
  schema: ZodSchema<TOutput>
  keys: KeyTransformer<TOutput>
  indexes?: IndexConfig[]
  plugins?: EntityPlugin<TOutput>[]
  defaults?: Partial<TOutput>
}

export type IndexConfig = {
  name: string
  pk: string
  sk?: string
  projection?: "ALL" | "KEYS_ONLY" | string[]
}

export type KeyTransformer<T> = {
  toKey: (item: T) => DodoKey
  fromId: (id: string) => DodoKey
  toIndex?: (item: T, indexName: string) => DodoKey
}

export type Entity<T> = {
  create(input: T): Promise<T>
  get(id: string): Promise<T | null>
  update(id: string, updates: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
  query(params?: Partial<QueryParams>): Promise<T[]>
  queryOne(params?: Partial<QueryParams>): Promise<T | null>
  queryWithCursor(params?: Partial<QueryParams>): Promise<QueryResult<T>>
  createMany(items: T[]): Promise<T[]>
  getMany(ids: string[]): Promise<(T | null)[]>
  deleteMany(ids: string[]): Promise<void>
  where(filter: FilterExpression): QueryBuilder<T>
  find(predicate: Partial<T>): Promise<T[]>
  findOne(predicate: Partial<T>): Promise<T | null>
}

export type QueryBuilder<T> = {
  pk(value: string): QueryBuilder<T>
  sk(condition: SKCondition): QueryBuilder<T>
  filter(expression: FilterExpression): QueryBuilder<T>
  limit(n: number): QueryBuilder<T>
  ascending(): QueryBuilder<T>
  descending(): QueryBuilder<T>
  using(indexName: string): QueryBuilder<T>
  select(...fields: (keyof T)[]): QueryBuilder<T>
  exec(): Promise<T[]>
  execWithCursor(): Promise<QueryResult<T>>
  first(): Promise<T | null>
}

export type EntityPlugin<T> = {
  name?: string
  beforeCreate?: (item: T) => T | Promise<T>
  afterCreate?: (item: T) => void | Promise<void>
  beforeGet?: (id: string) => void | Promise<void>
  afterGet?: (item: T | null) => T | null
  beforeUpdate?: (
    id: string,
    updates: Partial<T>,
  ) => Partial<T> | Promise<Partial<T>>
  afterUpdate?: (item: T) => void | Promise<void>
  beforeDelete?: (id: string) => void | Promise<void>
  afterDelete?: (id: string) => void | Promise<void>
  beforeQuery?: (params: QueryParams) => QueryParams
  afterQuery?: (items: T[]) => T[]
}

export type DodoPlugin = {
  name: string
  onBeforePut?: (item: any) => any
  onAfterGet?: (item: any) => any
  onBeforeQuery?: (params: QueryParams) => QueryParams
  onAfterQuery?: (result: QueryResult<any>) => QueryResult<any>
  onBeforeDelete?: (key: DodoKey) => void | Promise<void>
}

export type DodoConfig = {
  table: string
  region?: string
  endpoint?: string
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
  }
  plugins?: DodoPlugin[]
  retries?: number
  timeout?: number
  logging?: boolean | LogConfig
}

export type LogConfig = {
  operations?: boolean
  queries?: boolean
  errors?: boolean
  performance?: boolean
}

export type WithKeys<T> = T & DodoKey
export type WithTimestamps<T> = T & {
  createdAt: string
  updatedAt: string
}
export type WithSoftDelete<T> = T & {
  deleted?: boolean
  deletedAt?: string
}
export type WithTenant<T> = T & {
  tenantId: string
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

export type DodoError =
  | { type: "NOT_FOUND"; id: string; entity: string }
  | { type: "VALIDATION"; errors: ZodError }
  | { type: "CONFLICT"; message: string }
  | { type: "TRANSACTION"; message: string }
  | { type: "NETWORK"; error: unknown }
