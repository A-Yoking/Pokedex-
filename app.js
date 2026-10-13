const API='https://pokeapi.co/api/v2',ART=id=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const TC={normal:'#A8A77A',fire:'#EE8130',water:'#6390F0',electric:'#F7D02C',grass:'#7AC74C',ice:'#96D9D6',fighting:'#C22E28',poison:'#A33EA1',ground:'#E2BF65',flying:'#A98FF3',psychic:'#F95587',bug:'#A6B91A',rock:'#B6A136',ghost:'#735797',dragon:'#6F35FC',dark:'#705746',steel:'#B7B7CE',fairy:'#D685AD'};
const GENS=['I Kanto','II Johto','III Hoenn','IV Sinnoh','V Unova','VI Kalos','VII Alola','VIII Galar','IX Paldea'];
const VO=['red-blue','yellow','gold-silver','crystal','ruby-sapphire','emerald','firered-leafgreen','diamond-pearl','platinum','heartgold-soulsilver','black-white','black-2-white-2','x-y','omega-ruby-alpha-sapphire','sun-moon','ultra-sun-ultra-moon','lets-go-pikachu-lets-go-eevee','sword-shield','brilliant-diamond-shining-pearl','legends-arceus','scarlet-violet','champions'];
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=s=>s.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '),idOf=u=>+u.split('/').filter(Boolean).pop();
const chip=t=>`<span class="type" style="background:${TC[t]||'#888'}">${t}</span>`,cache={};
async function J(u){if(cache[u])return cache[u];const r=await fetch(u);if(!r.ok)throw new Error('Not found');return cache[u]=await r.json()}
let all=[],view='dex',shown=48,filtered=[],cmp=[],favs=[],tok=0,cur=null;
try{favs=JSON.parse(localStorage.getItem('favs')||'[]')}catch(e){}
const saveFavs=()=>{try{localStorage.setItem('favs',JSON.stringify(favs))}catch(e){}};

