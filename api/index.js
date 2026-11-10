const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const integer=(n,min,max)=>Number.isInteger(+n)&&+n>=min&&+n<=max;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const send=(status,data)=>res.status(status).json(data);
 const base=process.env.SUPABASE_URL?.replace(/\/$/,'');const key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!base||!key)return send(503,{error:'Supabase bağlantısı henüz yapılandırılmadı.'});
 const path=new URL(req.url,'https://no9.local').pathname;
 if(path==='/api/config'&&req.method==='GET')return send(200,{url:base,key});
 const authorization=req.headers.authorization;
 if(!authorization?.startsWith('Bearer '))return send(401,{error:'E-posta hesabınla giriş yapmalısın.'});
 try{
  const headers={apikey:key,Authorization:authorization,'Content-Type':'application/json'};
  const auth=await fetch(base+'/auth/v1/user',{headers});if(!auth.ok)return send(401,{error:'Oturumun sona erdi. Yeniden giriş yap.'});
  const user=await auth.json();
  const call=async(p,method='GET',body)=>{const r=await fetch(base+'/rest/v1/'+p,{method,headers:{...headers,Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});if(!r.ok){const err=Error('Veri işlemi tamamlanamadı.');err.status=r.status;throw err}return r.status===204?null:r.json()};
  const member=await call('brewery_members?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id');if(!member.length)return send(403,{error:'Hesabın henüz no:9 atölyesine eklenmedi. Atölye yöneticisinden erişim iste.'});
  if(path==='/api/batches'&&req.method==='GET')return send(200,{batches:await call('batches?select=*&order=number.desc'),user:user.email});
  let b=req.body;if(typeof b==='string'){try{b=JSON.parse(b)}catch{return send(400,{error:'Geçersiz veri.'})}}b=b||{};
  const now=new Date().toISOString().slice(0,10);
  if(path==='/api/batches'&&req.method==='POST'){
   if(typeof b.name!=='string'||!b.name.trim()||b.name.length>100||!validDate(b.started)||b.started>now||!integer(b.fermentDays,1,365)||!integer(b.conditionDays,14,730))return send(400,{error:'Adı, tarihi ve süreleri kontrol et.'});
   await call('batches','POST',{name:b.name.trim(),started:b.started,fermentDays:+b.fermentDays,conditionDays:+b.conditionDays,createdBy:user.id});return send(200,{ok:true});
  }
  const id=path.match(/^\/api\/batches\/([a-f0-9-]{36})$/i)?.[1];
  if(id&&req.method==='PATCH'){
   if(b.action==='consume'&&integer(b.amount,1,10000)){await call('rpc/consume_bottles','POST',{batch_id:id,amount:+b.amount});return send(200,{ok:true})}
   if(b.action==='bottle'){
    const rows=await call('batches?id=eq.'+id+'&select=started,bottled');if(!rows.length)return send(404,{error:'Üretim bulunamadı.'});if(rows[0].bottled)return send(409,{error:'Bu üretim zaten şişelenmiş.'});
    if(!validDate(b.bottled)||b.bottled<rows[0].started||b.bottled>now||!integer(b.count,1,10000)||!integer(b.volume,50,5000)||!Number.isFinite(+b.sugarRate)||+b.sugarRate<0||+b.sugarRate>15)return send(400,{error:'Şişeleme bilgilerini kontrol et.'});
    const updated=await call('batches?id=eq.'+id+'&bottled=is.null','PATCH',{bottled:b.bottled,count:+b.count,volume:+b.volume,sugarRate:+b.sugarRate,remaining:+b.count});if(!updated.length)return send(409,{error:'Kayıt değişti. Yenileyip tekrar dene.'});return send(200,{ok:true});
   }
  }
  return send(404,{error:'İşlem bulunamadı.'});
 }catch(e){return send(e.status===409?409:400,{error:e.status===409?'Kayıt başka bir kullanıcı tarafından değiştirildi. Yeniden dene.':'İşlem tamamlanamadı. Bağlantıyı, erişim yetkini ve stok miktarını kontrol et.'})}
}
