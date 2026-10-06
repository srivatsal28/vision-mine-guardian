create type public.app_role as enum ('admin','officer','inspector','viewer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles or admin" on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null default '',
  designation text not null default '',
  site_scope text not null default 'All sites',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed-in" on public.profiles for select to authenticated using (true);

create table public.cameras (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null default '',
  access_code text not null unique,
  stream_url text not null default '',
  status text not null default 'online',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.cameras to authenticated;
grant all on public.cameras to service_role;
alter table public.cameras enable row level security;

create table public.camera_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  camera_id uuid not null references public.cameras(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, camera_id)
);
grant select, delete on public.camera_access to authenticated;
grant all on public.camera_access to service_role;
alter table public.camera_access enable row level security;
create policy "own access" on public.camera_access for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "remove own access" on public.camera_access for delete to authenticated using (user_id = auth.uid());

create policy "admin or granted can view cameras" on public.cameras for select to authenticated
using (public.has_role(auth.uid(),'admin') or exists (select 1 from public.camera_access a where a.camera_id = id and a.user_id = auth.uid()));
create policy "admin insert cameras" on public.cameras for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update cameras" on public.cameras for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete cameras" on public.cameras for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.redeem_camera_code(_code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into cid from public.cameras where upper(access_code) = upper(trim(_code));
  if cid is null then raise exception 'This access code is not valid'; end if;
  insert into public.camera_access(user_id, camera_id) values (auth.uid(), cid) on conflict do nothing;
  return cid;
end $$;
revoke execute on function public.redeem_camera_code(text) from anon, public;
grant execute on function public.redeem_camera_code(text) to authenticated;

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location text not null default '',
  category text not null default 'General',
  status text not null default 'open',
  severity text,
  analysis jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.complaints to authenticated;
grant all on public.complaints to service_role;
alter table public.complaints enable row level security;
create policy "signed-in read complaints" on public.complaints for select to authenticated using (true);
create policy "signed-in file complaints" on public.complaints for insert to authenticated with check (created_by = auth.uid());
create policy "owner or staff update complaints" on public.complaints for update to authenticated
using (created_by = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'officer'));
create policy "admin delete complaints" on public.complaints for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.sensors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null,
  location text not null,
  unit text not null,
  value numeric not null,
  safe_limit numeric not null,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sensors to authenticated;
grant all on public.sensors to service_role;
alter table public.sensors enable row level security;
create policy "read sensors" on public.sensors for select to authenticated using (true);
create policy "admin manage sensors" on public.sensors for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.sensors (name,kind,location,unit,value,safe_limit) values
('Methane – Shaft 3','Methane (CH4)','Shaft 3, North Face','%',0.38,1.25),
('Carbon monoxide – Panel 6','Carbon monoxide','Panel 6','ppm',22,50),
('Respirable dust – Conveyor B2','Dust','Conveyor B2','mg/m3',2.4,3),
('Oxygen – Main return','Oxygen','Main return airway','%',20.4,19),
('Temperature – Deep level','Temperature','Level 4','°C',31.5,33.5),
('Airflow – Panel 6','Air velocity','Panel 6','m/s',1.1,0.5);

insert into public.cameras (name,location,access_code,stream_url,status) values
('Shaft 3 – North Face','Underground, Shaft 3','CGV-7F2K-QM40','','online'),
('Conveyor B2','Surface conveyor','CGV-B2C8-LX19','','online'),
('Explosives Magazine','Magazine yard','CGV-MAG5-RT77','','online');