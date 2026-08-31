-- Run after selecting the existing application database in phpMyAdmin.
-- Adds room descriptions shown during registration.

ALTER TABLE room_types
  ADD COLUMN description VARCHAR(500) NULL AFTER name;
