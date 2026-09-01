-- Run after database/07_age_pricing_payment_terms.sql on an existing database.
-- Splits the legacy child seat/bed flag into independent bus-seat and accommodation choices.

ALTER TABLE passengers
  ADD COLUMN requires_bus_seat BOOLEAN NOT NULL DEFAULT TRUE AFTER requires_seat_bed,
  ADD COLUMN requires_accommodation BOOLEAN NOT NULL DEFAULT TRUE AFTER requires_bus_seat;

-- Preserve existing registrations that used the old combined flag.
UPDATE passengers
SET requires_bus_seat = requires_seat_bed,
    requires_accommodation = requires_seat_bed;
