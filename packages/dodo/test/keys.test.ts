import { describe, expect, it } from "bun:test"
import { keys } from "../src/keys"

describe("Key Transformers", () => {
  describe("keys.single", () => {
    it("should generate pk and sk for single pattern", () => {
      const transformer = keys.single("USER")
      const result = transformer.toKey({ id: "123", name: "Alice" } as any)

      expect(result.pk).toBe("USER#123")
      expect(result.sk).toBe("USER#META")
    })

    it("should generate pk and sk from id", () => {
      const transformer = keys.single("USER")
      const result = transformer.fromId("456")

      expect(result.pk).toBe("USER#456")
      expect(result.sk).toBe("USER#META")
    })
  })

  describe("keys.tenant", () => {
    it("should generate pk and sk for tenant pattern", () => {
      const transformer = keys.tenant("POST")
      const result = transformer.toKey({
        id: "post-1",
        tenantId: "tenant-1",
      } as any)

      expect(result.pk).toBe("TENANT#tenant-1")
      expect(result.sk).toBe("POST#post-1")
    })

    it("should throw when calling fromId without tenantId", () => {
      const transformer = keys.tenant("POST")

      expect(() => transformer.fromId("post-1")).toThrow(
        "Tenant transformer requires tenantId",
      )
    })
  })

  describe("keys.hierarchy", () => {
    it("should generate pk and sk for hierarchy pattern", () => {
      const transformer = keys.hierarchy("COMMENT")
      const result = transformer.toKey({
        id: "comment-1",
        parentId: "post-1",
      } as any)

      expect(result.pk).toBe("COMMENT#post-1")
      expect(result.sk).toBe("COMMENT#comment-1")
    })

    it("should throw when calling fromId without parentId", () => {
      const transformer = keys.hierarchy("COMMENT")

      expect(() => transformer.fromId("comment-1")).toThrow(
        "Hierarchy transformer requires parentId",
      )
    })
  })

  describe("keys.custom", () => {
    it("should generate custom pk and sk", () => {
      const transformer = keys.custom(
        (item: any) => ({
          pk: `USER#${item.userId}`,
          sk: `POST#${item.id}`,
        }),
        (id) => ({
          pk: `POST#${id}`,
          sk: "META",
        }),
      )

      const result = transformer.toKey({ id: "post-1", userId: "user-1" })

      expect(result.pk).toBe("USER#user-1")
      expect(result.sk).toBe("POST#post-1")
    })

    it("should use fromId callback", () => {
      const transformer = keys.custom(
        (item: any) => ({ pk: "unused", sk: "unused" }),
        (id) => ({
          pk: `CUSTOM#${id}`,
          sk: "META",
        }),
      )

      const result = transformer.fromId("123")

      expect(result.pk).toBe("CUSTOM#123")
      expect(result.sk).toBe("META")
    })

    it("should throw when fromId is not implemented", () => {
      const transformer = keys.custom((item: any) => ({
        pk: "test",
        sk: "test",
      }))

      expect(() => transformer.fromId("123")).toThrow("fromId not implemented")
    })
  })
})