async function init(){
  $('#ft').innerHTML+=Object.keys(TC).map(t=>`<option value="${t}">${title(t)}</option>`).join('');
  $('#fg').innerHTML+=GENS.map((g,i)=>`<option value="${i+1}">Gen ${g}</option>`).join('');
  $('#app').innerHTML='<div class="empty">Loading Pokédex…</div>';
  try{all=(await J(`${API}/pokemon-species?limit=2000`)).results.map(r=>({id:idOf(r.url),name:r.name}));refresh()}
  catch(e){$('#app').innerHTML='<div class="empty err">Could not reach PokéAPI. Check your internet connection and reload.</div>'}
}
async function refresh(){
  const t=$('#ft').value,g=$('#fg').value,q=$('#q').value.trim().toLowerCase().replace(/\s+/g,'-');
  let ids=null;
  try{
    if(t)ids=new Set((await J(`${API}/type/${t}`)).pokemon.map(x=>idOf(x.pokemon.url)));
    if(g){const s=new Set((await J(`${API}/generation/${g}`)).pokemon_species.map(x=>idOf(x.url)));ids=ids?new Set([...ids].filter(x=>s.has(x))):s}
  }catch(e){}
  filtered=all.filter(p=>(!ids||ids.has(p.id))&&(!q||p.name.includes(q)||String(p.id)===q)&&(view!=='fav'||favs.includes(p.id)));
  shown=48;draw();
}
function draw(){
  $('#filters').style.display=view==='cmp'?'none':'flex';
  if(view==='cmp')return drawCmp();
  $('#count').textContent=`${filtered.length} Pokémon`;
  if(!filtered.length)return $('#app').innerHTML=`<div class="empty">${view==='fav'?'No favorites yet — open a Pokémon and tap ☆.':'No Pokémon match.'}</div>`;
  $('#app').innerHTML=`<div class="grid">${filtered.slice(0,shown).map(p=>`<button class="card" data-id="${p.id}"><img loading="lazy" src="${ART(p.id)}" alt=""><small>#${String(p.id).padStart(4,'0')}</small><div>${esc(p.name.replace(/-/g,' '))}</div></button>`).join('')}</div>${shown<filtered.length?'<p style="text-align:center"><button class="btn pri" id="more">Load more</button></p>':''}`;
}
$('#app').addEventListener('click',e=>{
  if(e.target.id==='more'){shown+=48;return draw()}
  const c=e.target.closest('.card');if(c)openDetail(c.dataset.id);
  const x=e.target.closest('[data-rm]');if(x){cmp.splice(+x.dataset.rm,1);drawCmp()}
  if(e.target.id==='cadd'){const v=$('#cin').value.trim().toLowerCase();$('#cin').value='';addCmp(v)}
});
let deb;$('#q').addEventListener('input',()=>{clearTimeout(deb);deb=setTimeout(()=>{if(view==='cmp')setView('dex');else refresh()},250)});
$('#ft').onchange=$('#fg').onchange=refresh;
document.querySelectorAll('header [data-v]').forEach(b=>b.onclick=()=>setView(b.dataset.v));
function setView(v){view=v;document.querySelectorAll('header [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v));v==='cmp'?draw():refresh()}

/* ---- Detail ---- */
const calc=(b,iv,ev,hp)=>Math.floor((2*b+iv+Math.floor(ev/4))/2)+(hp?60:5);
async function openDetail(id){
  const t=++tok;$('#modal').style.display='block';document.body.style.overflow='hidden';
  $('#detail').innerHTML='<div class="empty">Loading…</div>';
  try{
    const p=await J(`${API}/pokemon/${id}`);
    const [sp,types,abs,enc]=await Promise.all([J(p.species.url),Promise.all(p.types.map(x=>J(x.type.url))),Promise.all(p.abilities.map(a=>J(a.ability.url))),J(`${API}/pokemon/${p.id}/encounters`).catch(()=>[])]);
    const chain=await J(sp.evolution_chain.url);
    if(t!==tok)return;cur={p,shiny:false};render(p,sp,types,abs,enc,chain);
  }catch(e){if(t===tok)$('#detail').innerHTML='<div class="empty err">Could not load this Pokémon.</div>'}
}
function evo(n){const d=n.evolution_details[0],id=idOf(n.species.url);
  const how=d?(d.min_level?`Lv ${d.min_level}`:d.item?title(d.item.name):d.trigger.name==='trade'?'Trade':d.min_happiness?'Friendship':d.trigger.name!=='level-up'?title(d.trigger.name):'Special'):'';
  return `<div class="evo">${how?`<span class="how">→ ${how}</span>`:''}<button class="evc" data-open="${id}"><img loading="lazy" src="${ART(id)}" alt=""><br>${esc(n.species.name)}</button><div class="kids">${n.evolves_to.map(evo).join('')}</div></div>`}
function render(p,sp,types,abs,enc,chain){
  const en=a=>a.find(x=>x.language.name==='en'),bst=p.stats.reduce((a,s)=>a+s.base_stat,0);
  const flav=[...sp.flavor_text_entries].reverse().find(x=>x.language.name==='en'),genus=en(sp.genera)?.genus||'';
  const m=Object.fromEntries(Object.keys(TC).map(t=>[t,1]));
  types.forEach(d=>{const r=d.damage_relations;r.double_damage_from.forEach(x=>m[x.name]*=2);r.half_damage_from.forEach(x=>m[x.name]*=.5);r.no_damage_from.forEach(x=>m[x.name]*=0)});
  const bg=(f,c)=>{const a=Object.entries(m).filter(([,v])=>f(v)).sort((a,b)=>b[1]-a[1]);return a.length?a.map(([t,v])=>`<span class="badge ${c}">${t} ×${v}</span>`).join(''):'None'};
  const locs=[...new Set(enc.map(e=>e.location_area.name))].slice(0,14);
  const vars=sp.varieties.length>1?sp.varieties.map(v=>`<button class="btn ${v.pokemon.name===p.name?'on':''}" data-open="${v.pokemon.name}">${esc(title(v.pokemon.name))}</button>`).join(' '):'';
  const vs=[...new Set(p.moves.flatMap(x=>x.version_group_details.map(d=>d.version_group.name)))].sort((a,b)=>VO.indexOf(b)-VO.indexOf(a));
  const fav=favs.includes(sp.id);
  $('#detail').innerHTML=`
  <div class="top"><div><img id="art" src="${ART(p.id)}" onerror="this.src='${p.sprites.front_default||''}'" alt="${esc(p.name)}"><div style="text-align:center"><button class="btn" id="shiny">✨ Shiny</button> <button class="btn" id="cry">🔊 Cry</button></div></div>
  <div><div class="muted">#${String(sp.id).padStart(4,'0')} · ${esc(genus)}</div><h1 class="name">${esc(p.name.replace(/-/g,' '))}</h1>
  <div>${p.types.map(t=>chip(t.type.name)).join('')}</div>
  <p>${esc((flav?.flavor_text||'').replace(/[\n\f]/g,' '))}</p>
  <p class="note">Height ${p.height/10} m · Weight ${p.weight/10} kg · Base XP ${p.base_experience??'—'} · Capture rate ${sp.capture_rate} · Habitat ${esc(sp.habitat?.name||'—')}${sp.is_legendary?' · Legendary':''}${sp.is_mythical?' · Mythical':''}</p>
  <button class="btn" id="fav">${fav?'★ Favorited':'☆ Favorite'}</button> <button class="btn" id="tocmp">⚖ Compare</button></div></div>
  ${vars?`<p>${vars}</p>`:''}
  <div class="two"><div class="panel"><h2>Base stats <span class="hi">BST ${bst}</span></h2>${p.stats.map(s=>`<div class="sr"><span>${esc(title(s.stat.name))}</span><b>${s.base_stat}</b><div class="tr"><div class="fl" style="width:${Math.min(100,s.base_stat/2.55)}%"></div></div></div>`).join('')}</div>
  <div class="panel"><h2>Abilities</h2>${abs.map((a,i)=>{const e=en(a.effect_entries)?.short_effect||en(a.flavor_text_entries)?.flavor_text||'';return `<p><b>${esc(title(a.name))}</b>${p.abilities[i].is_hidden?' <span class="muted">(hidden)</span>':''}<br><span class="note">${esc(e)}</span></p>`}).join('')}</div></div>
  <div class="panel"><h2>Type effectiveness (defending)</h2><p><b>Weak to:</b> ${bg(v=>v>1,'w')}</p><p><b>Resists:</b> ${bg(v=>v>0&&v<1,'r')}</p><p><b>Immune:</b> ${bg(v=>v===0,'')}</p></div>
  <div class="panel"><h2>Evolution chain</h2><div class="evos">${evo(chain.chain)}</div></div>
  <div class="panel"><h2>Level 50 stat estimator</h2><p class="note">Neutral nature. IV 0–31, EV 0–252.</p><div class="ivg">${p.stats.map(s=>`<label>${esc(title(s.stat.name))} IV<input class="iv" data-s="${s.stat.name}" data-b="${s.base_stat}" type="number" min="0" max="31" value="31"></label><label>EV<input class="ev" data-s="${s.stat.name}" type="number" min="0" max="252" value="0"></label>`).join('')}</div><p id="ivout"></p></div>
  <div class="panel"><h2>Wild locations</h2>${locs.length?locs.map(l=>`<span class="badge">${esc(title(l))}</span>`).join(''):'<span class="note">No wild encounters recorded.</span>'}</div>
  <div class="panel"><h2>Moves</h2><div class="bar"><select id="ver">${vs.map(v=>`<option value="${v}">${esc(title(v))}</option>`).join('')}</select><input id="mq" placeholder="Filter moves"><select id="mm"><option value="">All methods</option><option value="level-up">Level up</option><option value="machine">TM</option><option value="tutor">Tutor</option><option value="egg">Egg</option><option value="train">Train</option></select></div>
  <div class="scroll"><table><thead><tr><th>Move</th><th>Type</th><th>Class</th><th>Pow</th><th>Acc</th><th>PP</th><th>Learned</th></tr></thead><tbody id="mrows"></tbody></table></div></div>`;
  $('#shiny').onclick=()=>{cur.shiny=!cur.shiny;const o=p.sprites.other['official-artwork'];$('#art').src=(cur.shiny?o.front_shiny:o.front_default)||ART(p.id)};
  $('#cry').onclick=()=>{const u=p.cries?.latest;if(u)new Audio(u).play().catch(()=>{})};
  $('#fav').onclick=()=>{const i=favs.indexOf(sp.id);i<0?favs.push(sp.id):favs.splice(i,1);saveFavs();$('#fav').textContent=i<0?'★ Favorited':'☆ Favorite'};
  $('#tocmp').onclick=()=>{if(!cmp.includes(p.name))cmp.push(p.name);if(cmp.length>2)cmp.shift();closeModal();setView('cmp')};
  document.querySelectorAll('.iv,.ev').forEach(i=>i.oninput=iv);iv();
  $('#ver').onchange=loadMoves;$('#mq').oninput=$('#mm').onchange=()=>drawMoves(p);cur.p=p;loadMoves();
}
function iv(){const c=(v,x)=>Math.max(0,Math.min(x,parseInt(v)||0));
  $('#ivout').innerHTML=[...document.querySelectorAll('.iv')].map(i=>{const e=document.querySelector(`.ev[data-s="${i.dataset.s}"]`);return `${esc(title(i.dataset.s))} <b class="hi">${calc(+i.dataset.b,c(i.value,31),c(e.value,252),i.dataset.s==='hp')}</b>`}).join(' · ')}
async function loadMoves(){
  const p=cur.p,vg=$('#ver').value,t=tok,list=p.moves.filter(m=>m.version_group_details.some(d=>d.version_group.name===vg));
  $('#mrows').innerHTML=`<tr><td colspan="7" class="note">Loading ${list.length} moves…</td></tr>`;
  for(let i=0;i<list.length;i+=15){await Promise.all(list.slice(i,i+15).map(m=>J(m.move.url).catch(()=>0)));if(t!==tok||$('#ver')?.value!==vg)return}
  drawMoves(p);
}
function drawMoves(p){
  if(!$('#mrows'))return;const vg=$('#ver').value,q=$('#mq').value.trim().toLowerCase().replace(/\s+/g,'-'),me=$('#mm').value,rows=[];
  p.moves.forEach(m=>{const ds=m.version_group_details.filter(d=>d.version_group.name===vg&&(!me||d.move_learn_method.name===me));if(!ds.length||(q&&!m.move.name.includes(q)))return;
    const d=ds.find(x=>x.move_learn_method.name==='level-up')||ds[0],k=d.move_learn_method.name;
    rows.push({n:m.move.name,mv:cache[m.move.url],l:k==='level-up'?`Level ${d.level_learned_at}`:k==='machine'?'TM':title(k),s:k==='level-up'?d.level_learned_at:999})});
  rows.sort((a,b)=>a.s-b.s||a.n.localeCompare(b.n));
  $('#mrows').innerHTML=rows.length?rows.map(r=>{const v=r.mv;return `<tr><td>${esc(r.n.replace(/-/g,' '))}</td><td>${v?chip(v.type.name):'—'}</td><td>${v?title(v.damage_class.name):'—'}</td><td>${v?.power??'—'}</td><td>${v?.accuracy??'—'}</td><td>${v?.pp??'—'}</td><td>${r.l}</td></tr>`}).join(''):'<tr><td colspan="7" class="note">No moves match.</td></tr>';
}
$('#detail').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)openDetail(b.dataset.open)});
function closeModal(){tok++;$('#modal').style.display='none';document.body.style.overflow=''}
$('#close').onclick=closeModal;$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

