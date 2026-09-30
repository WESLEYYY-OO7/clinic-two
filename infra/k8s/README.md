# Cura Health

**The clinical record, cured.**

A FHIR-native, multi-tenant hospital management platform built for African healthcare.

## Quick Start

```bash
pnpm install
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev