import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.0/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const $=selector=>document.querySelector(selector), grid=$('#grid'), count=$('#count'), dialog=$('#dialog'), form=$('#form'), search=$('#search'), error=$('#error'), urlInput=$('#url'), gallery=$('#gallery'), preview=$('#urlPreview'), yearFilter=$('#yearFilter'), rarityFilter=$('#rarityFilter'), authDialog=$('#authDialog'), authForm=$('#authForm'), authMessage=$('#authMessage');
const configured=!SUPABASE_URL.includes('YOUR_PROJECT')&&!SUPABASE_PUBLISHABLE_KEY.includes('REPLACE_ME');
const supabase=configured?createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;
const safe=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const urls=()=>urlInput.value.split(/\r?\n/).map(url=>url.trim()).filter(Boolean);
const validUrl=url=>{try{return new URL(url).protocol==='https:';}catch{return false;}};
const validSource=source=>validUrl(source)||/^data:image\/(?:jpeg|png|webp);base64,/i.test(source);
let cards=[], session=null, editingId=null, draggedId=null, previewUrls=[], legacyCards=[];

try{const saved=JSON.parse(localStorage.getItem('posterdex-v1')||'[]');if(Array.isArray(saved))legacyCards=saved;}catch{}
localStorage.removeItem('posterdex-tmdb-token');

const compressImage=file=>new Promise((resolve,reject)=>{
  const objectUrl=URL.createObjectURL(file), image=new Image();
  image.onload=()=>{const scale=Math.min(1,600/image.width,900/image.height),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(objectUrl);canvas.toBlob(blob=>blob?resolve(blob):reject(new Error(`Could not prepare ${file.name}.`)),'image/webp',.8);};
  image.onerror=()=>{URL.revokeObjectURL(objectUrl);reject(new Error(`Could not read ${file.name}.`));};image.src=objectUrl;
});
const dataUrlToBlob=dataUrl=>{const [header,data]=dataUrl.split(','),type=header.match(/data:(.*?);/)[1],bytes=atob(data),array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);return new Blob([array],{type});};
const blobToDataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
const clearPreviewUrls=()=>{previewUrls.forEach(URL.revokeObjectURL);previewUrls=[];};

