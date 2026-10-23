create or replace function private.keep_d7_tombstone()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Use a permanent tombstone instead of deleting D7 rows';
  end if;
  if old.data->>'_deleted' = 'true' then
    return old;
  end if;
  return new;
end;
$$;
do $$
declare tbl text;
begin
  foreach tbl in array array['clientes','produtos','representadas','pedidos','followups','prospectos'] loop
    execute format('create trigger keep_d7_tombstone before update or delete on public.%I for each row execute function private.keep_d7_tombstone()',tbl);
  end loop;
end;
$$;
