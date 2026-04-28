-- CAD Module tables for georreferenciamento

-- Projects
create table if not exists cad_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  municipio text,
  uf text,
  codigo_incra text,
  datum text default 'SIRGAS2000',
  utm_zone text default '22S',
  area_ha numeric(14,4),
  status text default 'rascunho' check (status in ('rascunho','em_analise','certificado','cancelado')),
  responsavel text,
  crea_art text,
  data_levantamento date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Vertices / GNSS points
create table if not exists cad_vertices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references cad_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  type text default 'M' check (type in ('M','V','P')),  -- Marco, Virtual, Ponto
  easting numeric(14,3) not null,
  northing numeric(14,3) not null,
  altitude numeric(10,3),
  ordem integer,
  confrontante text,
  precision_m numeric(6,3),
  created_at timestamptz default now()
);

-- Draw features (polylines, polygons)
create table if not exists cad_features (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references cad_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  type text not null check (type in ('polyline','polygon-area')),
  color text default '#ef4444',
  stroke_width integer default 2,
  visible boolean default true,
  vertices jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Imported survey files metadata
create table if not exists cad_survey_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references cad_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  format text not null check (format in ('dxf','landxml','csv','txt')),
  points_count integer,
  warnings jsonb default '[]',
  datum text,
  zone text,
  imported_at timestamptz default now()
);

-- Export history
create table if not exists cad_exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references cad_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null check (format in ('sigef_xml','dxf','docx','kml','csv')),
  filename text,
  exported_at timestamptz default now()
);

-- Confrontantes (boundary neighbors)
create table if not exists cad_confrontantes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references cad_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text default 'propriedade' check (tipo in ('propriedade','via','rio','reserva','outros')),
  vertice_inicio text,
  vertice_fim text,
  lado text,
  ordem integer,
  created_at timestamptz default now()
);

-- Vertex order for polygon perimeter
create table if not exists cad_polygon_order (
  project_id uuid not null references cad_projects(id) on delete cascade,
  vertex_id uuid not null references cad_vertices(id) on delete cascade,
  ordem integer not null,
  primary key (project_id, vertex_id)
);

-- Updated_at trigger
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'cad_projects_updated_at') then
    create trigger cad_projects_updated_at before update on cad_projects
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'cad_features_updated_at') then
    create trigger cad_features_updated_at before update on cad_features
      for each row execute function update_updated_at_column();
  end if;
end $$;

-- Indexes
create index if not exists cad_vertices_project_id_idx on cad_vertices(project_id);
create index if not exists cad_features_project_id_idx on cad_features(project_id);
create index if not exists cad_confrontantes_project_id_idx on cad_confrontantes(project_id);
create index if not exists cad_projects_user_id_idx on cad_projects(user_id);

-- RLS
alter table cad_projects enable row level security;
alter table cad_vertices enable row level security;
alter table cad_features enable row level security;
alter table cad_survey_files enable row level security;
alter table cad_exports enable row level security;
alter table cad_confrontantes enable row level security;
alter table cad_polygon_order enable row level security;

-- Policies: users see only their own data
create policy "users own cad_projects" on cad_projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own cad_vertices" on cad_vertices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own cad_features" on cad_features for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own cad_survey_files" on cad_survey_files for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own cad_exports" on cad_exports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own cad_confrontantes" on cad_confrontantes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own cad_polygon_order" on cad_polygon_order
  for all using (
    exists (select 1 from cad_projects p where p.id = cad_polygon_order.project_id and p.user_id = auth.uid())
  );