function refreshYears(){
  const selected=yearFilter.value, years=[...new Set(cards.map(card=>card.year).filter(Boolean))].sort((a,b)=>b-a);
  yearFilter.innerHTML='<option value="">All years</option>'+years.map(year=>`<option>${safe(year)}</option>`).join('');
  if(years.includes(selected))yearFilter.value=selected;
}
function render(){
  count.textContent=`${cards.length} CARD${cards.length===1?'':'S'}`;
  if(!session){grid.innerHTML='<div class="empty"><div><strong>Sign in to start collecting.</strong><span>Your binder is stored securely with your account.</span></div></div>';return;}
  const q=search.value.trim().toLowerCase(), shown=cards.filter(card=>(card.title+' '+card.year+' '+card.rarity).toLowerCase().includes(q)&&(!yearFilter.value||card.year===yearFilter.value)&&(!rarityFilter.value||card.rarity===rarityFilter.value));
  grid.innerHTML=shown.length?shown.map((card,i)=>`<article class="card tilt-${i%5}" data-card="${card.id}" draggable="true"><button class="remove" data-remove="${card.id}" aria-label="Remove ${safe(card.title)}">×</button><button class="edit" data-edit="${card.id}" aria-label="Edit ${safe(card.title)}">✎</button><div class="poster glare-hover"><img src="${safe(card.url)}" alt="${safe(card.title)} poster" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></div><div class="meta"><h2>${safe(card.title)}</h2><div class="row"><span>${safe(card.year)||'Year unknown'}</span><span class="rarity ${card.rarity.toLowerCase()}">${safe(card.rarity)}</span></div><div class="row"><span class="number">#${String(cards.indexOf(card)+1).padStart(3,'0')}</span></div></div></article>`).join(''):`<div class="empty"><div><strong>${cards.length?'No matching cards.':'Your binder is empty.'}</strong><span>${cards.length?'Try another filter.':'Hit “Add a poster” to make your first pull.'}</span></div></div>`;
}
function showSession(nextSession){
  session=nextSession;
  $('#userLabel').textContent=session?.user?.email||'';
  $('#authButton').hidden=Boolean(session);
  $('#logoutButton').hidden=!session;
  $('#importCards').disabled=!session;
  $('#exportCards').disabled=!session;
}
async function signedUrl(path){
  const {data,error}=await supabase.storage.from('poster-images').createSignedUrl(path,3600);
  if(error)throw error;return data.signedUrl;
}
async function loadCards(){
  if(!session){cards=[];refreshYears();render();return;}
  grid.innerHTML='<div class="empty"><div><strong>Opening your binder…</strong></div></div>';
  const {data,error}=await supabase.from('posters').select('id,title,release_year,rarity,image_url,image_path,sort_order').order('sort_order');
  if(error){cards=[];render();alert(error.message);return;}
  cards=await Promise.all(data.map(async row=>({id:row.id,title:row.title,year=row.release_year?String(row.release_year):'',rarity:row.rarity,imageUrl:row.image_url,imagePath:row.image_path,url:row.image_url||await signedUrl(row.image_path)})));
  if(!cards.length&&legacyCards.length){const migrated=[];for(const item of legacyCards.filter(item=>validSource(String(item?.url||''))&&typeof item.title==='string'))migrated.push(await sourceToCard(String(item.url).replace(/^http:/,'https:'),crypto.randomUUID(),{title:item.title.slice(0,60),year:/^\d{4}$/.test(String(item.year||''))?String(item.year):'',rarity:['Common','Rare','Legendary'].includes(item.rarity)?item.rarity:'Common'}));await persist(migrated);legacyCards=[];localStorage.removeItem('posterdex-v1');return;}
  if(legacyCards.length){legacyCards=[];localStorage.removeItem('posterdex-v1');}
  refreshYears();render();
}
async function persist(nextCards){
  if(!session)throw new Error('Log in before changing your collection.');
  const rows=nextCards.map((card,index)=>({id:card.id,user_id:session.user.id,title:card.title,release_year:card.year?Number(card.year):null,rarity:card.rarity,image_url:card.imagePath?null:card.url,image_path:card.imagePath||null,sort_order:index,updated_at:new Date().toISOString()}));
  if(rows.length){const {error}=await supabase.from('posters').upsert(rows);if(error)throw error;}
  const removed=cards.filter(card=>!nextCards.some(next=>next.id===card.id));
  if(removed.length){const {error}=await supabase.from('posters').delete().in('id',removed.map(card=>card.id));if(error)throw error;}
  const obsoletePaths=cards.map(card=>card.imagePath).filter(path=>path&&!nextCards.some(card=>card.imagePath===path));
  if(obsoletePaths.length)await supabase.storage.from('poster-images').remove(obsoletePaths);
  cards=nextCards;refreshYears();render();
}
async function uploadPoster(blob,id){
  const path=`${session.user.id}/${id}.webp`;
  const {error}=await supabase.storage.from('poster-images').upload(path,blob,{contentType:'image/webp',upsert:true});
  if(error)throw error;return {imagePath:path,url:await signedUrl(path)};
}
async function sourceToCard(source,id,details){
  if(typeof source==='string'&&validUrl(source))return {id,url:source,imageUrl:source,imagePath:null,...details};
  const blob=source instanceof Blob?source:dataUrlToBlob(source), uploaded=await uploadPoster(blob,id);
  return {id,imageUrl:null,...uploaded,...details};
}
async function initializeAuth(){
  if(!supabase){showSession(null);render();return;}
  const {data}=await supabase.auth.getSession();showSession(data.session);await loadCards();
  supabase.auth.onAuthStateChange((_event,nextSession)=>setTimeout(async()=>{showSession(nextSession);await loadCards();},0));
}

function showPreview(){clearPreviewUrls();previewUrls=[...gallery.files].map(URL.createObjectURL);preview.innerHTML=[...urls().filter(validUrl),...previewUrls].map(url=>`<img src="${safe(url)}" alt="Poster preview">`).join('');}
function openEditor(card){
  editingId=card?.id||null;form.reset();error.textContent='';clearPreviewUrls();preview.innerHTML='';
  $('#dialogTitle').textContent=card?'Edit card':'New pull';$('#savePoster').textContent=card?'Save changes':'Add to collection';
  if(card){if(!card.imagePath)urlInput.value=card.url;else preview.innerHTML=`<img src="${safe(card.url)}" alt="Poster preview">`;$('#title').value=card.title;$('#year').value=card.year;$('#rarity').value=card.rarity;if(!card.imagePath)showPreview();}
  dialog.showModal();urlInput.focus();
}
function openAuth(){authForm.reset();authMessage.textContent=configured?'':'Add your Supabase project URL and publishable key in config.js first.';authDialog.showModal();}

$('#openAdd').onclick=()=>session?openEditor():openAuth();
$('#authButton').onclick=openAuth;
$('#closeAuth').onclick=()=>authDialog.close();
authForm.onsubmit=async e=>{e.preventDefault();if(!supabase)return;authMessage.textContent='Logging in…';const {error}=await supabase.auth.signInWithPassword({email:$('#authEmail').value.trim(),password:$('#authPassword').value});if(error){authMessage.textContent=error.message;return;}authDialog.close();};
$('#signupButton').onclick=async()=>{if(!authForm.reportValidity()||!supabase)return;authMessage.textContent='Creating account…';const {data,error}=await supabase.auth.signUp({email:$('#authEmail').value.trim(),password:$('#authPassword').value,options:{emailRedirectTo:`${location.origin}/`}});authMessage.textContent=error?error.message:data.session?'Account created.':'Check your email to confirm your account.';if(data.session)authDialog.close();};
$('#logoutButton').onclick=async()=>{if(supabase)await supabase.auth.signOut();};
$('#cancel').onclick=()=>dialog.close();
urlInput.oninput=showPreview;gallery.onchange=showPreview;

