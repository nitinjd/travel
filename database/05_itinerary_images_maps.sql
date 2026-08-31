-- Run after selecting the existing application database in phpMyAdmin.
-- Adds Google Maps directions and up to 10 database-backed images per itinerary item.

ALTER TABLE itinerary_items
  ADD COLUMN google_maps_url VARCHAR(1000) NULL AFTER location;

CREATE TABLE itinerary_images(
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  itinerary_item_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(itinerary_item_id) REFERENCES itinerary_items(id) ON DELETE CASCADE,
  INDEX idx_itinerary_images(itinerary_item_id,sort_order,id)
);
