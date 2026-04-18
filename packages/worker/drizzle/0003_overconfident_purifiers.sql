ALTER TABLE `documents` ADD `published_at` datetime;--> statement-breakpoint
ALTER TABLE `documents` ADD `category_name` varchar(255);--> statement-breakpoint
ALTER TABLE `documents` ADD `reading_time_minutes` int;