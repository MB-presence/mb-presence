create extension if not exists pgcrypto;

create table employees (
  id uuid primary key default gen_random_uuid(),
  matricule text unique not null,
  pin_hash text not null,
  name text not null,
  role text not null,
  dept text not null,
  phone text,
  email text,
  status text default 'Absent',
  arrivee text default '--:--',
  depart text default '--:--',
  activity_date date,
  created_at timestamptz default now()
);

create table absences (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  employee_name text,
  date date,
  motif text,
  detail text,
  status text default 'En attente',
  created_at timestamptz default now()
);

create table history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  date date,
  detail text,
  status text,
  created_at timestamptz default now()
);

create table site_settings (
  id int primary key default 1,
  site_code text not null,
  updated_at timestamptz default now()
);
insert into site_settings (id, site_code) values (1, 'MB-INIT')
  on conflict (id) do nothing;

create view employees_public as
  select id, matricule, name, role, dept, phone, email, status, arrivee, depart, activity_date, created_at
  from employees;

alter table employees enable row level security;
alter table absences enable row level security;
alter table history enable row level security;
alter table site_settings enable row level security;

create policy "admin full access employees" on employees
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "anon insert absences" on absences
  for insert with check (true);
create policy "anon select absences" on absences
  for select using (true);
create policy "admin manage absences" on absences
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "anon select history" on history
  for select using (true);
create policy "admin manage history" on history
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "anon select site_settings" on site_settings
  for select using (true);
create policy "admin update site_settings" on site_settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create or replace function verify_employee_login(p_matricule text, p_pin text)
returns setof employees_public
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select ep.* from employees_public ep
    join employees e on e.id = ep.id
    where e.matricule = p_matricule
      and e.pin_hash = crypt(p_pin, e.pin_hash);
end;
$$;

create or replace function create_employee(
  p_matricule text, p_pin text, p_name text, p_role text,
  p_dept text, p_phone text, p_email text
)
returns employees_public
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into employees (matricule, pin_hash, name, role, dept, phone, email)
  values (p_matricule, crypt(p_pin, gen_salt('bf')), p_name, p_role, p_dept, p_phone, p_email)
  returning id into new_id;
  return (select ep.* from employees_public ep where ep.id = new_id);
end;
$$;

create or replace function record_arrival(p_employee_id uuid, p_time text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update employees
    set status = p_status, arrivee = p_time, depart = '--:--', activity_date = current_date
    where id = p_employee_id;
  insert into history (employee_id, date, detail, status)
    values (p_employee_id, current_date, 'Arrivée à ' || p_time, p_status);
end;
$$;

create or replace function record_departure(p_employee_id uuid, p_time text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from employees where id = p_employee_id;
  update employees set depart = p_time where id = p_employee_id;
  insert into history (employee_id, date, detail, status)
    values (p_employee_id, current_date, 'Départ à ' || p_time, v_status);
end;
$$;
