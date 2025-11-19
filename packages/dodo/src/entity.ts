import type {
  Dodo,
  DodoKey,
  Entity,
  EntityConfig,
  EntityPlugin,
  FilterExpression,
  KeyTransformer,
  QueryBuilder,
  QueryParams,
  QueryResult,
  SKCondition,
} from "./types"

function createEntity<TInput, TOutput = TInput>(
  dodo: Dodo,
  config: EntityConfig<TInput, TOutput>,
): Entity<TOutput> {
  const { schema, keys, plugins = [] } = config

  async function applyPlugins(
    phase: keyof EntityPlugin<TOutput>,
    ...args: Array<unknown>
  ): Promise<any> {
    let value = args[0]

    for (const plugin of plugins) {
      const fn = plugin[phase]
      if (fn && typeof fn === "function") {
        const transformed = await (fn as any)(value, ...args.slice(1))
        value = transformed ?? value
      }
    }
    return value
  }

  async function create(input: unknown): Promise<TOutput> {
    const validated = schema.parse(input)

    const transformed = await applyPlugins("beforeCreate", validated)

    const key = keys.toKey(transformed)

    await dodo.put({
      ...transformed,
      ...key,
    })

    return transformed
  }

  async function get(id: string): Promise<TOutput | null> {
    const key = keys.fromId(id)

    const item = await dodo.get<TOutput & DodoKey>(key)
    if (!item) return null

    const { pk, sk, ...data } = item
    const validated = schema.parse(data)

    const result = await applyPlugins("afterGet", validated)
    return result !== undefined ? result : null
  }

  async function update(
    id: string,
    updates: Partial<TOutput>,
  ): Promise<TOutput> {
    const current = await get(id)
    if (!current) {
      throw new Error(`${config.name} ${id} not found`)
    }

    const transformed = await applyPlugins("beforeUpdate", id, updates)

    const merged = { ...current, ...transformed }
    const validated = schema.parse(merged)

    const key = keys.fromId(id)

    await dodo.put({
      ...validated,
      ...key,
    })

    return validated
  }

  async function deleteEntity(id: string): Promise<void> {
    const key = keys.fromId(id)
    await dodo.delete(key)
  }

  async function query(params?: Partial<QueryParams>): Promise<TOutput[]> {
    const result = await dodo.query<TOutput & DodoKey>(params as QueryParams)

    const items = result.items.map(({ pk, sk, ...data }) => schema.parse(data))
    return items ?? []
  }

  async function queryOne(
    params?: Partial<QueryParams>,
  ): Promise<TOutput | null> {
    const result = await query(params)
    return result && result.length > 0 ? result[0]! : null
  }

  async function queryWithCursor(
    params?: Partial<QueryParams>,
  ): Promise<QueryResult<TOutput>> {
    const result = await dodo.query<TOutput & DodoKey>(params as QueryParams)

    return {
      ...result,
      items: result.items.map(({ pk, sk, ...data }) => schema.parse(data)),
    }
  }

  async function createMany(items: TOutput[]): Promise<TOutput[]> {
    return Promise.all(items.map((item) => create(item)))
  }

  async function getMany(ids: string[]): Promise<(TOutput | null)[]> {
    return Promise.all(ids.map((id) => get(id)))
  }

  async function deleteMany(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => deleteEntity(id)))
  }

  function where(filter: FilterExpression): QueryBuilder<TOutput> {
    const queryParams: Partial<QueryParams> = {
      filter,
    }

    const builder: QueryBuilder<TOutput> = {
      pk: (value: string) => {
        queryParams.pk = value
        return builder
      },
      sk: (condition: SKCondition) => {
        queryParams.sk = condition
        return builder
      },
      filter: (expr: FilterExpression) => {
        queryParams.filter = expr
        return builder
      },
      limit: (n: number) => {
        queryParams.limit = n
        return builder
      },
      ascending: () => {
        queryParams.ascending = true
        return builder
      },
      descending: () => {
        queryParams.ascending = false
        return builder
      },
      using: (indexName: string) => {
        queryParams.index = indexName
        return builder
      },
      select: (...fields: (keyof TOutput)[]) => {
        queryParams.projection = fields.map((f) => String(f))
        return builder
      },
      exec: async () => {
        return query(queryParams)
      },
      execWithCursor: async () => {
        return queryWithCursor(queryParams)
      },
      first: async () => {
        return queryOne({ ...queryParams, limit: 1 })
      },
    }

    return builder
  }

  async function find(predicate: Partial<TOutput>): Promise<TOutput[]> {
    const result = await dodo.scan<TOutput & DodoKey>()

    return result.items
      .map(({ pk, sk, ...data }) => schema.parse(data))
      .filter((item) => {
        return Object.entries(predicate).every(
          ([key, value]) => item[key as keyof TOutput] === value,
        )
      })
  }

  async function findOne(predicate: Partial<TOutput>): Promise<TOutput | null> {
    const results = await find(predicate)
    return results.length > 0 ? results[0]! : null
  }

  const entity: Entity<TOutput> = {
    create,
    get,
    update,
    delete: deleteEntity,
    query,
    queryOne,
    queryWithCursor,
    createMany,
    getMany,
    deleteMany,
    where,
    find,
    findOne,
  }

  return entity
}

export { createEntity }
