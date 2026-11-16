// 访问次数与统计（Supabase REST）
// 部署时由 GitHub Actions 用仓库变量 SUPABASE_URL / SUPABASE_ANON_KEY 替换下面两个占位符
// 本地预览时保持占位符即可（不会统计）
const SUPABASE = {
  url: "__SUPABASE_URL__",
  anonKey: "__SUPABASE_ANON_KEY__",
};

// 调用 Supabase 数据库函数；没配置、网络不通或超过 6 秒都返回 null，不影响礼物本身
function supabaseReady(){ return /^https:\/\//.test(SUPABASE.url) && !!SUPABASE.anonKey && !SUPABASE.anonKey.startsWith('__'); }
export async function rpc(name,body={}){
  if(!supabaseReady()) return null;
  const ctrl=new AbortController(), timer=setTimeout(()=>ctrl.abort(),6000);
  try{
    const res=await fetch(SUPABASE.url.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{
      method:'POST', signal:ctrl.signal,
      headers:{'apikey':SUPABASE.anonKey,'Authorization':'Bearer '+SUPABASE.anonKey,'Content-Type':'application/json'},
      body:JSON.stringify(body),
    });
    if(!res.ok) return null;
    const txt=await res.text(); return txt?JSON.parse(txt):null;
  }catch(_){ return null; }
  finally{ clearTimeout(timer); }
}
