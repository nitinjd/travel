-- CLEAN UP TRANSACTION / PASSENGER DATA
-- Deletes registration-level transactions and their passenger/allocation records.
-- Master tour configuration (tours, rooms, buses, itinerary) is preserved.
-- Run against the selected application database.

SET FOREIGN_KEY_CHECKS=0;

DELETE FROM registration_bus_allocations;
DELETE FROM registration_room_allocations;
DELETE FROM passengers;
DELETE FROM registrations;

SET FOREIGN_KEY_CHECKS=1;
