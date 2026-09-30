
---

### 🔹 PACKAGE: `packages/db-client`

#### `clinic-two/packages/db-client/package.json`
```json
{
  "name": "@clinic-two/db-client",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "prisma": "prisma",
    "generate": "prisma generate",
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0"
  },
  "devDependencies": {
    "prisma": "^5.20.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0"
  }
}