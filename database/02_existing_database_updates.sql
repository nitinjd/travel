-- Run this only when 01_schema_and_seed.sql was already executed earlier.
-- Select the existing application database in phpMyAdmin before importing.

UPDATE room_types SET name='Non AC', charge_type='PER_ROOM', charge_amount=1200, capacity=4, extra_bed_allowed=0, extra_bed_charge=0, max_extra_beds=0 WHERE name IN ('Non-AC Room','Non-AC Room (4 people)');
UPDATE room_types SET name='Dormitory', charge_type='PER_BED', charge_amount=350, capacity=8, extra_bed_allowed=0, extra_bed_charge=0, max_extra_beds=0 WHERE name IN ('Non-AC 8-Bed Room','Domentary');
UPDATE room_types SET name='AC', charge_type='PER_ROOM', charge_amount=1500, capacity=4, extra_bed_allowed=1, extra_bed_charge=0, max_extra_beds=1 WHERE name='AC Room';
UPDATE room_types SET extra_bed_charge=0;

INSERT INTO admins(email,password_hash,is_active)
VALUES('admin@gmail.com','$2b$12$SFsbm3rIzszD5Ewqe9sLxur2wD5QXrv5QyQ//0cVaXECaH09bEpgy',1)
ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),is_active=1;