form.onsubmit=async e=>{
  e.preventDefault();if(!session)return openAuth();
  const data=new FormData(form),year=data.get('year').trim(),links=urls(),files=[...gallery.files];
  if(year&&!/^\d{4}$/.test(year)){error.textContent='Year must be four digits.';return;}
  if(links.some(url=>!validUrl(url))){error.textContent='Every pasted line must be a valid HTTPS image URL.';return;}
  if(files.length>10||files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024)){error.textContent='Choose up to 10 JPEG, PNG, or WebP files under 15 MB each.';return;}
  error.textContent='Saving…';
  const details={title:data.get('title').trim(),year,rarity:data.get('rarity')},rawSources=[...links];
  try{rawSources.push(...await Promise.all(files.map(compressImage)));if(editingId&&!rawSources.length){const current=cards.find(card=>card.id===editingId);rawSources.push(current.imagePath?await supabase.storage.from('poster-images').download(current.imagePath).then(({data,error})=>{if(error)throw error;return data;}):current.url);}if(!rawSources.length)throw new Error('Paste a poster URL or choose an image from your gallery.');if(new Set(links).size!==links.length||links.some(url=>cards.some(card=>card.url===url&&card.id!==editingId)))throw new Error('One of those posters is already in your collection.');const created=[];for(let i=0;i<rawSources.length;i++)created.push(await sourceToCard(rawSources[i],i===0&&editingId?editingId:crypto.randomUUID(),details));let next;if(editingId){const index=cards.findIndex(card=>card.id===editingId);next=[...cards];next.splice(index,1,...created);}else next=[...created,...cards];await persist(next);clearPreviewUrls();dialog.close();}catch(err){error.textContent=err.message;}
};

grid.onclick=async e=>{
  const removeId=e.target.dataset.remove,editId=e.target.dataset.edit;
  if(removeId){try{await persist(cards.filter(card=>card.id!==removeId));}catch(err){alert(err.message);}}
  if(editId)openEditor(cards.find(card=>card.id===editId));
};
grid.addEventListener('error',e=>{if(e.target.matches('img'))e.target.parentElement.classList.add('broken');},true);
grid.ondragstart=e=>{const card=e.target.closest('[data-card]');if(!card)return;draggedId=card.dataset.card;card.classList.add('dragging');};
grid.ondragover=e=>e.preventDefault();
grid.ondrop=async e=>{e.preventDefault();const target=e.target.closest('[data-card]');if(!target||target.dataset.card===draggedId)return;const next=[...cards],from=next.findIndex(card=>card.id===draggedId),to=next.findIndex(card=>card.id===target.dataset.card);next.splice(to,0,next.splice(from,1)[0]);try{await persist(next);}catch(err){alert(err.message);}};
grid.ondragend=()=>{draggedId=null;render();};
search.oninput=yearFilter.onchange=rarityFilter.onchange=render;

$('#exportCards').onclick=async()=>{if(!session)return;const exported=[];for(const card of cards){let url=card.url;if(card.imagePath){const {data,error}=await supabase.storage.from('poster-images').download(card.imagePath);if(error)return alert(error.message);url=await blobToDataUrl(data);}exported.push({id:card.id,url,title:card.title,year:card.year,rarity:card.rarity});}const blob=new Blob([JSON.stringify({version:1,cards:exported},null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`posterdex-${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(link.href);};
$('#importCards').onclick=()=>session&&$('#importFile').click();
$('#importFile').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text()),incoming=Array.isArray(data)?data:data.cards;if(!Array.isArray(incoming)||incoming.some(card=>!validSource(card.url)||typeof card.title!=='string'))throw new Error('That is not a valid PosterDex backup.');const known=new Set(cards.filter(card=>!card.imagePath).map(card=>card.url)),created=[];for(const item of incoming.filter(item=>!validUrl(item.url)||(!known.has(item.url)&&known.add(item.url))))created.push(await sourceToCard(item.url,crypto.randomUUID(),{title:item.title.slice(0,60),year:/^\d{4}$/.test(String(item.year||''))?String(item.year):'',rarity:['Common','Rare','Legendary'].includes(item.rarity)?item.rarity:'Common'}));await persist([...cards,...created]);}catch(err){alert(err.message);}e.target.value='';};

refreshYears();render();await initializeAuth();
