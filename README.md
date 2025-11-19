<div align="center">
<img src="./.github/assets/dodo.svg" alt="dodo - Mongoose for DynamoDB" width="200"/>

<p align="center">
  <a href="https://github.com/0xdsqr/dodo"><img src="https://img.shields.io/badge/github-dodo-blue?style=for-the-badge&logo=github" alt="GitHub"></a>
  <a href="#"><img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="#"><img src="https://img.shields.io/badge/dynamodb-database-527FFF?style=for-the-badge&logo=amazon-dynamodb" alt="DynamoDB"></a>
  <a href="#"><img src="https://img.shields.io/badge/zod-schema-3E67B1?style=for-the-badge&logo=zod" alt="Zod"></a>
</p>

**Functional, typesafe DynamoDB toolkit with Zod schemas, composable plugins, and zero-magic CRUD.**

*A learning project exploring better DynamoDB developer experience.*
</div>

## ⇁ The Problem

DynamoDB requires tedious boilerplate for every operation. You write key patterns manually, handle transformation logic, manage encryption, timestamps, and deletions yourself. It's verbose, error-prone, and repetitive - nothing like Mongoose for MongoDB.

## ⇁ The Solution

Dodo brings Mongoose-like developer experience to DynamoDB:
- **Define schemas with Zod** - Type-safe validation out of the box
- **Flexible key patterns** - Single, tenant, hierarchy, or custom transformers
- **Plugin pipeline** - Timestamps, soft delete, encryption, case conversion
- **Simple CRUD** - `create()`, `get()`, `update()`, `delete()`, `query()` - that's it
- **Batch & transactions** - Multi-record operations with atomic guarantees

## ⇁ Installation

| Package Manager | Command |
|-----------------|---------|
| bun | `bun add @dsqr/dodo` |
| npm | `npm install @dsqr/dodo` |
| pnpm | `pnpm add @dsqr/dodo` |
| deno | `deno add jsr:@dsqr/dodo` |

## ⇁ Quick Start

**Step 1: Create a schema**

```typescript
import { z } from "zod"

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
})
```

**Step 2: Create a dodo instance**

```typescript
import { createDodo, keys } from "@dsqr/dodo"

const dodo = createDodo({
  table: "my-users",
  region: "us-east-1"
})
```

**Step 3: Create an entity**

```typescript
const User = dodo.entity({
  name: "User",
  schema: UserSchema,
  keys: keys.single("USER")
})
```

**Step 4: Use it**

```typescript
// Create
const user = await User.create({
  id: "user-1",
  email: "alice@example.com",
  name: "Alice"
})

// Get
const found = await User.get("user-1")

// Update
await User.update("user-1", { name: "Alice Smith" })

// Delete
await User.delete("user-1")
```

That's it! 🎉

## ⇁ Key Features

- 🔒 **Full Type Inference** - TypeScript knows your schema, entity methods, and return types
- 📦 **Schema-based** - Define entities with Zod, get validation + type safety everywhere
- 🔑 **Flexible Keys** - 4 key patterns (single, tenant, hierarchy, custom) for any data structure
- ⚡ **Batch Operations** - Create/get/delete multiple records efficiently
- 🤝 **Transactions** - All-or-nothing multi-record changes with DynamoDB transactions
- 🎯 **Query Builder** - Fluent API for complex queries with filters and pagination
- 🧩 **Composable Plugins** - Extend with timestamps, soft delete, encryption, case conversion, or custom logic

## ⇁ Built-in Plugins

- 📅 **Timestamps** - Auto-adds createdAt/updatedAt to every entity
- 💾 **Soft Delete** - Mark records as deleted without removing them, auto-filtered from queries
- 🔤 **Case Transform** - Convert between camelCase (API) and snake_case (database)
- 🔐 **Encryption** - Field-level encryption for sensitive data
- 🧩 **Custom** - Write your own plugins with beforeCreate/afterGet/beforeUpdate/afterDelete hooks

## ⇁ API Reference

<details><summary><strong>Creating a Dodo Instance</strong></summary>

Create a DynamoDB client with AWS credentials and table configuration:

