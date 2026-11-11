-- record_pepero() 的测试，CI 在临时 Postgres 上运行（.github/workflows/ci.yml）
\set ON_ERROR_STOP on

set role anon;
select set_config('request.headers', '{"x-forwarded-for":"203.0.113.50, 10.0.0.1"}', false);

-- 合法组合可以记录，包括隐藏的彩虹口味和 final 标记
select public.record_pepero('草莓', '粉色爱心');
select public.record_pepero('彩虹', '杏仁碎', true);

-- 非法的口味 / 配料 / 空值都会被拒绝
do $$
declare bad text[][] := array[['巧克力','粉色爱心'],['草莓','奶油'],['<script>','杏仁碎']];
        i int;
begin
  for i in 1..array_length(bad,1) loop
    begin
      perform public.record_pepero(bad[i][1], bad[i][2]);
      raise exception 'should have rejected % + %', bad[i][1], bad[i][2];
    exception when sqlstate '22023' then null;
    end;
  end loop;
  begin
    perform public.record_pepero(null, '杏仁碎');
    raise exception 'should have rejected null flavor';
  exception when sqlstate '22023' then null;
  end;
end $$;

-- anon 即使有表权限，也因为 RLS 读不到任何行
do $$ begin
  if (select count(*) from public.pepero_choices) <> 0 then raise exception 'anon must not be able to read pepero_choices'; end if;
end $$;

reset role;

do $$ begin
  if (select count(*) from public.pepero_choices) <> 2 then raise exception 'expected exactly 2 rows'; end if;
  if not exists (select 1 from public.pepero_choices where ip='203.0.113.50' and flavor='草莓' and sprinkle='粉色爱心' and final=false) then
    raise exception 'strawberry + hearts row missing';
  end if;
  if not exists (select 1 from public.pepero_choices where flavor='彩虹' and sprinkle='杏仁碎' and final=true) then
    raise exception 'final rainbow row missing';
  end if;
end $$;

select 'all record_pepero tests passed';
