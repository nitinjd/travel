-- Run after selecting the existing application database in phpMyAdmin.
-- Adds one configurable image for each room type.

CREATE TABLE IF NOT EXISTS room_type_images(
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_type_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
  UNIQUE KEY uq_room_type_image(room_type_id)
);
