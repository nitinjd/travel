# TourSetu

One-hosting full-stack tour registration system. The Express server exposes the API and serves the compiled React client.

## Structure

- `client/` React + Vite application
- `server/` Express + MySQL API
- `database/01_schema_and_seed.sql` database schema and initial Nashik/Igatpuri tour
- `render.yaml` single Render web-service configuration

## Setup

1. Run `database/01_schema_and_seed.sql` in MySQL.
2. Copy `.env.example` to `.env` and enter MySQL, JWT and initial admin values.
3. Run `npm run install:all`.
4. Run `npm run build`.
5. Run `npm start`.
6. Call `POST /api/admin/bootstrap` once using the same `ADMIN_EMAIL` and `ADMIN_PASSWORD` values to create the administrator.

For development, run the API with `npm run dev` and the client separately with `npm --prefix client run dev`.

## Reports

Admin reports support overall, bus, self-travel and room views. Excel downloads include family totals, member details, travel, accommodation, charges, and writable Room No./Floor columns.

## Inventory and concurrency

The seed contains 16 four-person Non-AC rooms, six eight-bed Non-AC rooms, 40 four-person AC rooms with one optional floor bed each, and Bus A with 45 seats. The administrator can add room inventory from Trip Setup. When a bus fills, submission automatically creates Bus B, Bus C and so on with the configured capacity.

Final submission runs inside a MySQL transaction. It locks the travel option and selected room inventory with `SELECT ... FOR UPDATE`, rechecks availability, allocates the family, and commits atomically. Concurrent requests therefore cannot reserve the same room or last bus seats.

The SQL script recreates the schema and is destructive. Use it for initial setup; do not rerun it after accepting live registrations without first taking a backup.
