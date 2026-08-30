-- Run this after selecting the existing application database in phpMyAdmin.
-- It prevents duplicate family/group names, mobile numbers and email addresses
-- within the same tour. Resolve any existing duplicates before running it.

ALTER TABLE registrations
  ADD UNIQUE KEY uq_tour_family (tour_id, family_name),
  ADD UNIQUE KEY uq_tour_phone (tour_id, contact_phone),
  ADD UNIQUE KEY uq_tour_email (tour_id, contact_email);
