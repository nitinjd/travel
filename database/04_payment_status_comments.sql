-- Run after selecting the existing application database in phpMyAdmin.
-- This migration preserves all current registrations.

ALTER TABLE registrations
  ADD COLUMN amount_received BOOLEAN NOT NULL DEFAULT FALSE AFTER total_amount,
  ADD COLUMN admin_comments VARCHAR(1000) NULL AFTER amount_received;
