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
