import type { DodoPlugin, EntityPlugin } from "./types"
import { decrypt, encrypt, toCamelCase, toSnakeCase } from "./utils"

function timestamps(): EntityPlugin<any> {
  return {
    beforeCreate: (item) => ({
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    beforeUpdate: (_, updates) => ({
      ...updates,
      updatedAt: new Date().toISOString(),
    }),
  }
}

function softDelete<T extends Record<string, unknown>>(): EntityPlugin<T> {
  return {
    beforeUpdate: (_id, updates) => {
      if ("deleted" in updates && updates.deleted === true) {
        return {
          ...updates,
          deletedAt: new Date().toISOString(),
        } as Partial<T>
      }
      return updates
    },
    afterGet: (item) => {
      if (
        item &&
        typeof item === "object" &&
        "deleted" in item &&
        item.deleted
      ) {
        return null
      }
      return item
    },
  }
}

function caseTransform(): DodoPlugin {
  return {
    name: "caseTransform",
    onBeforePut: (item) => toSnakeCase(item),
    onAfterGet: (item) => toCamelCase(item),
  }
}

function encryption(fields: string[]): DodoPlugin {
  return {
    name: "encryption",
    onBeforePut: (item) => {
      const encrypted = { ...item }
      fields.forEach((field) => {
        if (field in encrypted) {
          encrypted[field] = encrypt(encrypted[field])
        }
      })
      return encrypted
    },
    onAfterGet: (item) => {
      const decrypted = { ...item }
      fields.forEach((field) => {
        if (field in decrypted) {
          decrypted[field] = decrypt(decrypted[field])
        }
      })
      return decrypted
    },
  }
}

export { timestamps, softDelete, caseTransform, encryption }
