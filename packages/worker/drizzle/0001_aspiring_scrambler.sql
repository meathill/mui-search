CREATE TABLE `seed_sync_state` (
	`scope` varchar(64) NOT NULL,
	`source_commit` varchar(64) NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seed_sync_state_scope` PRIMARY KEY(`scope`)
);