```typescript
import { createDodo } from "@dsqr/dodo"

const dodo = createDodo({
  table: "my-table",
  region: "us-east-1",
  endpoint: "http://localhost:8000", // Optional, for local testing
  credentials: {
    accessKeyId: "YOUR_KEY",
    secretAccessKey: "YOUR_SECRET"
  },
  plugins: [
    caseTransform(),      // camelCase ↔ snake_case conversion
    softDelete(),         // Soft deletion with automatic filtering
    timestamps(),         // Auto createdAt/updatedAt
    encryption()          // Field-level encryption
  ]
})
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `table` | string | ✓ | DynamoDB table name |
| `region` | string | - | AWS region (default: us-east-1) |
| `endpoint` | string | - | Custom endpoint for local/test |
| `credentials` | object | - | AWS credentials (uses env/IAM role if omitted) |
| `plugins` | array | - | Plugin chain for data transforms |

</details>

<details><summary><strong>Key Transformers</strong></summary>

Define how your data maps to DynamoDB's pk/sk keys:

**Single Pattern** - One record per entity:
```typescript
import { keys } from "@dsqr/dodo"

const User = dodo.entity({
  name: "User",
  schema: UserSchema,
  keys: keys.single("USER"),  // pk: USER#id, sk: USER#META
})
```

**Tenant Pattern** - Multi-tenant isolation:
```typescript
const Post = dodo.entity({
  name: "Post",
  schema: PostSchema,
  keys: keys.tenant("POST"),  // pk: TENANT#tenantId, sk: POST#id
})
```

**Hierarchy Pattern** - Parent-child relationships:
```typescript
const Comment = dodo.entity({
  name: "Comment",
  schema: CommentSchema,
  keys: keys.hierarchy("COMMENT"),  // pk: COMMENT#parentId, sk: COMMENT#id
})
```

**Custom Pattern** - Full control:
```typescript
const Custom = dodo.entity({
  name: "Custom",
  schema: MySchema,
  keys: keys.custom(
    (item) => ({
      pk: `CUSTOM#${item.userId}`,
      sk: `ITEM#${item.itemId}`
    }),
    (id) => ({
      pk: `ITEM#${id}`,
      sk: "META"
    })
  )
})
```

</details>

<details><summary><strong>Entity Operations</strong></summary>

**Create** - Insert new record with validation:
```typescript
const user = await User.create({
  id: "user-123",
  email: "alice@example.com",
  name: "Alice",
  role: "admin"
})
```

**Get** - Fetch by ID:
```typescript
const user = await User.get("user-123")
// Returns null if not found
```

**Update** - Modify existing record:
```typescript
const updated = await User.update("user-123", {
  name: "Alice Smith",
  role: "super-admin"
})
// Throws if record doesn't exist
```

**Delete** - Remove record:
```typescript
await User.delete("user-123")
// Silently succeeds even if not found
```

**Batch Create** - Insert multiple records efficiently:
```typescript
const users = await User.createMany([
  { id: "user-1", email: "user1@example.com", name: "User 1", role: "user" },
  { id: "user-2", email: "user2@example.com", name: "User 2", role: "user" }
])
```

**Batch Get** - Fetch multiple records:
```typescript
const users = await User.getMany(["user-1", "user-2", "user-3"])
// Returns array with nulls for missing items
```

**Batch Delete** - Remove multiple records:
```typescript
await User.deleteMany(["user-1", "user-2"])
```

</details>

<details><summary><strong>Querying</strong></summary>

**Query** - Get all records with matching partition key:
```typescript
const users = await User.query({
  pk: "USER#123"
})
```

**Query with Sort Order** - Control result ordering:
```typescript
const recent = await User.query({
  pk: "USER#123",
  ascending: false  // Newest first
})
```

**Query with Pagination** - Handle large result sets:
```typescript
const page1 = await User.queryWithCursor({
  pk: "USER#123",
  limit: 10
})

if (page1.hasMore) {
  const page2 = await User.queryWithCursor({
    pk: "USER#123",
    limit: 10,
    cursor: page1.cursor  // Resume from last key
  })
}
```

**Query with Filters** - Apply conditions:
```typescript
const admins = await User.query({
  pk: "USER#123",
  filter: {
    attribute: "role",
    eq: "admin"
  }
})

// Complex filters with AND/OR
const result = await User.query({
  pk: "USER#123",
  filter: {
    and: [
      { attribute: "role", eq: "admin" },
      { attribute: "status", ne: "inactive" }
    ]
  }
})
```

**QueryBuilder** - Fluent API:
```typescript
const results = await User
  .where({ attribute: "role", eq: "admin" })
  .ascending()
  .limit(20)
  .exec()

// Get first result with cursor
const first = await User
  .where({ attribute: "active", eq: true })
  .first()
```

**Scan** - Retrieve all records (expensive operation):
```typescript
const allUsers = await User.scan()

