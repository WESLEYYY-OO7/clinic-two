# Clinic Two

A FHIR-native, multi-tenant, cloud-and-offline hospital management platform.

## Quick Start

```bash
pnpm install
docker compose -f infra/docker/docker-compose.yml up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev