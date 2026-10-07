'use strict';
/* ===== Utilidades ===== */
const $=(s,e=document)=>e.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'$'+Math.round(n).toLocaleString('es-CL');
const dec=(n,d)=>Number(n).toLocaleString('es-CL',{minimumFractionDigits:d,maximumFractionDigits:d});
const iso=d=>{const z=new Date(d);return z.getFullYear()+'-'+String(z.getMonth()+1).padStart(2,'0')+'-'+String(z.getDate()).padStart(2,'0')};
const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return d};
const TODAY=()=>iso(new Date());
const fmtDate=s=>new Date(s+'T12:00').toLocaleDateString('es-CL',{weekday:'short',day:'numeric',month:'short'});
const weekKey=s=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d)};
const HOURS=Array.from({length:30},(_,i)=>9+i*.5);
const hh=h=>{const mins=Math.round(Number(h)*60);return String(Math.floor(mins/60)%24).padStart(2,'0')+':'+String(mins%60).padStart(2,'0')};
const durationLabel=minutes=>minutes===120?'2 horas':'1,5 horas';
const openingHour=()=>9;
const hoursFor=(date,duration=90)=>HOURS.filter(h=>h>=openingHour(date)&&h+duration/60<=24);
const isUpcoming=(date,h)=>{const n=new Date();return date>TODAY()||(date===TODAY()&&h>n.getHours()+n.getMinutes()/60)};
const matchIsFinished=b=>!isUpcoming(b.date,Number(b.hour||0)+Number(b.duration||90)/60);
const uid=()=>Math.random().toString(36).slice(2,9);
const METHODS=['Efectivo','Tarjeta','Transferencia'];
const rutKey=value=>String(value||'').replace(/[^0-9k]/gi,'').toUpperCase();
const formatRut=value=>{const r=rutKey(value);return r.length<2?r:r.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'-'+r.slice(-1)};
const validPhone=value=>{const d=String(value||'').replace(/\D/g,'');return d.length>=8&&d.length<=15};
const phoneKey=value=>{let d=String(value||'').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(d.startsWith('56')&&d.length>9)d=d.slice(2);if(d.startsWith('0')&&d.length>9)d=d.slice(1);return d};
const emailKey=value=>String(value||'').trim().toLowerCase();
function validRut(value){const r=rutKey(value);if(r.length<8||r.length>9)return false;const body=r.slice(0,-1),dv=r.slice(-1);let sum=0,m=2;for(let i=body.length-1;i>=0;i--){sum+=Number(body[i])*m;m=m===7?2:m+1}const n=11-sum%11,check=n===11?'0':n===10?'K':String(n);return check===dv}
const LEVEL_BANDS='0,0–0,9 Inicial · 1,0–1,9 Principiante · 2,0–2,9 Intermedio · 3,0–3,9 Intermedio alto · 4,0–4,9 Avanzado · 5,0–5,9 Competitivo · 6,0–7,0 Élite';
const levelName=n=>{const v=Number(Number(n??0).toFixed(1));return v<1?'Inicial':v<2?'Principiante':v<3?'Intermedio':v<4?'Intermedio alto':v<5?'Avanzado':v<6?'Competitivo':'Élite'};
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2600)}

/* ===== Capa de datos =====
   Esta demo guarda datos solo en el navegador. La futura versión compartida
   requiere autenticación y operaciones de servidor; no basta con cambiar load/save. */
const DB={key:'scr_db_v6',legacyKey:'scr_db_v5',migrationKey:'scr_db_v6_initialized',data:null,
  load(){try{this.data=JSON.parse(localStorage.getItem(this.key))}catch(e){}
    if(!this.data){let legacy=null;try{if(localStorage.getItem(this.migrationKey)!=='1')legacy=JSON.parse(localStorage.getItem(this.legacyKey)||'null')}catch(e){}this.data=legacy?freshDemoFromLegacy(legacy):seed();if(this.save())try{localStorage.setItem(this.migrationKey,'1')}catch(e){}}
    else{for(const k of ['courts','products','bookings','sales','payments','blocks','users','ambassadors','loyalty','debts'])this.data[k]??=[];this.data.courts.forEach(c=>{c.sport='Pádel';c.tariffs??=defaultTariffs()});this.data.settings??={};this.data.debts??=[];this.data.debts.forEach(x=>{x.paid=Number(x.paid)||0;x.payments??=[]});this.data.settings.monthlyIncentive??='Carrera mensual de embajadores';this.data.settings.monthlyTiers??=[{matches:14,prize:'Polerón Sport Center'},{matches:18,prize:'Gift card de $25.000 en Sport Center'},{matches:22,prize:'$30.000 para la tienda Sport Center'}];this.data.bookings.forEach(b=>{b.consumptions??=[];b.payments??=[];const owner=this.data.users.find(u=>u.id===b.user);b.ownerRut||=owner?.rut||b.rut||'';b.debtorRut||=owner?.rut||b.ownerRut||b.rut||''});this.data.users.forEach(u=>{u.matchHistory??=[];u.matchesPlayed=Number(u.matchesPlayed??u.matchHistory.length);u.reliability=Math.max(0,Math.min(100,Number(u.reliability??(20+Math.max(u.matchesPlayed,u.matchHistory.length)*5))))});this.save()}return this.data},
  save(){try{localStorage.setItem(this.key,JSON.stringify(this.data));return true}catch(error){toast('El navegador no pudo guardar los datos. Descarga un respaldo y libera espacio.');return false}},
  reset(){try{localStorage.removeItem(this.key)}catch(e){}location.reload()}};
const D=()=>DB.data;

function freshDemoFromLegacy(previous){
  const fresh=seed();if(!previous||!Array.isArray(previous.users))return fresh;
  fresh.admin=previous.admin||fresh.admin;
  fresh.courts=fresh.courts.map(c=>{const old=previous.courts?.find(x=>x.id===c.id);return old?{...c,name:old.name||c.name,active:old.active!==false,tariffs:old.tariffs||c.tariffs}:c});
  fresh.products=Array.isArray(previous.products)?previous.products.map(p=>({...p})):[];
  fresh.loyalty=Array.isArray(previous.loyalty)?previous.loyalty.map(x=>({...x,history:Array.isArray(x.history)?x.history:[]})):[];
  fresh.users=previous.users.map(u=>{const balance=fresh.loyalty.find(x=>rutKey(x.rut)===rutKey(u.rut))?.points??0;return{...u,level:1,matchesPlayed:0,reliability:20,matchHistory:[],points:balance}});
  fresh.ambassadors=Array.isArray(previous.ambassadors)?previous.ambassadors.map(a=>({...a,uses:0})):[];
  fresh.settings={...fresh.settings,...(previous.settings||{})};
  return fresh;
}

function seed(){
  const courts=[
    {id:'c1',name:'Cancha 1',sport:'Pádel',tariffs:defaultTariffs(),active:true},
    {id:'c2',name:'Cancha 2',sport:'Pádel',tariffs:defaultTariffs(),active:true},
    {id:'c3',name:'Cancha 3',sport:'Pádel',tariffs:defaultTariffs(),active:true}];
  return{admin:{email:'admin@sportcenterrengo.cl',pass:'admin123'},courts,products:[],bookings:[],sales:[],payments:[],blocks:[],users:[],ambassadors:[],loyalty:[],debts:[],settings:{monthlyIncentive:'Carrera mensual de embajadores',monthlyTiers:[{matches:14,prize:'Polerón Sport Center para representar al club con estilo'},{matches:18,prize:'Gift card de $25.000 en la tienda Sport Center'},{matches:22,prize:'$30.000 en la tienda Sport Center'}]}};
}

/* ===== Estado ===== */
function loadSession(){try{const session=JSON.parse(localStorage.getItem('scr_sess_v5')||'{}');if(!session||typeof session!=='object'||Array.isArray(session))return{};return{user:typeof session.user==='string'?session.user:null,admin:session.admin===true}}catch{return{}}}
const S={view:'book',tab:'dash',step:1,sel:{court:null,date:TODAY(),hour:null,duration:90,ambassadorCode:'',ambassadorId:null,discount:0},cart:{},fDate:'',acct:'login',last:null,
  sess:loadSession()};
const court=id=>D().courts.find(c=>c.id===id)||{name:'(eliminada)',price:0};
function defaultTariffs(){return{low:{90:14990,120:18990},high:{90:19990,120:24990}}}
const me=()=>D().users.find(u=>u.id===S.sess.user);
const ambassadorFor=u=>u&&D().ambassadors.find(a=>a.active&&rutKey(a.rut)===rutKey(u.rut));
const isAmbassadorAccount=u=>u&&D().ambassadors.some(a=>a.active&&rutKey(a.rut)===rutKey(u.rut));
const saveSess=()=>{try{localStorage.setItem('scr_sess_v5',JSON.stringify(S.sess));return true}catch{toast('El navegador no pudo guardar la sesión. Puede que debas volver a ingresar al recargar.');return false}};
const clearBookingPerks=()=>{S.sel.usePoints=false;S.sel.ambassadorCode='';S.sel.ambassadorId=null;S.sel.discount=0};

/* ===== Disponibilidad ===== */
const overlaps=(start,duration,otherStart,otherDuration)=>start<otherStart+otherDuration/60&&otherStart<start+duration/60;
const blocked=(c,date,h,duration=90)=>D().blocks.some(b=>b.court===c&&b.date===date&&overlaps(h,duration,b.from,(b.to-b.from)*60));
const taken=(c,date,h,duration=90,skip)=>D().bookings.some(b=>b.id!==skip&&b.court===c&&b.date===date&&b.status!=='cancelada'&&overlaps(h,duration,b.hour,b.duration||60));
function priceParts(c,duration=90,hour=9){
  const tariffs=court(c).tariffs||defaultTariffs(),lowRate=Number(tariffs.low?.[duration]??defaultTariffs().low[duration]),highRate=Number(tariffs.high?.[duration]??defaultTariffs().high[duration]),start=Number(hour),end=start+duration/60;
  const lowMinutes=Math.max(0,Math.min(end,18)-Math.max(start,9))*60,highMinutes=Math.max(0,end-Math.max(start,18))*60;
  const lowAmount=lowMinutes?Math.round(lowRate*lowMinutes/duration):0,highAmount=highMinutes?Math.round(highRate*highMinutes/duration):0,total=lowMinutes&&highMinutes?lowAmount+highAmount:lowMinutes?lowRate:highRate;
  return{total,lowMinutes,highMinutes,lowAmount,highAmount};
}
const priceFor=(c,duration=90,hour=9)=>priceParts(c,duration,hour).total;
const priceMixLabel=(c,duration,hour)=>{const p=priceParts(c,duration,hour);return p.lowMinutes&&p.highMinutes?`${p.lowMinutes} min horario bajo ${money(p.lowAmount)} + ${p.highMinutes} min horario alto ${money(p.highAmount)}`:''};
// El embajador no paga su cuarto de cancha; el beneficio tiene un tope de $5.000.
const ambassadorDiscount=base=>Math.min(5000,Math.ceil(Math.max(0,Number(base)||0)/4));
const tariffLine=(c,duration)=>`${durationLabel(duration)}: ${money(c.tariffs?.low?.[duration]??defaultTariffs().low[duration])} bajo · ${money(c.tariffs?.high?.[duration]??defaultTariffs().high[duration])} alto`;
function slotState(c,date,h,duration=90,skip){
  if(!court(c).active||blocked(c,date,h,duration))return'mant';
  if(h<openingHour(date)||h+duration/60>24)return'mant';
  if(taken(c,date,h,duration,skip))return'busy';
  if(!isUpcoming(date,h))return'past';
  return'free'}
const rev=(from,to)=>D().payments.filter(p=>p.date>=from&&p.date<=to&&p.method!=='Puntos').reduce((n,p)=>n+p.amount,0);
const totalFor=b=>Number(b.price||0)+((b.consumptions||[]).reduce((n,x)=>n+x.qty*x.price,0));
const paidFor=b=>(b.payments||[]).reduce((n,p)=>n+p.amount,0);
const cashPaidFor=b=>(b.payments||[]).filter(p=>p.method!=='Puntos').reduce((n,p)=>n+p.amount,0);
const balanceFor=b=>Math.max(0,totalFor(b)-paidFor(b));
const courtBalanceFor=b=>Math.max(0,Number(b?.price||0)-paidPart(b,'Cancha'));
const syncBookingStatus=b=>{if(b&&b.status!=='cancelada')b.status=balanceFor(b)===0?'pagada':'pendiente'};
const paidPart=(b,label)=> (b.payments||[]).filter(p=>label==='Cancha'?(p.category?p.category==='court':['Cancha','Canje de reserva'].includes(p.label)):p.category?p.category==='consumption'&&p.label===label:p.label===label).reduce((n,p)=>n+p.amount,0);
function loyaltyFor(rut){const key=rutKey(rut);let l=D().loyalty.find(x=>x.rut===key);if(!l){l={rut:key,points:0,remainder:0,history:[]};D().loyalty.push(l)}return l}
function earnPoints(rut,amount,bookingId){const key=rutKey(rut),l=loyaltyFor(key),raw=(l.remainder||0)+Math.max(0,Math.floor(amount));const earned=Math.floor(raw/100);l.remainder=raw%100;l.points+=earned;l.history.push({date:TODAY(),type:'earn',amount:earned,bookingId,paid:amount});return earned}
function syncUserPoints(rut){const u=D().users.find(x=>rutKey(x.rut)===rutKey(rut));if(u)u.points=loyaltyFor(rut).points}
function makeBooking(o){return{id:uid(),court:o.court,date:o.date,hour:+o.hour,duration:+o.duration,name:o.name,phone:o.phone,email:o.email||'',user:o.user||null,ownerRut:rutKey(o.ownerRut||o.rut||''),debtorRut:rutKey(o.debtorRut||o.ownerRut||o.rut||''),basePrice:Number(o.basePrice??o.price)||0,price:+o.price||0,status:'pendiente',ambassadorCode:o.ambassadorCode||'',discount:+o.discount||0,consumptions:[],payments:[],result:null}}
const hbar=(rows,f=n=>n)=>{const m=Math.max(1,...rows.map(r=>r[1]));return`<div class="hb">${rows.map(([l,v])=>`<div><span>${esc(l)}</span><i style="--w:${v/m*100}%"></i><b>${f(v)}</b></div>`).join('')||'<p class="muted">Aún no hay datos.</p>'}</div>`};

/* ===== Modal genérico ===== */
function modal(title,fields,onSave){
  const m=$('#modal');
  const initialValues=Object.fromEntries(fields.map(f=>[f.k,f.v??f.o?.[0]?.[0]??'']));
  const optionsHtml=(f,options)=>options.length?options.map(([v,l,disabled])=>`<option value="${esc(v)}"${String(v)===String(f.v)?' selected':''}${disabled?' disabled':''}>${esc(l)}</option>`).join(''):`<option value="">${esc(f.emptyLabel||'Sin opciones disponibles')}</option>`;
  m.innerHTML=`<form><h3 id="modal-title">${title}</h3>${fields.map(f=>f.t==='checkbox'
    ?`<label class="modal-check"><input type="checkbox" name="${f.k}" value="on" ${f.v?'checked':''}>${f.l}</label>`
    :`<label>${f.l}${f.t==='select'?`<select name="${f.k}">${optionsHtml(f,f.o)}</select>`:`<input name="${f.k}" type="${f.t||'text'}" value="${esc(f.v??'')}" ${f.t==='number'?'min="0"':''} ${f.req===false?'':'required'}>`}${f.unitLabel?`<small class="field-unit" data-unit-for="${esc(f.k)}">${esc(f.unitLabel(initialValues))}</small>`:''}</label>`).join('')}
    <div class="row"><button type="button" class="ghost" data-act="close">Cancelar</button><button class="btn">Guardar</button></div></form>`;
  m.setAttribute('aria-labelledby','modal-title');
  const form=m.querySelector('form');
  let previousMethod=initialValues.method;
  const autoUserField=fields.find(f=>f.autofillUsers);
  if(autoUserField){const input=form.elements.namedItem(autoUserField.k),list=document.createElement('datalist'),matched=document.createElement('input');list.id=`suggestions-${autoUserField.k}`;list.innerHTML=autoUserField.users.map(u=>`<option value="${esc(autoUserField.userOption(u))}" label="${esc(`${u.phone||'Sin teléfono'} · ${formatRut(u.rut)}`)}">`).join('');input?.setAttribute('list',list.id);form.append(list);matched.type='hidden';matched.name='_matchedUserId';matched.value=autoUserField.userId||'';form.append(matched)}
  fields.filter(f=>f.hint).forEach(f=>{const input=form.elements.namedItem(f.k);if(input){input.required=!!f.optionsFor;const hint=document.createElement('small');hint.className='muted';hint.textContent=f.hint;input.closest('label')?.append(hint)}});
  form.addEventListener('input',e=>{if(!autoUserField||e.target.name!==autoUserField.k)return;const typed=String(e.target.value).trim().toLocaleLowerCase('es-CL'),sameName=autoUserField.users.filter(u=>String(u.name||'').trim().toLocaleLowerCase('es-CL')===typed),user=autoUserField.users.find(u=>autoUserField.userOption(u)===e.target.value)||(sameName.length===1?sameName[0]:null),idInput=form.elements.namedItem('_matchedUserId');if(idInput)idInput.value=user?.id||'';if(!user)return;e.target.value=user.name;for(const [key,value]of Object.entries({phone:user.phone||'',debtorRut:user.rut||''})){const input=form.elements.namedItem(key);if(input)input.value=value}const ambassador=D().ambassadors.find(a=>a.active&&rutKey(a.rut)===rutKey(user.rut)),ambassadorInput=form.elements.namedItem('ambassadorId');if(ambassadorInput)ambassadorInput.value=ambassador?.id||''});
  form.onchange=e=>{const values=Object.fromEntries(new FormData(form));if(e.target.name==='method'){const amountField=fields.find(f=>f.convertUnits),input=amountField&&form.elements.namedItem(amountField.k);if(input&&(previousMethod==='Puntos')!==(values.method==='Puntos')){const value=Math.max(0,Number(input.value)||0);input.value=values.method==='Puntos'?Math.floor(value/100):value*100}previousMethod=values.method;}
    fields.filter(f=>f.unitLabel).forEach(f=>{const label=form.elements.namedItem(f.k)?.closest('label')?.querySelector(`[data-unit-for="${f.k}"]`);if(label)label.textContent=f.unitLabel(values)});
    fields.filter(f=>f.t==='select'&&f.optionsFor).forEach(f=>{const select=form.elements.namedItem(f.k),current=select.value,options=f.optionsFor(values),available=options.filter(([, ,disabled])=>!disabled),keep=available.find(([v])=>String(v)===current),earlier=f.k==='hour'?available.filter(([v])=>+v<=+current).at(-1):null,chosen=keep||earlier||available[0]||options[0];select.innerHTML=optionsHtml(f,options);if(chosen)select.value=String(chosen[0])})};
  form.onsubmit=e=>{e.preventDefault();const afterSave=onSave(Object.fromEntries(new FormData(e.target)));
    if(afterSave!==false){m.close();DB.save();render();if(typeof afterSave==='function')afterSave()}};
  m.showModal();
}

/* ===== Render principal ===== */
const focusSelector=el=>{
  if(!el||el===document.body||!el.closest||!el.closest('#app,#nav'))return'';
  if(el.id)return'#'+el.id;
  const a=el.dataset.act;
  if(a)return'[data-act="'+a+'"]'+['id','d','h','t','v','m','item'].filter(k=>el.dataset[k]!==undefined).map(k=>'[data-'+k+'="'+el.dataset[k]+'"]').join('');
  return el.name?el.tagName.toLowerCase()+'[name="'+el.name+'"]':'';
};
function render(){
  const prev=document.activeElement,selector=focusSelector(prev),wasInside=!!(prev&&prev.closest&&prev.closest('#app,#nav'));
  const nav=[['book','Inicio'],['acct',me()?'Mi cuenta':'Ingresar']];if(!isAmbassadorAccount(me()))nav.push(['admin','Administración']);
  $('#nav').innerHTML=nav
    .map(([v,l])=>`<button data-act="view" data-v="${v}" class="${S.view===v?'on':''}"${S.view===v?' aria-current="page"':''}>${l}</button>`).join('');
  $('#app').innerHTML={book:vBook,acct:vAcct,admin:vAdmin}[S.view]();
  document.title=S.view==='book'?'Sport Center Rengo · Reserva de canchas de pádel':({acct:me()?'Mi cuenta':'Ingresar',admin:'Administración'}[S.view]||'Sport Center')+' · Sport Center Rengo';
  /* Al redibujar se destruye el elemento enfocado: se devuelve el foco a su equivalente o al inicio del contenido nuevo. */
  if(wasInside){
    const next=selector?$(selector):null;
    if(next)next.focus({preventScroll:true});
    else{const target=S.view==='book'?$('#booking-flow'):$('#app h2,#app h1');if(target){target.tabIndex=-1;target.focus({preventScroll:true})}}
  }
}