// With limit and pagination
const batch = await User.scan({
  limit: 100,
  cursor: nextToken
})
```

**Find by Attributes** - Search without knowing full key:
```typescript
// Scans table for matching attributes
const activeUsers = await User.find({
  status: "active",
  role: "admin"
})

// Find first match
const user = await User.findOne({
  email: "alice@example.com"
})
```

</details>

<details><summary><strong>Plugins</strong></summary>

**Timestamps Plugin** - Auto createdAt/updatedAt:
```typescript
import { plugins } from "@dsqr/dodo"

const dodo = createDodo({
  table: "my-table",
  plugins: [plugins.timestamps()]
})

const user = await User.create({ name: "Alice" })
// Result: { id, name, createdAt: "2024-01-01T...", updatedAt: "2024-01-01T..." }
```

**Soft Delete Plugin** - Mark deleted without removing:
```typescript
const dodo = createDodo({
  table: "my-table",
  plugins: [plugins.softDelete()]
})

await User.delete("user-123")
// Record marked with deleted: true, deletedAt: timestamp
// Queries automatically filter deleted records
```

**Case Transform Plugin** - camelCase ↔ snake_case:
```typescript
const dodo = createDodo({
  table: "my-table",
  plugins: [plugins.caseTransform()]
})

// API accepts camelCase
const user = await User.create({
  firstName: "Alice",
  lastName: "Smith"
})

// Database stores as snake_case
// { first_name: "Alice", last_name: "Smith" }
```

**Encryption Plugin** - Field-level encryption:
```typescript
const dodo = createDodo({
  table: "my-table",
  plugins: [plugins.encryption()]
})

const user = await User.create({
  name: "Alice",
  ssn: "123-45-6789"  // Encrypted in transit and at rest
})

const retrieved = await User.get(user.id)
// ssn is automatically decrypted on retrieval
```

**Custom Plugin** - Implement your own:
```typescript
const customPlugin = {
  name: "my-plugin",
  beforeCreate: (item) => {
    item.createdBy = "system"
    return item
  },
  afterGet: (item) => {
    if (item?.sensitive) {
      item.sensitive = "***REDACTED***"
    }
    return item
  }
}

const dodo = createDodo({
  table: "my-table",
  plugins: [customPlugin]
})
```

</details>

<details><summary><strong>Advanced: Direct Dodo Operations</strong></summary>

For use cases not covered by entity CRUD:

**Put** - Raw insert/replace:
```typescript
await dodo.put({
  pk: "USER#123",
  sk: "USER#META",
  email: "alice@example.com",
  status: "active"
})
```

**Get** - Raw fetch by key:
```typescript
const item = await dodo.get({
  pk: "USER#123",
  sk: "USER#META"
})
```

**Update** - Partial update:
```typescript
await dodo.update(
  { pk: "USER#123", sk: "USER#META" },
  { status: "inactive", lastSeen: Date.now() }
)
```

**Delete** - Raw delete:
```typescript
await dodo.delete({
  pk: "USER#123",
  sk: "USER#META"
})
```

**Batch Operations** - Atomic multi-record changes:
```typescript
await dodo.batchWrite({
  puts: [
    { pk: "USER#1", sk: "META", name: "Alice" },
    { pk: "USER#2", sk: "META", name: "Bob" }
  ],
  deletes: [
    { pk: "USER#3", sk: "META" }
  ]
})
```

**Transactions** - All-or-nothing multi-record operations:
```typescript
await dodo.transaction([
  {
    put: { pk: "ORDER#123", sk: "META", status: "confirmed" }
  },
  {
    update: {
      key: { pk: "USER#user-1", sk: "META" },
      updates: { balance: 99.99 }
    }
  },
  {
    delete: { pk: "CART#cart-1", sk: "META" }
  }
])
```

</details>

## ⇁ Development

Setup with Nix:

```bash
nix flake update
direnv allow
```

This provides:
- Bun - Ultra-fast JavaScript runtime and bundler
- Node.js - TypeScript support
- Biome - Linting and formatting
- Java - DynamoDB Local for testing

Build & Test:

```bash
bun run build          # Build TypeScript → JavaScript
bun test               # Run test suite
nix fmt .              # Format all code
```

## ⇁ Contributing

Built for learning and experimentation. Open a PR or issue if you want, but no promises - this is a learning project. Feel free to fork it and make it your own!

## ⇁ License

MIT - Do whatever you want with it.
