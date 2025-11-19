import { DynamoDBClient } from "@aws-sdk/client-dynamodb"

import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb"
import { createEntity } from "./entity"
import type {
  BatchGetParams,
  BatchWriteParams,
  Dodo,
  DodoConfig,
  DodoKey,
  DodoPlugin,
  EntityConfig,
  QueryParams,
  QueryResult,
  TransactionItem,
} from "./types"
import { buildQueryExpression } from "./utils"

function createDodo(config: DodoConfig): Dodo {
  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: config.region ?? "us-east-1",
      endpoint: config.endpoint,
      credentials: config.credentials,
    }),
    {
      marshallOptions: { removeUndefinedValues: true },
    },
  )

  const plugins = config.plugins ?? []

  async function applyPlugins<T>(phase: keyof DodoPlugin, data: T): Promise<T> {
    let result = data
    for (const plugin of plugins) {
      const fn = plugin[phase]
      if (fn && typeof fn === "function") {
        result = await (fn as (x: T) => T | Promise<T>)(result)
      }
    }
    return result
  }

  const dodo: Dodo = {
    async get<T>(key: DodoKey): Promise<T | null> {
      const response = await client.send(
        new GetCommand({
          TableName: config.table,
          Key: key,
        }),
      )

      if (!response.Item) return null
      return applyPlugins("onAfterGet", response.Item as T)
    },

    async put<T extends Record<string, unknown>>(
      item: T & DodoKey,
    ): Promise<void> {
      const transformed = await applyPlugins("onBeforePut", item)
      await client.send(
        new PutCommand({
          TableName: config.table,
          Item: transformed,
        }),
      )
    },

    async delete(key: DodoKey): Promise<void> {
      await client.send(
        new DeleteCommand({
          TableName: config.table,
          Key: key,
        }),
      )
    },

    async update<T extends Record<string, unknown>>(
      key: DodoKey,
      updates: Partial<T>,
    ): Promise<void> {
      const existing = await this.get<T>(key)
      if (!existing) {
        throw new Error(`Item not found: ${key.pk}/${key.sk}`)
      }

      const merged = { ...existing, ...updates, ...key }
      await this.put(merged as T & DodoKey)
    },

    async query<T>(params: QueryParams): Promise<QueryResult<T>> {
      const transformed = await applyPlugins("onBeforeQuery", params)
      const queryExpr = buildQueryExpression(transformed)

      const response = await client.send(
        new QueryCommand({
          TableName: config.table,
          IndexName: transformed.index,
          ...queryExpr,
          Limit: transformed.limit,
          ExclusiveStartKey: transformed.cursor
            ? JSON.parse(Buffer.from(transformed.cursor, "base64").toString())
            : undefined,
          ScanIndexForward: transformed.ascending ?? true,
        }),
      )

      const items = await Promise.all(
        (response.Items ?? []).map((item) =>
          applyPlugins("onAfterGet", item as T),
        ),
      )

      const result: QueryResult<T> = {
        items,
        count: response.Count ?? 0,
        hasMore: !!response.LastEvaluatedKey,
        cursor: response.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString(
              "base64",
            )
          : undefined,
      }

      return applyPlugins("onAfterQuery", result)
    },

    async scan<T>(params?: Partial<QueryParams>): Promise<QueryResult<T>> {
      const transformed = await applyPlugins(
        "onBeforeQuery",
        params as QueryParams,
      )

      const response = await client.send(
        new ScanCommand({
          TableName: config.table,
          IndexName: transformed.index,
          Limit: transformed.limit,
          ExclusiveStartKey: transformed.cursor
            ? JSON.parse(Buffer.from(transformed.cursor, "base64").toString())
            : undefined,
        }),
      )

      const items = await Promise.all(
        (response.Items ?? []).map((item) =>
          applyPlugins("onAfterGet", item as T),
        ),
      )

      const result: QueryResult<T> = {
        items,
        count: response.Count ?? 0,
        scannedCount: response.ScannedCount,
        hasMore: !!response.LastEvaluatedKey,
        cursor: response.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString(
              "base64",
            )
          : undefined,
      }

      return applyPlugins("onAfterQuery", result)
    },

    async batchGet<T>(params: BatchGetParams): Promise<T[]> {
      const { BatchGetCommand } = await import("@aws-sdk/lib-dynamodb")

      const response = await client.send(
        new BatchGetCommand({
          RequestItems: {
            [config.table]: {
              Keys: params.keys,
              ProjectionExpression: params.projection
                ? params.projection.join(",")
                : undefined,
            },
          },
        }),
      )

      const items = response.Responses?.[config.table] ?? []
      return Promise.all(
        items.map((item) => applyPlugins("onAfterGet", item as T)),
      )
    },

    async batchWrite<T>(params: BatchWriteParams<T>): Promise<void> {
      const { BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb")

      const RequestItems: Array<any> = []

      if (params.puts) {
        for (const item of params.puts) {
          const transformed = await applyPlugins("onBeforePut", item)
          RequestItems.push({
            PutRequest: {
              Item: transformed,
            },
          })
        }
      }

      if (params.deletes) {
        params.deletes.forEach((key) => {
          RequestItems.push({
            DeleteRequest: {
              Key: key,
            },
          })
        })
      }

      await client.send(
        new BatchWriteCommand({
          RequestItems: {
            [config.table]: RequestItems,
          },
        }),
      )
    },

    async transaction<T>(items: TransactionItem<T>[]): Promise<void> {
      const { TransactWriteCommand } = await import("@aws-sdk/lib-dynamodb")

      const TransactItems: Array<any> = []

      for (const item of items) {
        if ("put" in item) {
          const transformed = await applyPlugins("onBeforePut", item.put)
          TransactItems.push({
            Put: {
              TableName: config.table,
              Item: transformed,
            },
          })
        } else if ("update" in item) {
          TransactItems.push({
            Update: {
              TableName: config.table,
              Key: item.update.key,
              UpdateExpression: "SET #data = :data",
              ExpressionAttributeNames: { "#data": "data" },
              ExpressionAttributeValues: { ":data": item.update.updates },
            },
          })
        } else if ("delete" in item) {
          TransactItems.push({
            Delete: {
              TableName: config.table,
              Key: item.delete,
            },
          })
        } else if ("conditionCheck" in item) {
          TransactItems.push({
            ConditionCheck: {
              TableName: config.table,
              Key: item.conditionCheck.key,
              ConditionExpression: "attribute_exists(pk)",
            },
          })
        }
      }

      await client.send(
        new TransactWriteCommand({
          TransactItems,
        }),
      )
    },

    entity<TInput, TOutput = TInput>(cfg: EntityConfig<TInput, TOutput>) {
      return createEntity(dodo, cfg)
    },
  }

  return dodo
}

export { createDodo }