/* ===== Cliente: reservar ===== */
function vBook(){
  const s=S.sel,cs=D().courts.filter(c=>c.active);
  const member=me(),memberPoints=member?loyaltyFor(member.rut).points:0,memberLevel=Number(member?.level??1),upcoming=member?D().bookings.filter(b=>(b.user===member.id||b.rut===rutKey(member.rut)||emailKey(b.email)===emailKey(member.email))&&b.status!=='cancelada'&&isUpcoming(b.date,b.hour)).sort((a,b)=>(a.date+hh(a.hour)).localeCompare(b.date+hh(b.hour))).slice(0,3):[];
  const free=cs.reduce((n,c)=>n+hoursFor(TODAY()).filter(h=>slotState(c.id,TODAY(),h,90)==='free').length,0);
  const steps=['Fecha','Cancha','Horario','Tus datos','Listo'];let b='';
  if(S.step===1)b=`<h2>Elige el día de tu partido</h2><div class="strip">${Array.from({length:7},(_,i)=>addDays(i)).map(d=>{const k=iso(d);
    return`<button type="button" class="day ${s.date===k?'sel':''}" data-act="date" data-d="${k}" aria-pressed="${s.date===k}"><small>${d.toLocaleDateString('es-CL',{weekday:'short'})}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('es-CL',{month:'short'})}</small></button>`}).join('')}</div>
    <label class="inl">O elige otra fecha <input type="date" min="${TODAY()}" max="${iso(addDays(6))}" value="${s.date}" data-act="datein"></label>`;
  if(S.step===2)b=`<p class="muted">${fmtDate(s.date)}</p><h2>Elige una cancha</h2><p class="select-help">Las tarifas dependen del horario: bajo antes de las 18:00 y alto desde las 18:00.</p><div class="grid">${cs.map((c,i)=>`<button type="button" class="opt ${s.court===c.id?'sel':''}" data-act="court" data-id="${c.id}" aria-pressed="${s.court===c.id}"><span class="court-number">0${i+1}</span><small>${esc(c.sport)} · Sport Center</small><b>${esc(c.name)}</b><span>Selecciona para ver los horarios disponibles</span><em>${tariffLine(c,90)}<br>${tariffLine(c,120)}</em>${s.court===c.id?'<strong class="chosen">✓ Seleccionada</strong>':''}</button>`).join('')}</div>${s.court?'<div class="continue-row"><button type="button" class="btn continue-btn" data-act="continue-slots">Continuar con Cancha '+esc(court(s.court).name.replace('Cancha ','#'))+' →</button></div>':''}`;
  if(S.step===3){const durations=[90,120],times=hoursFor(s.date,s.duration),hasSlots=times.some(h=>slotState(s.court,s.date,h,s.duration)==='free');
    b=`<p class="muted">${esc(court(s.court).name)} · ${fmtDate(s.date)} · Pádel</p><label class="duration-label">Duración <select data-act="duration">${durations.map(n=>`<option value="${n}" ${s.duration===n?'selected':''}>${durationLabel(n)} · bajo ${money(priceFor(s.court,n,9))} / alto ${money(priceFor(s.court,n,18))}</option>`).join('')}</select></label><p class="muted">Horario bajo: 09:00–18:00 · Horario alto: 18:00–00:00. Si el partido cruza las 18:00, se prorratea el precio.</p>${hasSlots?`<div class="slots">${times.map(h=>{const st=slotState(s.court,s.date,h,s.duration),mix=priceMixLabel(s.court,s.duration,h),cost=money(priceFor(s.court,s.duration,h));
    return`<button type="button" class="slot ${st}" ${st==='free'?`data-act="hour" data-h="${h}"`:'disabled'}>${hh(h)}<small>${mix?`${mix} · Total ${cost}`:`${cost} · ${{free:'Disponible',busy:'Ocupada',mant:'Bloqueada',past:'Ya pasó'}[st]}`}</small></button>`}).join('')}</div>`:`<div class="empty-slots"><b>No quedan horarios disponibles para este día y duración.</b><p>Elige otra fecha para encontrar una cancha libre.</p><button type="button" class="btn" data-act="change-date">Elegir otro día</button></div>`}`}
  if(S.step===4){const u=me()||{},amb=ambassadorFor(u),base=priceFor(s.court,s.duration,s.hour),mix=priceMixLabel(s.court,s.duration,s.hour);s.ambassadorId=amb?.id||null;s.ambassadorCode=amb?'EMBAJADOR':'';s.discount=amb?ambassadorDiscount(base):0;const discount=s.discount,userPoints=u.rut?loyaltyFor(u.rut).points:0,points=Math.min(userPoints,Math.floor(Math.max(0,base-discount)/100));b=`<div class="split"><form id="fdata">
    <label>Nombre<input name="name" required autocomplete="name" value="${esc(u.name)}"></label>
    <label>Teléfono de contacto<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required value="${esc(u.phone)}"></label>
    <label>Correo<input name="email" type="email" required autocomplete="email" value="${esc(u.email)}" ${u.email?'readonly':''}></label>
    ${u.rut?`<p class="muted">RUT de tu cuenta: ${esc(formatRut(u.rut))} · ${userPoints} puntos disponibles</p>`:`<label>RUT del titular<input name="rut" required placeholder="12.345.678-9" autocomplete="off"></label>`}
    ${amb?`<p class="amb-benefit">Beneficio de embajador: cuarto de cancha liberado (hasta $5.000) · −${money(discount)}</p>`:'<p class="muted">Los beneficios de embajador se aplican desde la cuenta registrada o en Administración.</p>'}
    ${userPoints?`<label class="points-use"><input type="checkbox" name="usePoints" ${s.usePoints?'checked':''}> Canjear hasta ${points} puntos · descuento de hasta ${money(points*100)}</label>`:''}
    <button class="btn">Confirmar reserva</button></form>
    <aside class="sum"><h3>Resumen</h3><p>${esc(court(s.court).name)}</p><p>${fmtDate(s.date)}</p><p>${hh(s.hour)} a ${hh(s.hour+s.duration/60)} · ${durationLabel(s.duration)}</p>${mix?`<p class="muted">${esc(mix)}</p>`:''}
    <p>Reserva ${money(base)}</p>${discount?`<p>Descuento embajador −${money(discount)}</p>`:''}${s.usePoints&&userPoints?`<p>Canje de puntos −${money(points*100)}</p>`:''}<p class="tot">${money(Math.max(0,base-discount-(s.usePoints?points*100:0)))}</p><small>Acumulas 1 punto por cada $100 pagados al cobrar en el club. Canje: 1 punto = $100.</small></aside></div>`}
  if(S.step===5){const l=S.last,recipient=String(l.email||'').split('@').map(encodeURIComponent).join('@'),mailBody=[`Hola ${l.name},`,`Tu reserva en Sport Center está confirmada.`,`Cancha: ${court(l.court).name}`,`Fecha: ${fmtDate(l.date)}`,`Horario: ${hh(l.hour)} · ${durationLabel(l.duration)}`,`Total: ${money(totalFor(l))}`,`Saldo pendiente en el club: ${money(balanceFor(l))}`,`Teléfono de contacto: ${l.phone}`,``, `¡Nos vemos en la cancha!`].join('\n'),mailLink=`mailto:${recipient}?subject=${encodeURIComponent('Confirmación de reserva · Sport Center')}&body=${encodeURIComponent(mailBody)}`;b=`<div class="card ok"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="46"/><path d="M30 52l14 14 27-30"/></svg>
    <h2>¡Reserva confirmada!</h2><p>${esc(court(l.court).name)} · ${fmtDate(l.date)} · ${hh(l.hour)}</p><p class="tot">Saldo en el club: ${money(balanceFor(l))}</p>
    <p class="muted">${me()?'La verás en Mi cuenta.':'Crea una cuenta para ver y cancelar tus reservas.'}</p><p>Confirmación para <b>${esc(l.email)}</b></p><a class="btn mail-confirm" href="${esc(mailLink)}">Preparar correo de confirmación</a><small class="mail-note">Se abrirá tu aplicación de correo con el mensaje listo. Pulsa “Enviar” para mandarlo.</small>
    <button class="ghost" data-act="again">Hacer otra reserva</button></div>`}
  return`<section class="hero"><img class="hero-photo" src="assets/sport-center-rengo.jpg" fetchpriority="high" decoding="async" alt="Cancha de pádel de Sport Center en Rengo"><div class="hero-shade"></div><div class="hero-copy"><div class="hero-mark"><img class="hero-logo" src="assets/logo-sport-center.png" alt="" width="62" height="62">PÁDEL · RENGO</div><h1>Tu próximo partido empieza aquí</h1><p>Reserva tu cancha en Sport Center.</p><span class="pill">${free} horarios disponibles hoy</span>${S.step===1?'<a class="btn hero-cta" href="#booking-flow">Reservar cancha</a>':''}</div></section>
    ${member&&S.step===1?`<section class="member-home"><div class="member-welcome"><span class="eyebrow">TU SPORT CENTER</span><h2>¡Hola, ${esc(member.name)}!</h2><p>Qué bueno tenerte de vuelta. Tu próximo partido te espera.</p><button class="btn" data-act="new-reservation">+ Reservar cancha</button></div><div class="member-points"><small>PUNTOS DISPONIBLES</small><b>${memberPoints.toLocaleString('es-CL')}</b><span>1 punto por cada $100 pagados</span><button class="ghost" data-act="view" data-v="acct">Ver mi cuenta y canjear →</button></div><div class="member-level"><small>TU NIVEL SPORT CENTER</small><b>${dec(memberLevel,1)} <span>/ 7</span></b><strong>${levelName(memberLevel)}</strong><p>Se actualiza con los resultados de tus partidos registrados por Administración.</p></div><div class="member-upcoming"><h3>Próximas reservas</h3>${upcoming.map(x=>`<div class="upcoming-item"><span class="upcoming-date">${fmtDate(x.date)} · ${hh(x.hour)}</span><b>${esc(court(x.court).name)}</b><small>${durationLabel(x.duration)} · saldo ${money(balanceFor(x))}</small></div>`).join('')||'<p class="muted">Todavía no tienes reservas próximas.</p>'}<button class="ghost" data-act="view" data-v="acct">Ver todas mis reservas</button></div></section>`:''}
    ${S.step===1?`<section class="home-gallery"><div class="gallery-heading"><div><span class="eyebrow">UN BUEN PARTIDO TE ESPERA</span><h2>Nos vemos en la cancha</h2></div><span class="photo-note">FOTOS REALES DEL CLUB</span></div><div class="gallery-grid"><figure class="gallery-main"><img src="assets/sport-center-canchas-noche.jpg" loading="lazy" decoding="async" alt="Cancha de pádel iluminada de Sport Center"><figcaption>Canchas iluminadas</figcaption></figure><figure class="gallery-side"><img src="assets/sport-center-vista-canchas.jpg" loading="lazy" decoding="async" alt="Vista de las canchas de pádel de Sport Center"><figcaption>Vista general de las canchas</figcaption></figure></div></section>`:''}
    <ol id="booking-flow" class="steps">${steps.map((t,i)=>`<li class="${S.step>i+1?'done':S.step===i+1?'on':''}"${S.step===i+1?' aria-current="step"':''}>${t}</li>`).join('')}</ol>${b}
    ${S.step>1&&S.step<5?'<p style="margin-top:1rem"><button class="ghost" data-act="back">← Atrás</button></p>':''}
    <section class="venue-info"><div><span class="eyebrow">EL CLUB</span><h2>Sport Center · Pádel</h2><p>Avenida José Bisquertt 788, comuna de Rengo, Región de O’Higgins, Chile.</p><div class="service-list"><span>3 canchas de pádel</span><span>Reservas de 1,5 y 2 horas</span><span>Niveles por partido</span><span>Puntos por pagos</span><span>Beneficio embajador</span></div><a class="booking-contact" href="https://wa.me/56975180031?text=Hola%2C%20quiero%20consultar%20por%20una%20reserva%20en%20Sport%20Center" target="_blank" rel="noopener noreferrer">Consultar reservas por WhatsApp · +56 9 7518 0031 ↗</a></div><div class="hours-card"><h3>Horarios y tarifas</h3><p><b>Todos los días</b><span>09:00 – 00:00</span></p><p><b>Horario bajo</b><span>09:00 – 18:00</span></p><p><b>Horario alto</b><span>18:00 – 00:00</span></p></div></section>`;
}
function confirmBooking(f){
  DB.load();
  const s=S.sel;
  if(slotState(s.court,s.date,s.hour,s.duration)!=='free'){toast('Ese horario se acaba de ocupar. Elige otro.');S.step=3;return render()}
  if(!validPhone(f.phone)){toast('Ingresa un teléfono válido con al menos 8 dígitos');return}
  const email=String(me()?.email||f.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('Ingresa un correo electrónico válido');return}
  const rut=me()?.rut||f.rut;if(rut&&!validRut(rut)){toast('Revisa el RUT ingresado.');return}
  const base=priceFor(s.court,s.duration,s.hour),amb=ambassadorFor(me()),discount=amb?ambassadorDiscount(base):0,l=me()&&s.usePoints?loyaltyFor(rut):null,used=l?Math.min(l.points,Math.floor((base-discount)/100)):0;
  if(used){l.points-=used;l.history.push({date:TODAY(),type:'redeem',amount:used,bookingId:null})}
  const b=makeBooking({court:s.court,date:s.date,hour:s.hour,duration:s.duration,name:f.name,phone:f.phone,email,user:S.sess.user||null,ownerRut:rut,debtorRut:rut,basePrice:base,price:Math.max(0,base-discount),discount,ambassadorCode:amb?'EMBAJADOR':''});b.ambassadorId=amb?.id||null;
  if(used){l.history.at(-1).bookingId=b.id;b.pointsUsed=used;b.payments.push({id:uid(),bookingId:b.id,rut:rutKey(rut),amount:used*100,method:'Puntos',date:TODAY(),label:'Canje de reserva',category:'court'});syncUserPoints(rut)}if(rut){b.rut=rutKey(rut);b.ownerRut=rutKey(rut);b.debtorRut=rutKey(rut)}
  if(amb)amb.uses=(amb.uses||0)+1
  if(balanceFor(b)===0)b.status='pagada';
  D().bookings.push(b);DB.save();S.last=b;S.step=5;render();
}

