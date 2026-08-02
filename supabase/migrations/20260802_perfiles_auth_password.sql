-- Perfiles de usuario (ligados a auth.users).
-- La contraseña vive solo en auth.users (Supabase Auth), nunca en esta tabla.

create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_usuario text not null,
  nombre_completo text,
  es_admin boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Username único (case-insensitive vía citext si existe; si no, unique simple + app normaliza a lower)
create unique index if not exists perfiles_nombre_usuario_lower_uidx
  on public.perfiles (lower(nombre_usuario));

alter table public.perfiles enable row level security;

-- Lectura pública de perfiles (páginas /u/[username], feeds)
drop policy if exists "perfiles_select_public" on public.perfiles;
create policy "perfiles_select_public"
  on public.perfiles
  for select
  using (true);

-- Cada usuario inserta/actualiza solo su fila
drop policy if exists "perfiles_insert_own" on public.perfiles;
create policy "perfiles_insert_own"
  on public.perfiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "perfiles_update_own" on public.perfiles;
create policy "perfiles_update_own"
  on public.perfiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Crear perfil automáticamente al registrarse (metadata de signUp)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
  raw_nombre text;
begin
  raw_username := coalesce(
    nullif(trim(both from new.raw_user_meta_data->>'nombre_usuario'), ''),
    split_part(new.email, '@', 1)
  );
  raw_username := lower(regexp_replace(raw_username, '^@', ''));

  raw_nombre := coalesce(
    nullif(trim(both from new.raw_user_meta_data->>'nombre_completo'), ''),
    nullif(trim(both from new.raw_user_meta_data->>'nombre'), ''),
    raw_username
  );

  insert into public.perfiles (id, nombre_usuario, nombre_completo)
  values (new.id, raw_username, raw_nombre)
  on conflict (id) do update
    set
      nombre_usuario = excluded.nombre_usuario,
      nombre_completo = excluded.nombre_completo,
      actualizado_en = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
