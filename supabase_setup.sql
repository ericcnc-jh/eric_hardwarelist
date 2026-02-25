-- =====================================================
-- GEAR VAULT — Supabase DB 세팅 SQL
-- Supabase 대시보드 → SQL Editor 에 전체 붙여넣기 후 실행
-- =====================================================


-- 1. 카테고리 테이블
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  icon        text not null default '📦',
  color       text not null default '#64748B',
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

-- 2. 장비(재고) 테이블
create table if not exists items (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  name        text not null,
  spec        text,
  serial      text,
  total       int  not null default 1,
  location    text not null default '1층',
  manager     text,
  note        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 3. 변경 로그 테이블
create table if not exists logs (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,   -- 추가 | 수정 | 삭제 | 업로드
  manager     text,
  item_name   text,
  detail      text,
  created_at  timestamptz default now()
);

-- 4. updated_at 자동 갱신 트리거
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on items;
create trigger set_updated_at
  before update on items
  for each row execute function update_updated_at();


-- 5. RLS (Row Level Security) — 누구나 읽기/쓰기 허용
--    나중에 로그인 기능 추가하면 여기서 제한하면 됩니다
alter table categories enable row level security;
alter table items       enable row level security;
alter table logs        enable row level security;

create policy "public read categories"  on categories for select using (true);
create policy "public write categories" on categories for all    using (true);
create policy "public read items"       on items       for select using (true);
create policy "public write items"      on items       for all    using (true);
create policy "public read logs"        on logs        for select using (true);
create policy "public write logs"       on logs        for all    using (true);


-- 6. 기본 카테고리 데이터 삽입
insert into categories (name, icon, color, sort_order) values
  ('컴퓨터/PC',        '🖥', '#2563EB', 0),
  ('그래픽카드',       '🎮', '#7C3AED', 1),
  ('모니터/디스플레이', '📺', '#DB2777', 2),
  ('센서/인터랙티브',  '📡', '#D97706', 3),
  ('케이스/운반',      '📦', '#059669', 4),
  ('전원장비',         '⚡', '#4F46E5', 5)
on conflict (name) do nothing;


-- 완료! 이제 Vercel 배포 단계로 넘어가세요 ✅
