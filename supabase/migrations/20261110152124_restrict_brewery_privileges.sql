begin;
-- Default Supabase grants can include TRUNCATE, which is not protected by RLS.
-- Keep workshop membership administration server-side and grant only app operations.
revoke all on public.brewery_members, public.batches from public, anon, authenticated;
grant select on public.brewery_members to authenticated;
grant select, insert, update on public.batches to authenticated;
revoke all on sequence public.batches_number_seq from public, anon, authenticated;
grant usage, select on sequence public.batches_number_seq to authenticated;
commit;