/* ===== Cliente: cuenta ===== */
function pendingDebt(d){return Math.max(0,Number(d?.amount||0)-Number(d?.paid||0))}
function accountPendingItems(u){
  const fromBookings=D().bookings.filter(b=>b.status!=='cancelada'&&rutKey(b.debtorRut||b.ownerRut||b.rut)===rutKey(u.rut)).map(b=>{
    if(b.status==='cancelada')return null;
    const details=[],courtDue=Math.max(0,Number(b.price||0)-paidPart(b,'Cancha'));
    if(courtDue)details.push({label:`Cancha ${court(b.court).name}`,amount:courtDue});
    for(const x of b.consumptions||[]){const due=Math.max(0,Number(x.qty||0)*Number(x.price||0)-Number(x.paid||0));if(due)details.push({label:`${x.qty} × ${x.name}`,amount:due})}
    const amount=details.reduce((n,x)=>n+x.amount,0);
    return amount?{id:b.id,date:b.date,title:`Reserva · ${court(b.court).name}`,details,amount}:null;
  }).filter(Boolean);
  const fromLedger=(D().debts||[]).filter(d=>d.status!=='anulada'&&rutKey(d.rut)===rutKey(u.rut)&&pendingDebt(d)>0).map(d=>({id:d.id,date:d.date,title:'Saldo del club',details:[{label:d.description,amount:pendingDebt(d)}],amount:pendingDebt(d)}));
  return [...fromBookings,...fromLedger].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
function vAcct(){
  const u=me();
  if(!u){const reg=S.acct==='reg';return`<div class="card" style="max-width:420px;margin:auto"><h2>${reg?'Crear cuenta':'Ingresar'}</h2>
    <form id="${reg?'freg':'flogin'}">${reg?'<label>Nombre<input name="name" required autocomplete="name"></label><label>Teléfono de contacto<input name="phone" required type="tel" inputmode="tel" minlength="8" placeholder="+56 9 1234 5678" autocomplete="tel"></label><label>RUT<input name="rut" required placeholder="12.345.678-9" autocomplete="off"></label>':''}
    <label>Correo<input name="email" type="email" required autocomplete="email"></label><label>Contraseña<input name="pass" type="password" required minlength="4" autocomplete="${reg?'new-password':'current-password'}"></label>
    <button class="btn">${reg?'Crear cuenta':'Ingresar'}</button></form>
    <p style="margin-top:.8rem"><button class="ghost" data-act="acct" data-m="${reg?'login':'reg'}">${reg?'Ya tengo cuenta':'Crear una cuenta nueva'}</button></p><small class="muted" style="display:block;margin-top:.8rem">Demo local: tu cuenta queda guardada en este navegador. Usa una contraseña de prueba y no reutilices la de otros servicios.</small></div>`}
  const bs=D().bookings.filter(b=>b.user===u.id||b.rut===rutKey(u.rut)||emailKey(b.email)===emailKey(u.email)).sort((a,b)=>(b.date+hh(b.hour)).localeCompare(a.date+hh(a.hour))),l=loyaltyFor(u.rut);u.points=l.points;const ambassador=D().ambassadors.find(a=>a.active&&rutKey(a.rut)===rutKey(u.rut)),wk=weekKey(TODAY()),history=u.matchHistory||[],ambassadorDates=ambassador?ambassadorMatches(ambassador):[],weekMatches=ambassadorDates.filter(d=>weekKey(d)===wk).length,monthMatches=ambassadorDates.filter(d=>d.slice(0,7)===TODAY().slice(0,7)).length,rankedAmbassadors=[...D().ambassadors].filter(a=>a.active).sort((a,b)=>ambassadorMatches(b).filter(d=>d.slice(0,7)===TODAY().slice(0,7)).length-ambassadorMatches(a).filter(d=>d.slice(0,7)===TODAY().slice(0,7)).length),ambassadorRank=ambassador?rankedAmbassadors.findIndex(a=>a.id===ambassador.id)+1:0,tierState=ambassadorTierState(monthMatches),pendingItems=accountPendingItems(u),pendingTotal=pendingItems.reduce((n,x)=>n+x.amount,0);
  return`<div class="row"><h2>Hola, ${esc(u.name)}</h2><button class="ghost" data-act="logout">Cerrar sesión</button></div>
    <div class="stats"><div class="card stat"><small>Nivel Sport Center</small><b>${dec(u.level??1,1)} <span class="muted">/ 7</span></b><small>${levelName(Number(u.level??1))} · ${u.matchesPlayed||0} partidos</small><small>Confianza del nivel: ${Math.round(u.reliability??20)}%</small><small>Todos parten en 1,0. Administración registra los resultados; se compara el nivel promedio de los equipos y el marcador. Categorías: ${LEVEL_BANDS}.</small></div><div class="card stat"><small>Puntos Sport Center</small><b>${l.points}</b><small>1 punto por cada $100 pagados</small></div><div class="card stat"><small>RUT asociado</small><b class="rut">${esc(formatRut(u.rut))}</b><small>Tus pagos se suman a esta cuenta</small></div></div>
    <section class="card debt-summary"><div class="debt-summary-head"><div><span class="eyebrow">PARA TU PRÓXIMA VISITA</span><h3>Saldo pendiente</h3></div><b>${money(pendingTotal)}</b></div>${pendingItems.length?`<ul class="debt-list">${pendingItems.map(x=>`<li><div class="debt-line"><b>${esc(x.title)}</b><span>${money(x.amount)}</span></div><small>${fmtDate(x.date)}</small><ul>${x.details.map(d=>`<li>${esc(d.label)} · ${money(d.amount)}</li>`).join('')}</ul></li>`).join('')}</ul><p class="muted">Este saldo queda registrado hasta que lo regularices en el club.</p>`:'<p class="muted">No tienes montos pendientes. Todo está al día.</p>'}</section>
    ${ambassador?`<section class="card ambassador-card"><div><span class="eyebrow">CUENTA EMBAJADOR</span><h3>Tu desafío de esta semana</h3><b class="amb-progress">${Math.min(weekMatches,2)} / 2 reservas semanales</b><p>${weekMatches>=2?'¡Meta semanal cumplida!':`Te faltan ${2-weekMatches} ${2-weekMatches===1?'reserva':'reservas'} para cumplir la meta semanal.`}</p><small>El contador se actualiza cuando el valor de la cancha queda pagado por completo, según la fecha de la reserva. Los niveles deportivos se actualizan aparte al registrar el resultado.</small><div class="race-progress"><span style="width:${Math.min(100,weekMatches/2*100)}%"></span></div></div><div><small>Tu puesto en la carrera mensual</small><b class="amb-month">${monthMatches?`#${ambassadorRank} · ${monthMatches} reservas este mes`:'Aún sin reservas este mes'}</b><p class="muted">${esc(D().settings?.monthlyIncentive||'Carrera mensual')}</p>${tierState.earned?`<p class="tier-reward"><b>Premio alcanzado (${tierState.earned.matches} reservas):</b> ${esc(tierState.earned.prize)}</p>`:'<p class="tier-reward">Aún no alcanzas una recompensa mensual.</p>'}${tierState.next?`<p>Te faltan <b>${tierState.next.matches-monthMatches} reservas</b> para: ${esc(tierState.next.prize)}</p>`:'<p>¡Alcanzaste todas las metas mensuales!</p>'}<small>Se libera un cuarto de cancha en cada reserva (hasta $5.000).</small></div></section>`:''}
    ${matchHistorySection(history)}
    <div class="row"><h3>Mis reservas</h3><button class="btn" data-act="new-reservation">+ Reservar cancha</button></div>
    <div class="card tw"><table><tr><th>Fecha</th><th>Hora</th><th>Cancha</th><th>Total</th><th>Saldo</th><th>Estado</th><th></th></tr>
    ${bs.map(b=>{const status=b.status==='cancelada'?'cancelada':balanceFor(b)===0?'pagada':'pendiente';return`<tr><td>${fmtDate(b.date)}</td><td>${hh(b.hour)}</td><td>${esc(court(b.court).name)}</td><td>${money(totalFor(b))}</td><td>${money(balanceFor(b))}</td><td><span class="st ${status}">${status}</span></td>
    <td>${status==='pendiente'&&isUpcoming(b.date,b.hour)?(cashPaidFor(b)===0?`<button class="ghost danger" data-act="cancel" data-id="${b.id}">Cancelar</button>`:'<small>Contacta al club para coordinar la cancelación de una reserva con pagos.</small>'):''}</td></tr>`}).join('')||'<tr><td colspan="7">Todavía no tienes reservas. ¡Reserva tu primera cancha!</td></tr>'}</table></div>
    <h3 style="margin-top:1.2rem">Movimientos de puntos</h3><div class="card tw"><table><tr><th>Fecha</th><th>Movimiento</th><th>Puntos</th></tr>${[...l.history].reverse().slice(0,10).map(x=>`<tr><td>${fmtDate(x.date)}</td><td>${({earn:'Pago acreditado',redeem:'Canje realizado',refund:'Devolución por cancelación'}[x.type]||'Movimiento')}</td><td>${x.type==='earn'||x.type==='refund'?'+':'−'}${x.amount}</td></tr>`).join('')||'<tr><td colspan="3">Aún no tienes movimientos de puntos.</td></tr>'}</table><small>Equivalencia de canje: 1 punto = $100. La reserva acumula puntos cuando se cobra en Administración.</small></div>`;
}
function matchHistorySection(history){const rows=[...history].reverse().slice(0,10).map(m=>{const booking=D().bookings.find(x=>x.id===m.bookingId),change=Number(m.ratingChange||0),result=({win:'Victoria',loss:'Derrota',draw:'Empate'}[m.result]||'Partido'),color=change>0?'rating-up':change<0?'rating-down':'';return'<tr><td>'+esc(fmtDate(booking?.date||m.date))+'</td><td>'+result+'</td><td>'+esc(m.score||'—')+'</td><td class="'+color+'">'+(change>0?'+':'')+dec(change,2)+'</td></tr>'}).join('');return'<section class="card match-history"><h3>Mis partidos</h3>'+(rows?'<div class="card tw"><table><tr><th>Fecha</th><th>Resultado</th><th>Marcador</th><th>Cambio de nivel</th></tr>'+rows+'</table></div>':'<p class="muted">Tus resultados aparecerán aquí cuando Administración registre un partido.</p>')+'</section>'}
function cancelBooking(b){if(!b||b.status==='cancelada')return;for(const p of b.payments||[]){if(p.method==='Puntos'&&['Cancha','Canje de reserva'].includes(p.label)&&!p.refunded){const rut=p.rut||b.rut,points=Math.floor(p.amount/100);if(rut&&points>0){const l=loyaltyFor(rut);l.points+=points;l.history.push({date:TODAY(),type:'refund',amount:points,bookingId:b.id});syncUserPoints(rut)}p.refunded=true}}for(const x of b.consumptions||[]){if((x.paid||0)===0){const product=D().products.find(y=>y.id===x.pid);if(product)product.stock+=x.qty}}b.status='cancelada';if(b.result){b.result=null;recalculateAllRatings()}}

/* Copias locales para proteger los datos mientras el prototipo no tiene servidor. */
const BACKUP_FORMAT='sport-center-local-backup';
function exportLocalBackup(){
  const payload={format:BACKUP_FORMAT,version:1,exportedAt:new Date().toISOString(),data:D()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`sport-center-respaldo-${TODAY()}.json`;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Respaldo descargado');
}
function backupProblem(payload){
  const d=payload?.data,arrays=['courts','products','bookings','sales','payments','blocks','users','ambassadors','loyalty'];
  if(payload?.format!==BACKUP_FORMAT||payload?.version!==1||!d||!d.admin||arrays.some(k=>!Array.isArray(d[k])))return'El archivo no es un respaldo compatible de Sport Center.';
  const seen={email:new Set(),rut:new Set(),phone:new Set()};
  for(const u of d.users){
    const keys={email:emailKey(u.email),rut:rutKey(u.rut),phone:phoneKey(u.phone)};
    for(const [field,key] of Object.entries(keys))if(key){if(seen[field].has(key))return`El respaldo contiene cuentas con ${field==='email'?'correo':field==='rut'?'RUT':'teléfono'} duplicado.`;seen[field].add(key)}
  }
  return'';
}
async function importLocalBackup(input){
  const file=input.files?.[0];if(!file)return;
  try{
    const payload=JSON.parse(await file.text()),problem=backupProblem(payload);
    if(problem){toast(problem);return}
    if(!confirm('Restaurar esta copia reemplazará todas las reservas, cuentas, pagos, puntos, inventario y estadísticas guardadas en este navegador. ¿Continuar?'))return;
    localStorage.setItem(DB.key,JSON.stringify(payload.data));DB.load();
    S.sess={admin:true};saveSess();S.view='admin';S.tab='dash';S.cart={};clearBookingPerks();render();toast('Respaldo restaurado');
  }catch(error){toast('No se pudo leer el respaldo. El archivo actual queda intacto.')}finally{input.value=''}
}

/* ===== Administración ===== */
const TABS=[['dash','Resumen'],['res','Reservas'],['deb','Saldos'],['can','Canchas'],['ven','Ventas'],['inv','Inventario'],['amb','Embajadores'],['rep','Reportes']];
function vAdmin(){
  if(isAmbassadorAccount(me()))return`<div class="card"><h2>Cuenta de embajador</h2><p>El acceso a Administración está reservado para el equipo del club.</p><button class="btn" data-act="view" data-v="acct">Volver a mi cuenta</button></div>`;
  if(!S.sess.admin)return`<div class="card" style="max-width:420px;margin:auto"><h2>Acceso de administrador</h2>
    <form id="fadmin"><label>Correo<input name="email" type="email" required autocomplete="username"></label><label>Contraseña<input name="pass" type="password" required autocomplete="current-password"></label>
    <button class="btn">Entrar al panel</button></form><small>Demo: admin@sportcenterrengo.cl / admin123</small></div>`;
  const v={dash:aDash,res:aRes,deb:aDebts,can:aCan,ven:aVen,inv:aInv,amb:aAmb,rep:aRep}[S.tab]();
  return`<div class="row admin-heading"><h2>Panel de administración</h2><span class="admin-tools"><button class="ghost" data-act="backup-export">Descargar respaldo</button><button class="ghost" data-act="backup-import">Restaurar respaldo</button><input id="backup-file" type="file" accept=".json,application/json" aria-label="Elegir archivo de respaldo" hidden><button class="ghost danger" data-act="reset">Borrar todos los datos</button><button class="ghost" data-act="alogout">Salir</button></span></div><small class="backup-note">El respaldo puede incluir RUT, teléfonos, correos y contraseñas de demostración. Guárdalo en un lugar privado y no lo compartas.</small>
    <div class="tabs">${TABS.map(([k,l])=>`<button data-act="tab" data-t="${k}" class="${S.tab===k?'on':''}">${l}</button>`).join('')}</div>${v}`;
}
function aDash(){
  const t=TODAY(),wk=iso(addDays(-6)),mo=t.slice(0,8)+'01',low=D().products.filter(p=>p.stock<=p.min).length;
  const use=D().courts.map(c=>[c.name,D().bookings.filter(b=>b.court===c.id&&b.status!=='cancelada').length]);
  const st=(l,v,w)=>`<div class="card stat ${w?'warn':''}"><small>${l}</small><b>${v}</b></div>`;
  return`<div class="stats">${st('Reservas de hoy',D().bookings.filter(b=>b.date===t&&b.status!=='cancelada').length)}${st('Ingresos hoy',money(rev(t,t)))}
    ${st('Últimos 7 días',money(rev(wk,t)))}${st('Este mes',money(rev(mo,t)))}${st('Stock bajo',low,low)}</div>
    <div class="card"><h3>Canchas más usadas</h3>${hbar(use.sort((a,b)=>b[1]-a[1]),n=>n+' reservas')}</div>`;
}
function bookingFields(b={}){
  const c=court(b.court||D().courts[0]?.id),durations=[90,120],users=D().users,customerOption=u=>`${u.name} · ${formatRut(u.rut)}`;
  const baseDate=b.date||TODAY(),hourOptions=values=>{const date=values.date||baseDate,duration=+values.duration||b.duration||90,courtId=values.court||c.id;return hoursFor(date,duration).map(h=>{const state=slotState(courtId,date,h,duration,b.id),price=priceFor(courtId,duration,h),mix=priceMixLabel(courtId,duration,h),status=state==='free'?'Disponible':state==='busy'?'Ocupada':state==='past'?'Ya pasó':'Bloqueada';return[h,`${hh(h)} · ${money(price)}${mix?` (${mix})`:''} · ${status}`,state!=='free']})};
  const firstOptions=hourOptions({date:baseDate,duration:b.duration||90,court:c.id}),firstAvailable=firstOptions.find(([, ,disabled])=>!disabled)?.[0]??firstOptions[0]?.[0]??'';
  const availableCourts=D().courts.filter(x=>x.active||x.id===b.court);
  return[
    {k:'court',l:'Cancha',t:'select',v:b.court,o:availableCourts.map(c=>[c.id,c.name])},
    {k:'date',l:'Fecha',t:'date',v:b.date||TODAY()},
    {k:'hour',l:'Hora de inicio',t:'select',v:b.hour??firstAvailable,o:firstOptions,optionsFor:hourOptions,hint:'Se muestra el horario completo hasta el cierre: inicio máximo 22:30 para 1,5 h y 22:00 para 2 h. Las horas ocupadas o bloqueadas aparecen deshabilitadas.'},
    {k:'duration',l:'Duración',t:'select',v:b.duration||90,o:durations.map(n=>[n,durationLabel(n)])},
    {k:'name',l:'Cliente · escribe o selecciona una cuenta',v:b.name,suggestions:users.map(u=>({value:customerOption(u),label:`${u.phone||'Sin teléfono'} · ${formatRut(u.rut)}`})),autofillUsers:true,users,userOption:customerOption,userId:b.user||''},
    {k:'phone',l:'Teléfono de contacto',t:'tel',v:b.phone},
    {k:'debtorRut',l:'RUT del deudor (responsable del saldo pendiente)',v:b.debtorRut||b.ownerRut||b.rut||'',req:false},
    {k:'ambassadorId',l:'Embajador (¼ de cancha, tope $5.000)',t:'select',v:b.ambassadorId||'',o:[['','Sin descuento'],...D().ambassadors.filter(a=>a.active).map(a=>[a.id,a.name+' · '+a.rut])]}
  ]
}
function ambassadorMatches(a){const key=rutKey(a.rut),u=D().users.find(x=>rutKey(x.rut)===key);return D().bookings.filter(b=>b.status!=='cancelada'&&courtBalanceFor(b)===0&&(b.ambassadorId===a.id||rutKey(b.rut)===key||(u&&b.user===u.id))).map(b=>b.date)}
function ambassadorTierState(matches){const tiers=[...(D().settings.monthlyTiers||[])].sort((a,b)=>a.matches-b.matches),earned=tiers.filter(t=>matches>=t.matches).at(-1)||null,next=tiers.find(t=>matches<t.matches)||null;return{earned,next,tiers}}
function priorResultsFor(rut){const key=rutKey(rut);return D().bookings.flatMap(b=>b.result?.players||[]).filter(x=>rutKey(typeof x==='string'?x:x.rut)===key)}
function calculateLevel(history){return history.reduce((level,m)=>{const result=typeof m==='string'?'draw':m.result,delta=Number(typeof m==='string'?0:m.ratingChange??(result==='win'?.1:result==='loss'?-.05:0));return Math.max(0,Math.min(7,Number((level+delta).toFixed(2))))},1)}
function playerLevel(p){const key=rutKey(p.rut),u=D().users.find(x=>rutKey(x.rut)===key);if(u)return Math.max(0,Math.min(7,Number(u.level??1)));return calculateLevel(priorResultsFor(key))}
function playerReliability(p){const key=rutKey(p.rut),u=D().users.find(x=>rutKey(x.rut)===key);return Math.max(0,Math.min(100,Number(u?.reliability??(20+priorResultsFor(key).length*5))))}
function ratingChangeForResult(players,score){
  const teamA=players.slice(0,2),teamB=players.slice(2,4);
  const avgA=teamA.reduce((n,p)=>n+playerLevel(p),0)/(teamA.length||1),avgB=teamB.reduce((n,p)=>n+playerLevel(p),0)/(teamB.length||1);
  const expectedA=1/(1+10**((avgB-avgA)/2)),outcomeA=players[0]?.result==='win'?1:players[0]?.result==='loss'?0:.5;
  const sets=String(score||'').match(/(\d+)\s*[-–:]\s*(\d+)/g)||[];let marginFactor=1;
  if(sets.length){let diff=0,games=0;for(const set of sets){const [x,y]=set.match(/\d+/g).map(Number);diff+=Math.abs(x-y);games+=x+y}if(games)marginFactor=.85+.3*Math.min(1,diff/games)}
  const deltaA=.2*(outcomeA-expectedA)*marginFactor;
  return Object.fromEntries(players.map((p,i)=>{const confidenceFactor=.25+.75*(1-playerReliability(p)/100),requested=(i<2?deltaA:-deltaA)*confidenceFactor,oldLevel=playerLevel(p),newLevel=Math.max(0,Math.min(7,oldLevel+requested));return[rutKey(p.rut),+(newLevel-oldLevel).toFixed(4)]}));
}
function recalculateAllRatings(){
  const matches=D().bookings.map((b,index)=>({b,index,saved:b.result})).filter(x=>x.b.status!=='cancelada'&&x.saved&&x.saved.players?.length===4)
    .sort((a,b)=>String(a.b.date).localeCompare(String(b.b.date))||Number(a.b.hour)-Number(b.b.hour)||a.index-b.index);
  matches.forEach(x=>{x.b.result=null});
  D().users.forEach(u=>{u.level=1;u.matchesPlayed=0;u.reliability=20;u.matchHistory=[]});
  matches.forEach(({b,saved})=>{
    const participants=saved.players.map(p=>({rut:typeof p==='string'?p:p.rut,result:typeof p==='string'?'draw':p.result||'draw'}));
    const deltas=ratingChangeForResult(participants,saved.score),score=String(saved.score||'').trim();
    b.result={...saved,score,date:b.date,players:participants.map(p=>({rut:rutKey(p.rut),result:p.result,ratingChange:deltas[rutKey(p.rut)]}))};
    participants.forEach(p=>{const u=D().users.find(x=>rutKey(x.rut)===rutKey(p.rut));if(!u)return;
      u.matchHistory.push({date:b.date,bookingId:b.id,result:p.result,score,ratingChange:deltas[rutKey(p.rut)]});
      u.level=calculateLevel(u.matchHistory);u.matchesPlayed=u.matchHistory.length;u.reliability=Math.min(100,20+u.matchesPlayed*5)
    });
  });
}
function saveMatchResult(b,o){const rivals=o.result==='win'?'loss':o.result==='loss'?'win':'draw',participants=[{rut:o.player1,result:o.result},{rut:o.partner,result:o.result},{rut:o.opponent1,result:rivals},{rut:o.opponent2,result:rivals}];if(participants.some(x=>!validRut(x.rut))){toast('Ingresa y revisa el RUT de los cuatro jugadores');return false}if(String(o.score||'').trim()&&!/^\d+\s*[-–:]\s*\d+(?:\s*[,;]\s*\d+\s*[-–:]\s*\d+)*$/.test(String(o.score).trim())){toast('Usa el formato de marcador 6-4, 6-3 o deja el campo vacío');return false}const playerKeys=participants.map(x=>rutKey(x.rut));if(new Set(playerKeys).size!==playerKeys.length){toast('Cada jugador debe tener un RUT distinto');return false}b.result={score:String(o.score||'').trim(),date:b.date,players:participants.map(p=>({rut:rutKey(p.rut),result:p.result,ratingChange:0}))};recalculateAllRatings();return true}
function openMatchResult(b,owner,amb){const prior=b.result?.players||[],rutAt=i=>typeof prior[i]==='string'?prior[i]:prior[i]?.rut||'',oldResult=typeof prior[0]==='string'?'win':prior[0]?.result||'win';modal(b.result?'Corregir resultado':'Añadir resultado',[{k:'result',l:'Resultado para el jugador 1 y su equipo',t:'select',v:oldResult,o:[['win','Su equipo ganó'],['loss','Su equipo perdió'],['draw','Empató']]},{k:'score',l:'Marcador (ej. 6-4, 6-3; opcional)',v:b.result?.score||'',req:false},{k:'player1',l:'RUT del jugador 1',v:rutAt(0)||owner?.rut||amb?.rut||''},{k:'partner',l:'RUT de su pareja',v:rutAt(1)},{k:'opponent1',l:'RUT del rival 1',v:rutAt(2)},{k:'opponent2',l:'RUT del rival 2',v:rutAt(3)}],o=>saveMatchResult(b,o))}
function openBookingPayment(b){
  if(!b)return;const due=courtBalanceFor(b);if(due<=0)return;
  const fields=[{k:'rut',l:'RUT de quien paga (recibe puntos)',v:b.debtorRut||b.rut||''},{k:'method',l:'Forma de pago',t:'select',o:[...METHODS.map(m=>[m,m]),['Puntos','Canje de puntos']]},{k:'amount',l:'Monto',t:'number',v:Math.min(due,Math.ceil((b.basePrice||b.price)/4)),convertUnits:true,unitLabel:v=>v.method==='Puntos'?'Puntos (1 = $100)':'Pesos chilenos'}];
  const matchFinished=!isUpcoming(b.date,b.hour+(b.duration||90)/60);if(matchFinished)fields.push({k:'recordMatch',l:b.result?'Corregir también el resultado y los niveles':'Registrar también el resultado del partido',t:'checkbox',v:false,req:false});
  modal('Cobrar reserva',fields,o=>{
    if(!validRut(o.rut)){toast('Ingresa un RUT válido para registrar quién paga');return false}
    const isPoints=o.method==='Puntos',raw=Math.floor(Number(o.amount)||0);let amount;
    if(isPoints){const l=loyaltyFor(o.rut),pts=Math.min(raw,l.points,Math.floor(due/100));if(pts<=0){toast(due<100?'Queda menos de $100 por pagar; cobra el saldo en pesos':'Ese RUT no tiene puntos suficientes');return false}amount=pts*100;l.points-=pts;l.history.push({date:TODAY(),type:'redeem',amount:pts,bookingId:b.id})}
    else{amount=Math.min(due,raw);if(amount>0)earnPoints(o.rut,amount,b.id)}
    if(amount<=0){toast('El monto debe ser mayor a cero');return false}
    const payment={id:uid(),bookingId:b.id,rut:rutKey(o.rut),amount,method:isPoints?'Puntos':o.method,date:TODAY(),label:'Cancha',category:'court'};b.payments??=[];b.payments.push(payment);D().payments.push(payment);syncUserPoints(o.rut);syncBookingStatus(b);
    if(matchFinished&&o.recordMatch==='on')return()=>{const owner=D().users.find(x=>x.id===b.user),amb=D().ambassadors.find(a=>a.id===b.ambassadorId);openMatchResult(b,owner,amb)};
  });
}
function openConsumptionPayment(b,index){
  const item=b?.consumptions?.[index];if(!item)return;
  const due=Math.max(0,item.qty*item.price-(item.paid||0));if(due<=0)return;
  modal('Cobrar consumo',[{k:'rut',l:'RUT de quien paga (recibe puntos)',v:b.debtorRut||b.rut||''},{k:'method',l:'Forma de pago',t:'select',o:[...METHODS.map(m=>[m,m]),['Puntos','Canje de puntos']]},{k:'amount',l:'Monto',t:'number',v:due,convertUnits:true,unitLabel:v=>v.method==='Puntos'?'Puntos (1 = $100)':'Pesos chilenos'}],o=>{
    if(!validRut(o.rut)){toast('Ingresa un RUT válido para registrar quién paga');return false}
    const isPoints=o.method==='Puntos',raw=Math.floor(Number(o.amount)||0);let amount;
    if(isPoints){const l=loyaltyFor(o.rut),pts=Math.min(raw,l.points,Math.floor(due/100));if(pts<=0){toast(due<100?'Queda menos de $100 por pagar; cobra el saldo en pesos':'Ese RUT no tiene puntos suficientes');return false}amount=pts*100;l.points-=pts;l.history.push({date:TODAY(),type:'redeem',amount:pts,bookingId:b.id})}
    else{amount=Math.min(due,raw);if(amount>0)earnPoints(o.rut,amount,b.id)}
    if(amount<=0)return false;
    const payment={id:uid(),bookingId:b.id,rut:rutKey(o.rut),amount,method:isPoints?'Puntos':o.method,date:TODAY(),label:item.name,category:'consumption'};b.payments??=[];b.payments.push(payment);D().payments.push(payment);item.paid=(item.paid||0)+amount;syncUserPoints(o.rut);syncBookingStatus(b);
  });
}
function aRes(){
  const bs=D().bookings.filter(b=>!S.fDate||b.date===S.fDate).sort((a,b)=>(b.date+hh(b.hour)).localeCompare(a.date+hh(a.hour))).slice(0,60);
  return`<div class="row" style="margin-bottom:.7rem"><label class="inl">Fecha <input type="date" value="${S.fDate}" data-act="fdate"></label>
    <button class="btn" data-act="newbook">+ Nueva reserva</button></div><p class="muted"><b>Sistema de nivel Sport Center (0–7).</b> Todos comienzan en 1,0. Solo Administración registra o corrige resultados amistosos con el RUT de los cuatro jugadores. El sistema compara el nivel promedio de ambos equipos: ganar frente a un equipo más fuerte suma más; perder frente a uno más débil resta más. El marcador puede ajustar el cambio hasta 15%. La confianza parte en 20% y aumenta 5 puntos por partido hasta 100%, por lo que los niveles nuevos se mueven más. Categorías: ${LEVEL_BANDS}.</p>
    <div class="card tw"><table><tr><th>Fecha</th><th>Hora</th><th>Cancha</th><th>Cliente / RUT deudor</th><th>Detalle y saldo</th><th>Estado</th><th>Acciones</th></tr>
    ${bs.map(b=>`<tr><td>${fmtDate(b.date)}</td><td>${hh(b.hour)}</td><td>${esc(court(b.court).name)}</td><td>${esc(b.name)}<br><small>${esc(b.phone)} · Deudor: ${esc(b.debtorRut?formatRut(b.debtorRut):'RUT sin asignar')}</small></td><td>Cancha ${money(b.basePrice||b.price)}${priceMixLabel(b.court,b.duration||90,b.hour)?`<br><small>${esc(priceMixLabel(b.court,b.duration||90,b.hour))}</small>`:''}${b.discount?`<br><small>Embajador −${money(b.discount)}</small>`:''}<br><b>Total ${money(totalFor(b))} · Saldo ${money(balanceFor(b))}</b>${(b.consumptions||[]).map((x,i)=>`<br><small>${x.qty}× ${esc(x.name)} · ${money(x.qty*x.price)} ${x.paid>=x.qty*x.price?'· Pagado':b.status!=='cancelada'?`<button class="ghost" data-act="charge-item" data-id="${b.id}" data-item="${i}">Cobrar</button>`:''}${!x.paid&&b.status!=='cancelada'?` <button class="ghost danger" data-act="remove-consumption" data-id="${b.id}" data-item="${i}">Quitar</button>`:''}</small>`).join('')}${b.payments?.length?`<details class="pay-history"><summary>Ver ${b.payments.length} pago(s)</summary>${b.payments.map(p=>`<small>${esc(p.label)} · ${esc(formatRut(p.rut))} · ${money(p.amount)} (${esc(p.method)})</small>`).join('')}</details>`:''}</td>
    <td><span class="st ${esc(b.status)}">${b.status==='cancelada'?'cancelada':balanceFor(b)===0?'pagada':'pendiente'}</span>${b.result?`<br><small>Nivel actualizado</small>`:''}</td><td>
    ${b.status!=='cancelada'?`${b.price-paidPart(b,'Cancha')>0?`<button class="ghost" data-act="pay" data-id="${b.id}">Cobrar cancha</button>`:''}${balanceFor(b)>0?`<button class="ghost" data-act="assign-debtor" data-id="${b.id}">Asignar saldo a RUT</button>`:''}<button class="ghost" data-act="add-consumption" data-id="${b.id}">+ Consumo</button><button class="ghost result-action" data-act="match-result" data-id="${b.id}">${b.result?'Corregir resultado':'Añadir resultado'}</button>`:''}
    ${b.status!=='cancelada'?`<button class="ghost" data-act="editbook" data-id="${b.id}">Editar</button><button class="ghost danger" data-act="acancel" data-id="${b.id}">Cancelar</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7">No hay reservas para este filtro.</td></tr>'}</table></div>`;
}
function aDebts(){
  const bookingRows=D().bookings.filter(b=>b.status!=='cancelada'&&(balanceFor(b)>0||(!isUpcoming(b.date,b.hour+(b.duration||90)/60)&&!b.result))).map(b=>({kind:'booking',b,date:b.date,name:b.name,rut:b.debtorRut||b.ownerRut||b.rut||'',amount:totalFor(b),paid:paidFor(b),due:balanceFor(b),courtDue:courtBalanceFor(b)}));
  const debtRows=(D().debts||[]).map(d=>({kind:'debt',d,date:d.date,name:d.name||D().users.find(u=>rutKey(u.rut)===rutKey(d.rut))?.name||'Cliente',rut:d.rut,amount:d.amount,paid:d.paid||0,due:pendingDebt(d),status:d.status}));
  const rows=[...bookingRows,...debtRows].sort((a,b)=>String(b.date).localeCompare(String(a.date))),open=rows.filter(x=>x.due>0&&(x.kind!=='debt'||x.status!=='anulada')),total=open.reduce((n,x)=>n+x.due,0);
  return`<div class="row"><div><h3>Saldos por cobrar</h3><p class="muted">Revisa aquí los saldos de reservas, consumos y cobros independientes. Cada deuda queda asignada al RUT de quien debe; al cobrar puedes registrar otro RUT como pagador.</p></div><button class="btn" data-act="new-debt">+ Registrar saldo independiente</button></div><div class="stats"><div class="card stat"><small>Total pendiente</small><b>${money(total)}</b></div><div class="card stat"><small>Saldos por cobrar</small><b>${open.length}</b></div></div><p class="muted">Los cargos de una reserva aparecen aquí automáticamente. Las reservas con partidos terminados y resultado pendiente también aparecen aquí. Agrega consumos desde su reserva y evita registrar otra vez el mismo cargo como saldo independiente.</p><div class="card tw"><table><tr><th>Cliente</th><th>RUT del deudor</th><th>Fecha</th><th>Detalle</th><th>Total</th><th>Abonado</th><th>Pendiente</th><th>Estado / acciones</th></tr>${rows.map(x=>{
    const state=x.kind==='booking'?(x.due>0?'pendiente':'pagada'):x.status==='anulada'?'anulada':x.due?'pendiente':'pagada',payments=x.kind==='booking'?(x.b.payments||[]):(x.d.payments||[]);
    const details=x.kind==='booking'?[
      x.courtDue?`Cancha ${esc(court(x.b.court).name)} · pendiente ${money(x.courtDue)}`:'',
      ...(x.b.consumptions||[]).map(i=>{const due=Math.max(0,i.qty*i.price-(i.paid||0));return due?`${esc(i.qty+' × '+i.name)} · pendiente ${money(due)}`:''})
    ].filter(Boolean).join('<br>'):esc(x.d.description);
    const matchFinished=x.kind==='booking'&&matchIsFinished(x.b),actions=x.kind==='booking'?`${x.courtDue?`<button class="ghost" data-act="pay" data-id="${x.b.id}">Cobrar cancha</button>`:''}${(x.b.consumptions||[]).map((i,index)=>i.qty*i.price-(i.paid||0)>0?`<button class="ghost" data-act="charge-item" data-id="${x.b.id}" data-item="${index}">Cobrar ${esc(i.name)}</button>`:'').join('')}${matchFinished&&!x.b.result?`<button class="ghost result-action" data-act="match-result" data-id="${x.b.id}">Añadir resultado</button>`:''}${x.due>0?`<button class="ghost" data-act="assign-debtor" data-id="${x.b.id}">${x.rut?'Cambiar RUT deudor':'Asignar RUT deudor'}</button>`:''}`:x.due?`<button class="ghost" data-act="collect-debt" data-id="${x.d.id}">Cobrar</button><button class="ghost danger" data-act="void-debt" data-id="${x.d.id}">Anular</button>`:'';
    return`<tr><td>${esc(x.name||'Cliente')}${x.kind==='booking'?`<br><small>Reserva · ${esc(court(x.b.court).name)}</small>`:`<br><small>Saldo independiente</small>`}</td><td>${esc(x.rut?formatRut(x.rut):'RUT sin asignar')}</td><td>${fmtDate(x.date)}</td><td>${details}</td><td>${money(x.amount)}</td><td>${money(x.paid)}</td><td><b>${money(x.due)}</b></td><td><span class="st ${state==='anulada'?'cancelada':state}">${state}</span>${actions}${payments.length?`<details class="pay-history"><summary>Ver ${payments.length} cobro(s)</summary>${payments.map(p=>`<small>${fmtDate(p.date)} · paga RUT ${esc(formatRut(p.rut))} · ${money(p.amount)} (${esc(p.method)})</small>`).join('')}</details>`:''}</td></tr>`
  }).join('')||'<tr><td colspan="8">No hay saldos registrados.</td></tr>'}</table></div>`;
}
function aAmb(){const users=D().users,settings=D().settings,tiers=[...(settings.monthlyTiers||[])].sort((a,b)=>a.matches-b.matches),currentWeek=weekKey(TODAY()),month=a=>ambassadorMatches(a).filter(d=>d.slice(0,7)===TODAY().slice(0,7)).length,ranked=[...D().ambassadors].filter(a=>a.active).sort((a,b)=>month(b)-month(a)),leader=ranked[0],leaderCount=leader?month(leader):0;return`<div class="row"><div><h3>Carrera mensual de embajadores</h3><p class="muted">Cuenta la reserva cuando el valor de la cancha queda pagado por completo, según la fecha reservada. Administración registra aparte el resultado y los niveles deportivos.</p></div><button class="btn" data-act="newamb">+ Marcar RUT embajador</button></div><div class="card"><form id="fincentive" class="amb-settings"><label>Nombre de la carrera<input name="incentive" value="${esc(settings.monthlyIncentive||'')}" placeholder="Carrera de partidos"></label><div class="monthly-tiers">${[0,1,2].map(i=>`<fieldset><legend>Recompensa ${i+1}</legend><label>Meta · reservas del mes<input name="threshold${i+1}" type="number" min="1" value="${tiers[i]?.matches??[14,18,22][i]}" required></label><label>Premio<input name="prize${i+1}" value="${esc(tiers[i]?.prize??'')}" placeholder="Escribe el premio" required></label></fieldset>`).join('')}</div><button class="btn">Guardar carrera y recompensas</button></form><small>Meta semanal: 2 reservas. Cada reserva cuenta cuando queda pagado el valor de la cancha; los consumos se cobran aparte. El descuento se aplica aparte.</small>${leader&&leaderCount?`<p class="leader-note">Va primero: <b>${esc(leader.name)}</b> · ${leaderCount} reservas este mes</p>`:'<p class="leader-note">La carrera comienza cuando la primera cancha del mes quede pagada.</p>'}</div><div class="card tw"><h3>Tabla de posiciones · ${new Date().toLocaleDateString('es-CL',{month:'long',year:'numeric'})}</h3><table><tr><th>Puesto</th><th>Embajador</th><th>RUT</th><th>Reservas de la semana</th><th>Reservas del mes</th><th>Premio alcanzado / siguiente</th></tr>${ranked.map((a,i)=>{const dates=ambassadorMatches(a),wk=dates.filter(d=>weekKey(d)===currentWeek).length,mo=month(a),tier=ambassadorTierState(mo);return`<tr class="${i===0&&mo?'winner-row':''}"><td>${i+1}${mo?(i===0?' 🥇':i===1?' 🥈':i===2?' 🥉':''):''}</td><td>${esc(a.name)}</td><td>${esc(formatRut(a.rut))}</td><td>${wk} / 2</td><td><b>${mo}</b></td><td>${tier.earned?`Alcanzado: ${esc(tier.earned.prize)}`:tier.next?`Siguiente: ${tier.next.matches} reservas · ${esc(tier.next.prize)}`:'—'}</td></tr>`}).join('')||'<tr><td colspan="6">No hay cuentas de embajadores activas.</td></tr>'}</table>${users.length?'<p class="muted">Puedes asociar cuentas existentes a un RUT desde «Marcar RUT embajador».</p>':''}</div>`}
function aCan(){
  return`<div class="card tw"><table><tr><th>Cancha</th><th>Deporte</th><th>1,5 horas</th><th>2 horas</th><th>Estado</th><th></th></tr>
    ${D().courts.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.sport)}</td><td>${money(c.tariffs?.low?.[90]??14990)} bajo · ${money(c.tariffs?.high?.[90]??19990)} alto</td><td>${money(c.tariffs?.low?.[120]??18990)} bajo · ${money(c.tariffs?.high?.[120]??24990)} alto</td><td><span class="st ${c.active?'ok':'cancelada'}">${c.active?'Disponible':'Inactiva'}</span></td>
    <td><button class="ghost" data-act="editcourt" data-id="${c.id}">Editar tarifas</button><button class="ghost" data-act="togcourt" data-id="${c.id}">${c.active?'Desactivar':'Activar'}</button></td></tr>`).join('')}</table></div>
    <div class="row"><h2>Bloqueos por mantenimiento</h2><button class="btn" data-act="newblock">+ Bloquear horario</button></div>
    <div class="card tw"><table><tr><th>Cancha</th><th>Fecha</th><th>Horario</th><th></th></tr>
    ${D().blocks.map(b=>`<tr><td>${esc(court(b.court).name)}</td><td>${fmtDate(b.date)}</td><td>${hh(b.from)} a ${hh(b.to)}</td><td><button class="ghost danger" data-act="delblock" data-id="${b.id}">Quitar</button></td></tr>`).join('')||'<tr><td colspan="4">Sin bloqueos activos.</td></tr>'}</table></div>`;
}
function aVen(){
  const ps=D().products,items=Object.entries(S.cart).map(([id,q])=>({p:ps.find(x=>x.id===id),q})).filter(x=>x.p),tot=items.reduce((n,x)=>n+x.p.price*x.q,0);
  return`<div class="pos"><div><h3>Productos</h3><div class="grid">${ps.map(p=>`<button class="opt" data-act="add" data-id="${p.id}" ${p.stock<1?'disabled':''}><small>${esc(p.cat)}</small><b>${esc(p.name)}</b><span>${money(p.price)} · stock ${p.stock}</span></button>`).join('')}</div></div>
    <form id="fcart" class="card"><h3>Venta actual</h3>${items.map(x=>`<div class="row"><span>${x.q} × ${esc(x.p.name)}</span><span>${money(x.p.price*x.q)} <button type="button" class="ghost" data-act="rem" data-id="${x.p.id}">−</button></span></div>`).join('')||'<p class="muted">Toca un producto para agregarlo.</p>'}
    <p class="tot">${money(tot)}</p><label>RUT de quien paga<input name="rut" required placeholder="12.345.678-9"></label><small id="pos-points" class="muted">Ingresa el RUT para consultar los puntos disponibles.</small><label class="points-use"><input type="checkbox" name="usePoints"> Usar puntos disponibles · 1 punto = $100</label><small class="muted">Se aplican puntos hasta donde alcance el saldo; el resto se cobra con el medio de pago elegido.</small><label>Método de pago del saldo<select name="method">${METHODS.map(m=>`<option>${m}</option>`).join('')}</select></label>
    <button class="btn ball" ${items.length?'':'disabled'}>Cobrar y descontar stock</button></form></div>
    <h2>Últimas ventas</h2><div class="card tw"><table><tr><th>Fecha</th><th>Detalle</th><th>Pago</th><th>Total</th></tr>
    ${[...D().sales].reverse().slice(0,10).map(s=>`<tr><td>${fmtDate(s.date)}</td><td>${s.items.map(i=>i.qty+'× '+esc(i.name)).join(', ')}</td><td>${esc(s.method)}</td><td>${money(s.total)}</td></tr>`).join('')}</table></div>`;
}
const prodFields=p=>[{k:'name',l:'Nombre',v:p.name},{k:'cat',l:'Categoría',v:p.cat},{k:'price',l:'Precio',t:'number',v:p.price},{k:'stock',l:'Stock',t:'number',v:p.stock},{k:'min',l:'Alerta de stock bajo (≤)',t:'number',v:p.min??5}];
function aInv(){
  return`<div class="row" style="margin-bottom:.7rem"><h3>Inventario</h3><button class="btn" data-act="newprod">+ Agregar producto</button></div>
    <div class="card tw"><table><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th></th></tr>
    ${D().products.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.cat)}</td><td>${money(p.price)}</td><td>${p.stock} ${p.stock<=p.min?'<span class="st low">Stock bajo</span>':''}</td>
    <td><button class="ghost" data-act="editprod" data-id="${p.id}">Editar</button><button class="ghost danger" data-act="delprod" data-id="${p.id}">Eliminar</button></td></tr>`).join('')||'<tr><td colspan="5">Aún no hay productos. Agrega el primero.</td></tr>'}</table></div>`;
}
function aRep(){
  const days=Array.from({length:7},(_,i)=>iso(addDays(i-6))),byP={},byC={};
  const addItem=(name,cat,qty,price)=>{const total=qty*price;byP[name]=(byP[name]||0)+total;byC[cat||'Otros']=(byC[cat||'Otros']||0)+total};
  D().sales.forEach(s=>s.items.forEach(i=>addItem(i.name,i.cat,i.qty,i.price)));
  D().bookings.forEach(b=>(b.consumptions||[]).forEach(x=>{if(b.status!=='cancelada'||(x.paid||0)>0){const p=D().products.find(y=>y.id===x.pid);addItem(x.name,x.cat||p?.cat,x.qty,x.price)}}));
  const sort=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]);
  return`<div class="card"><h3>Ingresos por día (reservas pagadas + productos)</h3>${hbar(days.map(d=>[fmtDate(d),rev(d,d)]),money)}</div>
    <div class="card" style="margin-top:1rem"><h3>Productos vendidos y consumidos</h3>${hbar(sort(byP),money)}</div>
    <div class="card" style="margin-top:1rem"><h3>Ventas por categoría</h3>${hbar(sort(byC),money)}</div>`;
}

