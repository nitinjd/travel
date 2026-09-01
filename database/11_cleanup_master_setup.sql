-- CLEAN UP MASTER SETUP DATA
-- Removes tour setup/configuration data while preserving administrator accounts.
-- This intentionally deletes tours last so the foreign-key children can be removed first.
-- Run against the selected application database.

SET FOREIGN_KEY_CHECKS=0;

DELETE FROM itinerary_images;
DELETE FROM room_type_images;
DELETE FROM itinerary_items;
DELETE FROM room_inventory;
DELETE FROM bus_instances;
DELETE FROM room_types;
DELETE FROM travel_options;
DELETE FROM tours;

SET FOREIGN_KEY_CHECKS=1;
