-- READ-ONLY PREFLIGHT ONLY
-- Target project: investlab-ledger-test (project ref: gopofxyezhwpfxbecrxd)
-- Do NOT run against the operating project (duffpsvaphccgxvkiobm).
-- This script performs catalog reads only. It does not apply migrations or change settings/data.
-- Run in Supabase SQL Editor while connected to the target project.

BEGIN;
SET TRANSACTION READ ONLY;

-- 1. Confirm connection identity and database context.
SELECT current_database() AS database_name,
       current_user AS database_role,
       current_schema() AS current_schema,
       version() AS postgres_version;

-- 2. Schemas: especially public, auth, storage, extensions, and app_private.
SELECT n.nspname AS schema_name,
       pg_get_userbyid(n.nspowner) AS owner
FROM pg_namespace n
WHERE n.nspname NOT LIKE 'pg_%'
  AND n.nspname <> 'information_schema'
ORDER BY n.nspname;

-- 3. Existing relations in public/app_private (tables, views, materialized views, sequences, etc.).
SELECT n.nspname AS schema_name,
       c.relname AS object_name,
       CASE c.relkind
         WHEN 'r' THEN 'table'
         WHEN 'p' THEN 'partitioned table'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'materialized view'
         WHEN 'S' THEN 'sequence'
         WHEN 'f' THEN 'foreign table'
         ELSE c.relkind::text
       END AS object_type,
       pg_get_userbyid(c.relowner) AS owner,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'app_private')
  AND c.relkind IN ('r','p','v','m','S','f')
ORDER BY n.nspname, c.relname;

-- 4. Existing functions/procedures in public/app_private/auth.
SELECT n.nspname AS schema_name,
       p.proname AS routine_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prokind AS routine_kind,
       pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef AS security_definer,
       p.proconfig AS configuration
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'app_private', 'auth')
ORDER BY n.nspname, p.proname;

-- 5. Non-internal triggers on public/app_private tables.
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid, true) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND n.nspname IN ('public', 'app_private')
ORDER BY n.nspname, c.relname, t.tgname;

-- 6. Installed extensions.
SELECT e.extname AS extension_name,
       e.extversion AS version,
       n.nspname AS schema_name
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY e.extname;

-- 7. Existing RLS policies in public/app_private.
SELECT schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
FROM pg_policies
WHERE schemaname IN ('public', 'app_private')
ORDER BY schemaname, tablename, policyname;

-- 8. Existing constraints on the four proposed target tables, if any.
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       con.conname AS constraint_name,
       con.contype AS constraint_type,
       pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'app_private')
  AND c.relname IN ('companies',
                    'import_batches',
                    'market_price_observations',
                    'quarterly_financial_observations',
                    'data_owners')
ORDER BY n.nspname, c.relname, con.conname;

-- 9. Check whether Supabase migration history exists.
-- If this returns true, inspect the history table in a separate read-only query:
-- SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
       AS migration_history_table_exists;

-- 10. Auth user count only; no user identifiers or personal fields are exposed.
-- If permission is denied, record that and inspect Auth > Users in the Dashboard.
SELECT count(*) AS auth_user_count
FROM auth.users;

COMMIT;
