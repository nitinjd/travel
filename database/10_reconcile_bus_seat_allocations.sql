-- Reconcile historical bus allocations with the current registration data.
-- Run once after deploying the accompanying server change.

START TRANSACTION;

-- Self/other travel registrations must never reserve a planned-bus seat.
DELETE rba
FROM registration_bus_allocations rba
JOIN registrations r ON r.id = rba.registration_id
JOIN travel_options vo ON vo.id = r.travel_option_id
WHERE vo.mode <> 'BUS';

-- For planned-bus registrations, reserve one seat for every passenger aged 6+
-- and for a child aged 0-5 only when a separate bus seat was selected.
UPDATE registration_bus_allocations rba
JOIN registrations r ON r.id = rba.registration_id
JOIN travel_options vo ON vo.id = r.travel_option_id AND vo.mode = 'BUS'
SET rba.seats_allocated = (
  SELECT COUNT(*)
  FROM passengers p
  WHERE p.registration_id = r.id
    AND (p.age >= 6 OR p.requires_bus_seat = 1)
);

DELETE FROM registration_bus_allocations
WHERE seats_allocated <= 0;

COMMIT;

-- Verification: these values are the figures displayed in Bus inventory.
SELECT
  bi.bus_name,
  bi.capacity,
  COALESCE(SUM(CASE
    WHEN r.status <> 'CANCELLED' THEN rba.seats_allocated
    ELSE 0
  END), 0) AS used_seats,
  bi.capacity - COALESCE(SUM(CASE
    WHEN r.status <> 'CANCELLED' THEN rba.seats_allocated
    ELSE 0
  END), 0) AS seats_left
FROM bus_instances bi
LEFT JOIN registration_bus_allocations rba ON rba.bus_instance_id = bi.id
LEFT JOIN registrations r ON r.id = rba.registration_id
GROUP BY bi.id, bi.bus_name, bi.capacity, bi.bus_number
ORDER BY bi.bus_number;
