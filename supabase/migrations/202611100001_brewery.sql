begin;
create table public.brewery_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 added_at timestamptz not null default now()
);
alter table public.brewery_members enable row level security;
create policy "Members see own membership" on public.brewery_members for select to authenticated using(user_id=auth.uid());
create table public.batches (
 id uuid primary key default gen_random_uuid(),
 number bigint generated always as identity unique,
 name text not null check(length(trim(name)) between 1 and 100),
 started date not null,
 "fermentDays" integer not null check("fermentDays" between 1 and 365),
 "conditionDays" integer not null check("conditionDays" between 14 and 730),
 bottled date,
 count integer check(count between 1 and 10000),
 volume integer check(volume between 50 and 5000),
 "sugarRate" numeric check("sugarRate" between 0 and 15),
 remaining integer check(remaining between 0 and count),
 "createdBy" uuid not null default auth.uid() references auth.users(id),
 check(bottled is null or bottled>=started),
 check((bottled is null and count is null and volume is null and "sugarRate" is null and remaining is null) or (bottled is not null and count is not null and volume is not null and "sugarRate" is not null and remaining is not null))
);
alter table public.batches enable row level security;
create policy "Workshop members read batches" on public.batches for select to authenticated using(exists(select 1 from public.brewery_members where user_id=auth.uid()));
create policy "Workshop members create batches" on public.batches for insert to authenticated with check("createdBy"=auth.uid() and exists(select 1 from public.brewery_members where user_id=auth.uid()));
create policy "Workshop members update batches" on public.batches for update to authenticated using(exists(select 1 from public.brewery_members where user_id=auth.uid())) with check(exists(select 1 from public.brewery_members where user_id=auth.uid()));
grant select on public.brewery_members to authenticated;
grant select,insert,update on public.batches to authenticated;
grant usage,select on sequence public.batches_number_seq to authenticated;
create function public.consume_bottles(batch_id uuid, amount integer) returns void language plpgsql security invoker set search_path=public as $$
begin
 if amount is null or amount<1 or amount>10000 then raise exception 'Geçersiz şişe adedi'; end if;
 update public.batches set remaining=remaining-amount where id=batch_id and remaining>=amount;
 if not found then raise exception 'Yeterli şişe yok veya bu kayda erişilemiyor'; end if;
end;
$$;
revoke all on function public.consume_bottles(uuid,integer) from public,anon;
grant execute on function public.consume_bottles(uuid,integer) to authenticated;
commit;
