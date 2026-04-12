-- Enable PostgreSQL extensions required by the schema.
-- Run this first on a clean database.

begin;

create extension if not exists pgcrypto;

commit;
