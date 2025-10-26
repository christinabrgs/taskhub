CREATE TYPE "status" AS ENUM (
  'todo',
  'in_progress',
  'done'
);

CREATE TABLE "workspaces" (
  "id" text PRIMARY KEY,
  "name" varchar NOT NULL
);

CREATE TABLE "tasks" (
  "id" text PRIMARY KEY,
  "title" varchar NOT NULL,
  "description" text NOT NULL,
  "status" status NOT NULL,
  "due_date" timestamp,
  "workspace_id" text NOT NULL,
  "created_by" text NOT NULL
);

CREATE TABLE "tags" (
  "id" text PRIMARY KEY,
  "name" varchar NOT NULL,
  "workspace_id" text NOT NULL,
  UNIQUE ("name", "workspace_id")
);

CREATE TABLE "task_tags" (
  "tag_id" text NOT NULL,
  "task_id" text NOT NULL,
  primary key ("tag_id", "task_id")
);

CREATE TABLE "api_keys" (
  "id" text PRIMARY KEY,
  "workspace_id" text NOT NULL,
  "key" text NOT NULL,
  UNIQUE ("workspace_id", "key")
);


ALTER TABLE "tags" ADD FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id");

ALTER TABLE "tasks" ADD FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id");

ALTER TABLE "tasks" ADD FOREIGN KEY ("created_by") REFERENCES "api_keys" ("id");

ALTER TABLE "task_tags" ADD FOREIGN KEY ("tag_id") REFERENCES "tags" ("id");

ALTER TABLE "task_tags" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");

ALTER TABLE "api_keys" ADD FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id");
