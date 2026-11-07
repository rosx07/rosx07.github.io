-- 방명록(guestbook) 테이블 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣어 실행한다.
-- 안전하게 재실행 가능하도록 작성했다 (기존 데이터를 지우지 않는다).

-- 1) 테이블 생성 (이미 있으면 건너뜀)
create table if not exists public.guestbook (
  id         bigint generated always as identity primary key,
  nickname   text        not null,
  message    text        not null,
  created_at timestamptz not null default now()
);

-- 2) 입력값 길이 제한 (서버/브라우저 검증의 최후방 방어선)
--    별명 2~12자, 메시지 1~100자. 제약이 없을 때만 추가한다.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'guestbook_nickname_len'
  ) then
    alter table public.guestbook
      add constraint guestbook_nickname_len
      check (char_length(nickname) between 2 and 12);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'guestbook_message_len'
  ) then
    alter table public.guestbook
      add constraint guestbook_message_len
      check (char_length(message) between 1 and 100);
  end if;
end $$;

-- 3) 최신순 조회 성능을 위한 인덱스
create index if not exists guestbook_created_at_idx
  on public.guestbook (created_at desc);

-- 4) RLS(Row Level Security) 활성화
--    정책(policy)을 만들지 않으므로 anon/authenticated 로는 접근 불가.
--    서버 함수가 사용하는 service_role 키는 RLS 를 우회하므로 서버 함수만 접근 가능.
alter table public.guestbook enable row level security;
