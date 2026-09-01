-- Run after selecting the existing application database in phpMyAdmin.
-- Adds the required Mandal selection to family registrations and reports.

ALTER TABLE registrations
  ADD COLUMN mandal VARCHAR(100) NOT NULL DEFAULT 'Others' AFTER family_name,
  ADD INDEX idx_registration_mandal(tour_id,mandal);