/* ===== Eventos ===== */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el||el.tagName==='INPUT')return;
  const a=el.dataset.act,id=el.dataset.id,s=S.sel;let d=D();
  const bk=()=>d.bookings.find(b=>b.id===id),pr=()=>d.products.find(p=>p.id===id);
  const A={
    view:()=>{if(el.dataset.v==='book'&&S.step===5){S.step=1;S.sel={court:null,date:TODAY(),hour:null,duration:90,ambassadorCode:'',ambassadorId:null,discount:0};S.last=null}S.view=el.dataset.v;render()},close:()=>$('#modal').close(),
    court:()=>{s.court=id;s.hour=null;s.duration=90;render()},'continue-slots':()=>{if(!s.court){toast('Primero selecciona una cancha');return}S.step=3;render()},'change-date':()=>{s.hour=null;s.court=null;S.step=1;render()},date:()=>{s.date=el.dataset.d;s.court=null;S.step=2;render()},
    hour:()=>{s.hour=+el.dataset.h;S.step=4;render()},back:()=>{S.step--;render()},again:()=>{S.step=1;S.sel={court:null,date:TODAY(),hour:null,duration:90,ambassadorCode:'',ambassadorId:null,discount:0};S.last=null;render()},
    acct:()=>{S.acct=el.dataset.m;render()},logout:()=>{S.sess.user=null;clearBookingPerks();saveSess();render()},'new-reservation':()=>{S.view='book';S.step=1;S.sel={court:null,date:TODAY(),hour:null,duration:90,ambassadorCode:'',ambassadorId:null,discount:0};render()},
    cancel:()=>{if(confirm('¿Cancelar esta reserva?')){cancelBooking(bk());DB.save();render();toast('Reserva cancelada')}},
    tab:()=>{S.tab=el.dataset.t;render()},alogout:()=>{S.sess.admin=false;saveSess();render()},
    reset:()=>{if(confirm('Se borrarán las reservas, ventas, cuentas, inventario y estadísticas. ¿Seguir? También se borrarán los saldos pendientes.'))DB.reset()},
    'backup-export':()=>exportLocalBackup(),'backup-import':()=>$('#backup-file').click(),
    acancel:()=>{const b=bk(),cashPaid=cashPaidFor(b),pointsSpent=(b.payments||[]).some(p=>p.method==='Puntos'&&['Cancha','Canje de reserva'].includes(p.label)&&!p.refunded);if(confirm('¿Cancelar esta reserva?'+(cashPaid?` Hay ${money(cashPaid)} en pagos en dinero; el prototipo no registra devoluciones.`:'')+(pointsSpent?' Los puntos canjeados en la cancha se devolverán.':''))){cancelBooking(b);DB.save();render()}},
    pay:()=>openBookingPayment(bk()),
    'charge-item':()=>openConsumptionPayment(bk(),+el.dataset.item),
    'add-consumption':()=>{const b=bk();if(!d.products.length){toast('Primero agrega productos en Inventario');return}modal('Agregar consumo a la reserva',[{k:'product',l:'Producto',t:'select',o:d.products.filter(p=>p.stock>0).map(p=>[p.id,`${p.name} · ${money(p.price)} · stock ${p.stock}`])},{k:'qty',l:'Cantidad',t:'number',v:1}],o=>{const p=d.products.find(x=>x.id===o.product),qty=+o.qty;if(!p||qty<1||p.stock<qty){toast('Revisa el producto y el stock');return false}p.stock-=qty;b.consumptions=b.consumptions||[];b.consumptions.push({pid:p.id,name:p.name,cat:p.cat,qty,price:p.price,paid:0});syncBookingStatus(b)})},
    'remove-consumption':()=>{const b=bk(),ix=+el.dataset.item,x=b.consumptions[ix];if(x&&!x.paid&&confirm(`¿Quitar ${x.qty} × ${x.name} y devolverlo al inventario?`)){const p=d.products.find(y=>y.id===x.pid);if(p)p.stock+=x.qty;b.consumptions.splice(ix,1);syncBookingStatus(b);DB.save();render()}},
    'assign-debtor':()=>{const b=bk();if(!b||balanceFor(b)<=0)return;modal('Asignar saldo pendiente',[{k:'rut',l:'RUT del deudor (esta deuda aparecerá en esa cuenta)',v:b.debtorRut||b.ownerRut||b.rut||''}],o=>{if(!validRut(o.rut)){toast('Ingresa un RUT chileno válido');return false}b.debtorRut=rutKey(o.rut)})},
    'new-debt':()=>modal('Registrar saldo pendiente',[{k:'rut',l:'RUT del deudor (se agregará a esta cuenta)',v:''},{k:'name',l:'Nombre (opcional)',v:'',req:false},{k:'description',l:'Detalle de lo que debe',v:''},{k:'amount',l:'Monto pendiente · pesos chilenos',t:'number',v:''}],o=>{if(!validRut(o.rut)){toast('Ingresa un RUT chileno válido');return false}const amount=Math.floor(Number(o.amount));if(amount<=0){toast('Ingresa un monto mayor a cero');return false}const rut=rutKey(o.rut),user=d.users.find(u=>rutKey(u.rut)===rut),description=String(o.description||'').trim();if(!description){toast('Escribe el detalle del saldo');return false}d.debts??=[];d.debts.push({id:uid(),rut,name:String(o.name||'').trim()||user?.name||'',description,amount,paid:0,date:TODAY(),status:'pendiente',payments:[]})}),
    'collect-debt':()=>{const debt=d.debts.find(x=>x.id===id);if(!debt)return;const due=pendingDebt(debt);if(due<=0)return;modal('Cobrar saldo pendiente',[{k:'rut',l:'RUT de quien paga (la deuda sigue ligada al deudor)',v:debt.rut},{k:'method',l:'Forma de pago',t:'select',o:[...METHODS.map(m=>[m,m]),['Puntos','Canje de puntos']]},{k:'amount',l:'Monto',t:'number',v:due,convertUnits:true,unitLabel:v=>v.method==='Puntos'?'Puntos (1 = $100)':'Pesos chilenos'}],o=>{if(!validRut(o.rut)){toast('Ingresa un RUT chileno válido');return false}const isPoints=o.method==='Puntos',raw=Math.floor(Number(o.amount)||0);let amount;if(isPoints){const l=loyaltyFor(o.rut),pts=Math.min(raw,l.points,Math.floor(due/100));if(pts<=0){toast(due<100?'Queda menos de $100 por pagar; cobra el saldo en pesos':'Ese RUT no tiene puntos suficientes');return false}amount=pts*100;l.points-=pts;l.history.push({date:TODAY(),type:'redeem',amount:pts,debtId:debt.id})}else{amount=Math.min(due,raw);if(amount>0)earnPoints(o.rut,amount,debt.id)}if(amount<=0){toast('El monto debe ser mayor a cero');return false}const payment={id:uid(),debtId:debt.id,rut:rutKey(o.rut),amount,method:isPoints?'Puntos':o.method,date:TODAY(),label:debt.description,category:'debt'};debt.payments??=[];debt.payments.push(payment);d.payments.push(payment);debt.paid=(debt.paid||0)+amount;debt.status=debt.paid>=debt.amount?'pagada':'pendiente';syncUserPoints(o.rut)})},
    'void-debt':()=>{const debt=d.debts.find(x=>x.id===id);if(!debt||pendingDebt(debt)<=0)return;if(confirm(`¿Anular el saldo pendiente de ${money(pendingDebt(debt))} de ${debt.name||formatRut(debt.rut)}? Los cobros ya registrados se conservan.`)){debt.status='anulada';debt.voidedAt=TODAY();DB.save();render()}},
    newamb:()=>modal('Seleccionar cuenta embajadora',d.users.length?[{k:'rut',l:'Cliente · RUT',t:'select',o:d.users.map(u=>[rutKey(u.rut),`${u.name} · ${u.rut}`])}]:[{k:'name',l:'Nombre'},{k:'rut',l:'RUT de la cuenta'}],o=>{if(!validRut(o.rut)){toast('Ingresa un RUT chileno válido');return false}if(d.ambassadors.some(a=>rutKey(a.rut)===rutKey(o.rut))){toast('Ese RUT ya está registrado como embajador');return false}const u=d.users.find(x=>rutKey(x.rut)===rutKey(o.rut));if(!u&&!o.name){toast('Primero crea la cuenta del cliente o ingresa su nombre');return false}d.ambassadors.push({id:uid(),name:u?.name||o.name,rut:rutKey(o.rut),active:true,uses:0});if(u)u.ambassador=true}),
    toggleamb:()=>{const x=d.ambassadors.find(x=>x.id===id);x.active=!x.active;DB.save();render()},
    'match-result':()=>{const b=bk(),owner=d.users.find(x=>x.id===b.user),amb=d.ambassadors.find(a=>a.id===b.ambassadorId);openMatchResult(b,owner,amb)},
    newbook:()=>modal('Nueva reserva',bookingFields(),o=>{d=DB.load();o.hour=+o.hour;o.duration=+o.duration;if(!validPhone(o.phone)){toast('Ingresa un teléfono válido con al menos 8 dígitos');return false}if(o.debtorRut&&!validRut(o.debtorRut)){toast('Ingresa un RUT válido para el deudor');return false}if(slotState(o.court,o.date,o.hour,o.duration)!=='free'){toast('Ese horario no está disponible');return false}
      const customer=d.users.find(u=>u.id===o._matchedUserId)||null,am=d.ambassadors.find(x=>x.id===o.ambassadorId),basePrice=priceFor(o.court,o.duration,o.hour),discount=am?ambassadorDiscount(basePrice):0,debtorRut=validRut(o.debtorRut)?rutKey(o.debtorRut):rutKey(customer?.rut||am?.rut||'');const b=makeBooking({...o,email:customer?.email||'',user:customer?.id||null,ownerRut:customer?.rut||debtorRut,debtorRut,basePrice,price:basePrice-discount,discount});b.ambassadorId=am?.id||null;b.rut=rutKey(customer?.rut||am?.rut||debtorRut);if(am)am.uses=(am.uses||0)+1;d.bookings.push(b)}),
    editbook:()=>{const b=bk(),hasPayments=paidFor(b)>0,fields=hasPayments?[{k:'name',l:'Cliente',v:b.name},{k:'phone',l:'Teléfono de contacto',t:'tel',v:b.phone},{k:'debtorRut',l:'RUT del deudor (responsable del saldo pendiente)',v:b.debtorRut||b.ownerRut||b.rut||'',req:false}]:bookingFields(b);modal(hasPayments?'Editar datos del cliente y deudor':'Editar reserva',fields,o=>{if(!validPhone(o.phone)){toast('Ingresa un teléfono válido con al menos 8 dígitos');return false}if(o.debtorRut&&!validRut(o.debtorRut)){toast('Ingresa un RUT válido para el deudor');return false}if(hasPayments){Object.assign(b,{name:o.name,phone:o.phone});b.debtorRut=rutKey(o.debtorRut||'');return}o.hour=+o.hour;o.duration=+o.duration;if(slotState(o.court,o.date,o.hour,o.duration,b.id)!=='free'){toast('Ese horario no está disponible');return false}
      const customer=d.users.find(u=>u.id===o._matchedUserId)||null,am=d.ambassadors.find(x=>x.id===o.ambassadorId),basePrice=priceFor(o.court,o.duration,o.hour),discount=am?ambassadorDiscount(basePrice):0,debtorRut=rutKey(o.debtorRut||customer?.rut||am?.rut||'');Object.assign(b,o,{user:customer?.id||null,email:customer?.email||'',ownerRut:customer?.rut||debtorRut,debtorRut,rut:rutKey(customer?.rut||am?.rut||debtorRut),ambassadorId:am?.id||null,basePrice,discount});delete b._matchedUserId;b.price=basePrice-discount;syncBookingStatus(b)})},
    editcourt:()=>{const c=court(id),t=c.tariffs||defaultTariffs();modal('Editar tarifas de cancha',[{k:'name',l:'Nombre',v:c.name},{k:'low90',l:'Horario bajo · 1,5 horas',t:'number',v:t.low[90]},{k:'low120',l:'Horario bajo · 2 horas',t:'number',v:t.low[120]},{k:'high90',l:'Horario alto · 1,5 horas',t:'number',v:t.high[90]},{k:'high120',l:'Horario alto · 2 horas',t:'number',v:t.high[120]}],o=>{c.name=o.name;c.sport='Pádel';c.tariffs={low:{90:+o.low90,120:+o.low120},high:{90:+o.high90,120:+o.high120}}})},
    togcourt:()=>{const c=court(id);c.active=!c.active;DB.save();render()},
    newblock:()=>modal('Bloquear horario',[{k:'court',l:'Cancha',t:'select',o:d.courts.map(c=>[c.id,c.name])},{k:'date',l:'Fecha',t:'date',v:TODAY()},
      {k:'from',l:'Desde',t:'select',v:11,o:HOURS.map(h=>[h,hh(h)])},{k:'to',l:'Hasta',t:'select',v:12,o:HOURS.map(h=>[h+.5,hh(h+.5)])}],o=>{
      if(+o.to<=+o.from){toast('La hora final debe ser posterior');return false}d.blocks.push({id:uid(),court:o.court,date:o.date,from:+o.from,to:+o.to})}),
    delblock:()=>{d.blocks=d.blocks.filter(b=>b.id!==id);DB.save();render()},
    add:()=>{const p=pr();if((S.cart[id]||0)<p.stock)S.cart[id]=(S.cart[id]||0)+1;else toast('No hay más stock');render()},
    rem:()=>{if(--S.cart[id]<=0)delete S.cart[id];render()},
    newprod:()=>modal('Nuevo producto',prodFields({}),o=>{d.products.push({id:uid(),name:o.name,cat:o.cat,price:+o.price,stock:+o.stock,min:+o.min})}),
    editprod:()=>{const p=pr();modal('Editar producto',prodFields(p),o=>Object.assign(p,{name:o.name,cat:o.cat,price:+o.price,stock:+o.stock,min:+o.min}))},
    delprod:()=>{if(confirm('¿Eliminar este producto del inventario?')){d.products=d.products.filter(p=>p.id!==id);delete S.cart[id];DB.save();render()}}};
  A[a]?.();
});
document.addEventListener('change',e=>{
  if(e.target.id==='backup-file'){importLocalBackup(e.target);return}
  const a=e.target.dataset.act;
  if(a==='datein'&&e.target.value){if(e.target.value<TODAY()||e.target.value>iso(addDays(6))){toast('Puedes reservar hasta con seis días de anticipación');e.target.value=S.sel.date;return}S.sel.date=e.target.value;S.step=2;render()}
  if(a==='duration'){S.sel.duration=+e.target.value;render()}
  if(a==='fdate'){S.fDate=e.target.value;render()}
  if(e.target.name==='usePoints'&&e.target.form?.id==='fdata'){S.sel.usePoints=e.target.checked;render()}
  if(e.target.form?.id==='fcart'&&e.target.name==='rut'){const key=rutKey(e.target.value),points=D().loyalty.find(x=>rutKey(x.rut)===key)?.points||0;const note=$('#pos-points');if(note)note.textContent=validRut(key)?`Puntos disponibles: ${points} · equivalen a ${money(points*100)}.`:'Escribe un RUT válido para consultar el saldo.'}
});
document.addEventListener('submit',e=>{
  const f=e.target,o=Object.fromEntries(new FormData(f));let d=D();
  if(!['fdata','freg','flogin','fadmin','fcart','fincentive'].includes(f.id))return;
  e.preventDefault();
  if(f.id==='fdata')confirmBooking(o);
    if(f.id==='freg'){d=DB.load();if(d.users.some(u=>emailKey(u.email)===emailKey(o.email)))return toast('Ese correo ya tiene cuenta');if(!validRut(o.rut))return toast('Ingresa un RUT chileno válido');if(!validPhone(o.phone))return toast('Ingresa un teléfono válido con al menos 8 dígitos');if(d.users.some(u=>rutKey(u.rut)===rutKey(o.rut)))return toast('Ese RUT ya está asociado a una cuenta');if(d.users.some(u=>phoneKey(u.phone)===phoneKey(o.phone)))return toast('Ese teléfono ya está asociado a una cuenta');
    const key=rutKey(o.rut),normalizedEmail=emailKey(o.email),history=d.bookings.flatMap(b=>(b.result?.players||[]).filter(p=>rutKey(typeof p==='string'?p:p.rut)===key).map(p=>({date:b.result.date||b.date,bookingId:b.id,result:typeof p==='string'?'draw':p.result,score:b.result.score,ratingChange:typeof p==='string'?0:Number(p.ratingChange??(p.result==='win'?.1:p.result==='loss'?-.05:0))}))),level=Math.max(0,Math.min(7,+(1+history.reduce((n,m)=>n+m.ratingChange,0)).toFixed(2))),u={id:uid(),...o,email:normalizedEmail,rut:key,level,matchesPlayed:history.length,reliability:Math.min(100,20+history.length*5),matchHistory:history,points:loyaltyFor(o.rut).points};d.users.push(u);recalculateAllRatings();d.bookings.filter(b=>!b.user&&(rutKey(b.ownerRut||b.rut)===key||emailKey(b.email)===normalizedEmail)).forEach(b=>{b.user=u.id;if(!b.rut)b.rut=key;b.ownerRut||=key;b.debtorRut||=key});if(d.ambassadors.some(a=>rutKey(a.rut)===key))u.ambassador=true;clearBookingPerks();DB.save();S.sess.user=u.id;saveSess();render();toast('Cuenta creada')}
  if(f.id==='flogin'){const u=d.users.find(u=>emailKey(u.email)===emailKey(o.email)&&u.pass===o.pass);if(!u)return toast('Correo o contraseña incorrectos');clearBookingPerks();S.sess.user=u.id;saveSess();render()}
  if(f.id==='fadmin'){if(o.email!==d.admin.email||o.pass!==d.admin.pass)return toast('Credenciales incorrectas');S.sess.admin=true;saveSess();render()}
  if(f.id==='fincentive'){const tiers=[1,2,3].map(i=>({matches:+o['threshold'+i],prize:o['prize'+i].trim()})).sort((a,b)=>a.matches-b.matches);if(tiers.some(t=>t.matches<1||!t.prize)||new Set(tiers.map(t=>t.matches)).size!==tiers.length)return toast('Usa metas positivas y distintas, con un premio en cada una');d.settings.monthlyIncentive=o.incentive;d.settings.monthlyTiers=tiers;DB.save();render();toast('Carrera y recompensas actualizadas')}
  if(f.id==='fcart'){d=DB.load();const items=[];let total=0;if(!validRut(o.rut))return toast('Ingresa un RUT chileno válido');
    for(const [pid,q] of Object.entries(S.cart)){const p=d.products.find(x=>x.id===pid);if(!p||p.stock<q)return toast('Stock insuficiente: '+(p?p.name:''));items.push({pid,name:p.name,cat:p.cat,qty:q,price:p.price});total+=p.price*q}
    const loyalty=loyaltyFor(o.rut),pointsUsed=o.usePoints==='on'?Math.min(loyalty.points,Math.floor(total/100)):0,pointsValue=pointsUsed*100,cashDue=total-pointsValue;
    if(o.usePoints==='on'&&pointsUsed===0)return toast(total<100?'Una compra menor a $100 se paga en dinero':'Ese RUT no tiene puntos disponibles');
    items.forEach(i=>d.products.find(p=>p.id===i.pid).stock-=i.qty);
    const sale={id:uid(),date:TODAY(),items,total,method:pointsUsed?(cashDue?`${pointsUsed} puntos + ${o.method}`:`${pointsUsed} puntos`):o.method,pointsUsed,rut:rutKey(o.rut)};d.sales.push(sale);
    if(pointsUsed){loyalty.points-=pointsUsed;loyalty.history.push({date:TODAY(),type:'redeem',amount:pointsUsed,saleId:sale.id})}
    if(cashDue>0){d.payments.push({id:uid(),rut:rutKey(o.rut),amount:cashDue,method:o.method,date:TODAY(),label:'Venta de productos',saleId:sale.id});earnPoints(o.rut,cashDue,sale.id)}
    syncUserPoints(o.rut);S.cart={};DB.save();render();toast('Venta registrada: '+money(total))}
});
/* Sincroniza pestañas del mismo navegador en vivo */
window.addEventListener('storage',e=>{if(e.key===DB.key&&!$('#modal').open){DB.load();render()}});

DB.load();render();