/* ---- Compare ---- */
async function addCmp(q){if(!q)return;try{const p=await J(`${API}/pokemon/${encodeURIComponent(q)}`);if(!cmp.includes(p.name))cmp.push(p.name);if(cmp.length>2)cmp.shift();drawCmp()}catch(e){drawCmp(`No Pokémon found for "${esc(q)}".`)}}
async function drawCmp(msg=''){
  const head=`<div class="panel"><h2>Compare Pokémon</h2><div class="bar"><input id="cin" placeholder="Add by name or number"><button class="btn pri" id="cadd">Add</button></div><p class="err note">${msg}</p>`;
  if(!cmp.length)return $('#app').innerHTML=head+'<div class="empty">Add up to two Pokémon to compare.</div></div>';
  const ps=await Promise.all(cmp.map(n=>J(`${API}/pokemon/${n}`)));
  const names=['hp','attack','defense','special-attack','special-defense','speed'],val=(p,n)=>p.stats.find(s=>s.stat.name===n).base_stat;
  $('#app').innerHTML=head+`<div class="two">${ps.map((p,i)=>{const bst=p.stats.reduce((a,s)=>a+s.base_stat,0);return `<div class="panel" style="text-align:center"><b style="text-transform:capitalize;font-size:20px">${esc(p.name.replace(/-/g,' '))}</b> <button class="btn" data-rm="${i}">Remove</button><br><img src="${ART(p.id)}" width="130" height="130" alt=""><br>${p.types.map(t=>chip(t.type.name)).join('')}<div style="text-align:left;margin-top:8px">${names.map(n=>{const v=val(p,n),w=ps.length>1&&v>val(ps[1-i],n);return `<div class="sr"><span>${esc(title(n))}</span><b class="${w?'hi':''}">${v}</b><div class="tr"><div class="fl" style="width:${v/2.55}%"></div></div></div>`}).join('')}</div><b class="${ps.length>1&&bst>ps[1-i].stats.reduce((a,s)=>a+s.base_stat,0)?'hi':''}">BST ${bst}</b></div>`}).join('')}</div></div>`;
}
init();
