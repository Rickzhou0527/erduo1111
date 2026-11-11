-- 记录耳朵做 Pepero 时选的 口味+配料 组合
-- 由 GitHub Actions（.github/workflows/backend.yml）自动执行

create table if not exists public.pepero_choices (
  id          bigint generated always as identity primary key,
  ip          text        not null,
  flavor      text        not null,
  sprinkle    text        not null,
  final       boolean     not null default false,  -- true：点了"做好啦"时最终选定的那根
  created_at  timestamptz not null default now()
);

-- 打开 RLS 且不加 policy：前端的 anon key 不能直接读写这张表
alter table public.pepero_choices enable row level security;

-- 前端调用入口：只接受页面上存在的口味和配料，IP 从请求头取
create or replace function public.record_pepero(p_flavor text, p_sprinkle text, p_final boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  h    json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  v_ip text;
begin
  if p_flavor is null or p_flavor not in ('牛奶巧克力', '草莓', '抹茶', '白巧克力', '彩虹') then
    raise exception 'invalid flavor: %', p_flavor using errcode = '22023';
  end if;
  if p_sprinkle is null or p_sprinkle not in ('彩虹糖针', '粉色爱心', '杏仁碎') then
    raise exception 'invalid sprinkle: %', p_sprinkle using errcode = '22023';
  end if;

  v_ip := coalesce(
    nullif(h->>'cf-connecting-ip', ''),
    nullif(h->>'x-real-ip', ''),
    nullif(trim(split_part(h->>'x-forwarded-for', ',', 1)), ''),
    'unknown'
  );

  insert into public.pepero_choices (ip, flavor, sprinkle, final)
  values (v_ip, p_flavor, p_sprinkle, coalesce(p_final, false));
end;
$$;

revoke all on function public.record_pepero(text, text, boolean) from public;
grant execute on function public.record_pepero(text, text, boolean) to anon;

-- 想看记录时在 SQL Editor 里运行：
-- select * from public.pepero_choices order by created_at desc;
