import type { FilterExpression, QueryParams, SKCondition } from "./types"

function toSnakeCase(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(toSnakeCase)

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`,
    )
    acc[snakeKey] = toSnakeCase(obj[key])
    return acc
  }, {} as any)
}

function toCamelCase(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(toCamelCase)

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    )
    acc[camelKey] = toCamelCase(obj[key])
    return acc
  }, {} as any)
}

function encrypt(value: any): string {
  return Buffer.from(JSON.stringify(value)).toString("base64")
}

function decrypt(encrypted: string): any {
  try {
    return JSON.parse(Buffer.from(encrypted, "base64").toString())
  } catch {
    return encrypted
  }
}

function buildQueryExpression(params: QueryParams) {
  let KeyConditionExpression = `pk = :pk`
  const ExpressionAttributeValues: Record<string, any> = {
    ":pk": params.pk,
  }
  const ExpressionAttributeNames: Record<string, string> = {}

  if (params.sk) {
    if ("eq" in params.sk) {
      KeyConditionExpression += ` AND sk = :sk`
      ExpressionAttributeValues[":sk"] = params.sk.eq
    } else if ("beginsWith" in params.sk) {
      KeyConditionExpression += ` AND begins_with(sk, :sk)`
      ExpressionAttributeValues[":sk"] = params.sk.beginsWith
    } else if ("between" in params.sk) {
      KeyConditionExpression += ` AND sk BETWEEN :sk_start AND :sk_end`
      ExpressionAttributeValues[":sk_start"] = params.sk.between[0]
      ExpressionAttributeValues[":sk_end"] = params.sk.between[1]
    } else if ("gt" in params.sk) {
      KeyConditionExpression += ` AND sk > :sk`
      ExpressionAttributeValues[":sk"] = params.sk.gt
    } else if ("gte" in params.sk) {
      KeyConditionExpression += ` AND sk >= :sk`
      ExpressionAttributeValues[":sk"] = params.sk.gte
    } else if ("lt" in params.sk) {
      KeyConditionExpression += ` AND sk < :sk`
      ExpressionAttributeValues[":sk"] = params.sk.lt
    } else if ("lte" in params.sk) {
      KeyConditionExpression += ` AND sk <= :sk`
      ExpressionAttributeValues[":sk"] = params.sk.lte
    }
  }

  let FilterExpression: string | undefined

  if (params.filter) {
    const { expr, names, values } = buildFilterExpression(params.filter)
    FilterExpression = expr
    Object.assign(ExpressionAttributeValues, values)
    Object.assign(ExpressionAttributeNames, names)
  }

  const ProjectionExpression = params.projection
    ? params.projection.join(",")
    : undefined

  return {
    KeyConditionExpression,
    ExpressionAttributeValues: Object.keys(ExpressionAttributeValues).length
      ? ExpressionAttributeValues
      : undefined,
    ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length
      ? ExpressionAttributeNames
      : undefined,
    FilterExpression,
    ProjectionExpression,
  }
}

function buildFilterExpression(filter: FilterExpression) {
  const values: Record<string, any> = {}
  const names: Record<string, string> = {}
  let valueCounter = 0
  let nameCounter = 0

  function buildExpr(f: FilterExpression): string {
    if ("attribute" in f) {
      const attr = f.attribute
      const nameKey = `#n${nameCounter++}`
      names[nameKey] = attr

      if ("eq" in f) {
        const valKey = `:v${valueCounter++}`
        values[valKey] = f.eq
        return `${nameKey} = ${valKey}`
      } else if ("ne" in f) {
        const valKey = `:v${valueCounter++}`
        values[valKey] = f.ne
        return `${nameKey} <> ${valKey}`
      } else if ("exists" in f) {
        return f.exists
          ? `attribute_exists(${nameKey})`
          : `attribute_not_exists(${nameKey})`
      } else if ("contains" in f) {
        const valKey = `:v${valueCounter++}`
        values[valKey] = f.contains
        return `contains(${nameKey}, ${valKey})`
      } else if ("in" in f) {
        const inValues: Array<string> = []
        f.in.forEach((val) => {
          const valKey = `:v${valueCounter++}`
          values[valKey] = val
          inValues.push(valKey)
        })
        return `${nameKey} IN (${inValues.join(",")})`
      }
      throw new Error(`Unsupported filter condition on attribute ${attr}`)
    } else if ("and" in f) {
      return `(${f.and.map(buildExpr).join(" AND ")})`
    } else if ("or" in f) {
      return `(${f.or.map(buildExpr).join(" OR ")})`
    } else if ("not" in f) {
      return `NOT (${buildExpr(f.not)})`
    }

    throw new Error(
      "Invalid filter expression: missing attribute, and, or, or not",
    )
  }

  return {
    expr: buildExpr(filter),
    names,
    values,
  }
}

export { toSnakeCase, toCamelCase, encrypt, decrypt, buildQueryExpression }
