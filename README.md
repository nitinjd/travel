# TourSetu

One-hosting full-stack tour registration system. The Express server exposes the API and serves the compiled React client.

## Structure

- `client/` React + Vite application
- `server/` Express + MySQL API
- `database/01_schema_and_seed.sql` database schema and initial Nashik/Igatpuri tour
- `render.yaml` single Render web-service configuration

## Setup

1. Create or select an existing MySQL database using your hosting control panel. In phpMyAdmin, click that database first and then import `database/01_schema_and_seed.sql`. The script intentionally does not run `CREATE DATABASE` or `USE`, because shared-hosting database users commonly lack those permissions.
2. Copy `.env.example` to `.env` and enter MySQL, JWT and initial admin values.
3. Run `npm run install:all`.
4. Run `npm run build`.
5. Run `npm start`.
6. Call `POST /api/admin/bootstrap` once using the same `ADMIN_EMAIL` and `ADMIN_PASSWORD` values to create the administrator.

The main SQL script already creates the initial administrator:

- Admin URL: `/admin`
- Email: `admin@gmail.com`
- Password: `Test@123`

Change this password after initial deployment. The public registration URL is `/`; it intentionally contains no admin label or navigation menu.

For development, run the API with `npm run dev` and the client separately with `npm --prefix client run dev`.

## Reports

Admin reports support overall, bus, self-travel and room views. Excel downloads include family totals, member details, travel, accommodation, charges, and writable Room No./Floor columns.

## Inventory and concurrency

The configurable seed room types are AC, Non AC and Dormitory. It contains 16 four-person Non AC rooms, six eight-bed Dormitory rooms, 40 four-person AC rooms with one free optional floor bed each, and Bus A with 45 seats. The administrator can rename/edit room types and add room inventory from Trip Setup. When a bus fills, submission automatically creates Bus B, Bus C and so on with the configured capacity.

Final submission runs inside a MySQL transaction. It locks the travel option and selected room inventory with `SELECT ... FOR UPDATE`, rechecks availability, allocates the family, and commits atomically. Concurrent requests therefore cannot reserve the same room or last bus seats.

Under Admin → Trip Setup → Travel Options, the administrator can add or edit individual buses and their seat capacities. Every new bus is immediately included in public availability, registration allocation, admin inventory, dependent reports and the Excel inventory sheet. Automatic bus creation when all configured buses are full remains enabled.

The SQL script recreates the schema and is destructive. Use it for initial setup; do not rerun it after accepting live registrations without first taking a backup.

If the main setup script was already executed, run `database/02_existing_database_updates.sql` instead. It updates the room names, removes extra-bed charges and ensures the initial administrator exists without deleting registrations.

After that, run `database/03_unique_registration_fields.sql` to enforce unique family/group name, mobile number and email within each tour. Resolve any existing duplicate registrations before applying this migration.
