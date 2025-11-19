import type { DodoKey, KeyTransformer } from "./types"

function single<T extends Record<string, unknown> & { id: string }>(
  type: string,
): KeyTransformer<T> {
  return {
    toKey: (item) => ({
      pk: `${type}#${item.id}`,
      sk: `${type}#META`,
    }),
    fromId: (id) => ({
      pk: `${type}#${id}`,
      sk: `${type}#META`,
    }),
  }
}

function tenant<
  T extends Record<string, unknown> & { tenantId: string; id: string },
>(type: string): KeyTransformer<T> {
  return {
    toKey: (item) => ({
      pk: `TENANT#${item.tenantId}`,
      sk: `${type}#${item.id}`,
    }),
    fromId: (id) => {
      throw new Error("Tenant transformer requires tenantId")
    },
  }
}

function hierarchy<
  T extends Record<string, unknown> & { parentId: string; id: string },
>(type: string): KeyTransformer<T> {
  return {
    toKey: (item) => ({
      pk: `${type}#${item.parentId}`,
      sk: `${type}#${item.id}`,
    }),
    fromId: (id) => {
      throw new Error("Hierarchy transformer requires parentId")
    },
  }
}

function custom<T>(
  toKey: (item: T) => DodoKey,
  fromId?: (id: string) => DodoKey,
): KeyTransformer<T> {
  return {
    toKey,
    fromId:
      fromId ??
      (() => {
        throw new Error("fromId not implemented")
      }),
  }
}

const keys = {
  single,
  tenant,
  hierarchy,
  custom,
}

export { keys }
