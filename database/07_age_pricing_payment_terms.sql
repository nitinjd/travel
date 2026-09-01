-- Run after selecting the existing application database in phpMyAdmin.
-- Adds age-based food pricing, child seat/bed selection and payment confirmation.

ALTER TABLE tours
  ADD COLUMN food_charge_age_0_5 DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER food_charge_per_person,
  ADD COLUMN food_charge_age_6_12 DECIMAL(12,2) NOT NULL DEFAULT 300 AFTER food_charge_age_0_5,
  ADD COLUMN food_charge_age_13_plus DECIMAL(12,2) NOT NULL DEFAULT 1000 AFTER food_charge_age_6_12;

ALTER TABLE passengers
  ADD COLUMN requires_seat_bed BOOLEAN NOT NULL DEFAULT TRUE AFTER age;

ALTER TABLE registrations
  ADD COLUMN payment_receiver VARCHAR(100) NULL AFTER total_amount,
  ADD COLUMN terms_accepted BOOLEAN NOT NULL DEFAULT FALSE AFTER payment_receiver;
