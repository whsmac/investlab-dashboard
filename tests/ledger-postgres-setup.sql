-- PostgreSQL integration test harness for the isolated ledger migrations.
-- Runs only against an ephemeral CI database; never points at Supabase production.

create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.holdings (symbol text primary key, marker text not null);
create table public.transactions (id integer primary key, marker text not null);
create table public.instruments (symbol text primary key, marker text not null);
insert into public.holdings values ('KEEP-HOLDINGS', 'untouched');
insert into public.transactions values (1, 'untouched');
insert into public.instruments values ('KEEP-INSTRUMENTS', 'untouched');

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
