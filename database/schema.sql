create extension if not exists pgcrypto;

create table if not exists knowledge_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  category text not null,
  sub_category text,
  difficulty text default '入门',
  card_date date not null unique,
  summary text,
  keywords text[] default '{}',
  content_json jsonb not null,
  image_prompt text,
  image_url text not null default '',
  image_storage_path text,
  generation_status text not null default 'pending',
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists study_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'default_user',
  card_id uuid not null references knowledge_cards(id) on delete cascade,
  completed boolean default false,
  completed_at timestamptz,
  is_favorite boolean default false,
  need_review boolean default false,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, card_id)
);

create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  job_date date not null,
  job_type text not null default 'daily_card',
  status text not null default 'running',
  started_at timestamptz default now(),
  finished_at timestamptz,
  card_id uuid references knowledge_cards(id),
  error_message text,
  unique(job_date, job_type)
);

create index if not exists idx_knowledge_cards_card_date on knowledge_cards(card_date desc);
create index if not exists idx_knowledge_cards_category on knowledge_cards(category);
create index if not exists idx_study_records_user_id on study_records(user_id);
create index if not exists idx_study_records_card_id on study_records(card_id);
