import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.0/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { cardQuantity, cardsInFolder, extraFolder, folderColor, moveCard, posterCount, posterTitle } from './folder-state.mjs';

const $=selector=>document.querySelector(selector), grid=$('#grid'), count=$('#count'), dialog=$('#dialog'), form=$('#form'), search=$('#search'), error=$('#error'), urlInput=$('#url'), gallery=$('#gallery'), preview=$('#urlPreview'), folderSelect=$('#folder'), yearFilter=$('#yearFilter'), rarityFilter=$('#rarityFilter'), authDialog=$('#authDialog'), authForm=$('#authForm'), authMessage=$('#authMessage'), folderDialog=$('#folderDialog'), folderForm=$('#folderForm'), shareDialog=$('#shareDialog'), shareMessage=$('#shareMessage');
const configured=!SUPABASE_URL.includes('YOUR_PROJECT')&&!SUPABASE_PUBLISHABLE_KEY.includes('REPLACE_ME');
const supabase=configured?createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;
const safe=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const urls=()=>urlInput.value.split(/\r?\n/).map(url=>url.trim()).filter(Boolean);
const validUrl=url=>{try{return new URL(url).protocol==='https:';}catch{return false;}};
const validSource=source=>validUrl(source)||/^data:image\/(?:jpeg|png|webp);base64,/i.test(source);
const publicShareToken=new URLSearchParams(location.search).get('share'), sharedView=Boolean(publicShareToken);
let cards=[], folders=[], session=null, editingId=null, draggedId=null, activeFolderId=null, currentShareToken=null, previewUrls=[], legacyCards=[];

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
  const total=posterCount(cards);count.textContent=`${total} POSTER${total===1?'':'S'} · ${folders.length} FOLDER${folders.length===1?'':'S'}`;
  if(!session&&!sharedView){$('#folderNav').hidden=true;grid.innerHTML='<div class="empty"><div><strong>Sign in to start collecting.</strong><span>Your binder is stored securely with your account.</span></div></div>';return;}
  const activeFolder=folders.find(folder=>folder.id===activeFolderId);if(activeFolderId&&!activeFolder)activeFolderId=null;
  $('#folderNav').hidden=!activeFolderId;$('#folderName').textContent=activeFolder?.name||'';
  const q=search.value.trim().toLowerCase(), folderCardsList=cardsInFolder(cards,activeFolderId), shown=folderCardsList.filter(card=>(card.title+' '+card.year+' '+card.rarity).toLowerCase().includes(q)&&(!yearFilter.value||card.year===yearFilter.value)&&(!rarityFilter.value||card.rarity===rarityFilter.value));
  const folderCards=activeFolderId?'':folders.filter(folder=>folder.name.toLowerCase().includes(q)).map(folder=>`<article class="folder-card folder-color-${folderColor(folders.indexOf(folder))}" data-folder="${folder.id}" tabindex="0">${sharedView?'':`<button class="remove-folder" data-remove-folder="${folder.id}" aria-label="Delete ${safe(folder.name)}">×</button>`}<div class="folder-icon" aria-hidden="true">▰</div><div><h2>${safe(folder.name)}</h2><p>${folder.year?`${safe(folder.year)} · `:''}${posterCount(cardsInFolder(cards,folder.id))} posters${sharedView?'':' · drop cards here'}</p></div></article>`).join('');
  const posterCards=shown.map((card,i)=>`<article class="card tilt-${i%5}" data-card="${card.id}"${sharedView?'':' draggable="true"'}>${sharedView?'':`<button class="remove" data-remove="${card.id}" aria-label="Remove ${safe(card.title||'poster')}">×</button><button class="edit" data-edit="${card.id}" aria-label="Edit ${safe(card.title||'poster')}">✎</button>`}<div class="poster glare-hover"><img src="${safe(card.url)}" alt="${safe(card.title||'Movie')} poster" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></div><div class="meta"><h2>${safe(card.title)||'Untitled poster'}</h2><div class="row"><span>${safe(card.year)||'Year unknown'}</span><span class="rarity ${card.rarity.toLowerCase()}">${safe(card.rarity)}</span></div><div class="row"><span class="number">#${String(cards.indexOf(card)+1).padStart(3,'0')}</span>${cardQuantity(card.quantity)>1?`<span class="quantity">×${cardQuantity(card.quantity)}</span>`:''}</div></div></article>`).join('');
  grid.innerHTML=folderCards+posterCards||`<div class="empty"><div><strong>${folderCardsList.length?'No matching cards.':activeFolderId?'This folder is empty.':'Your binder is empty.'}</strong><span>${folderCardsList.length?'Try another filter.':sharedView?'There are no posters here yet.':'Hit “Add a poster” to make your first pull.'}</span></div></div>`;
}
function showSession(nextSession){
  session=nextSession;
  $('#authButton').hidden=Boolean(session);
  $('#logoutButton').hidden=!session;
  $('#shareCollection').hidden=!session;
  $('#openAdd').hidden=!session;
  $('#openFolder').hidden=!session;
  $('#collectionToolbar').hidden=!session;
  $('#importCards').disabled=!session;
  $('#exportCards').disabled=!session;
}
async function signedUrl(path){
  const {data,error}=await supabase.storage.from('poster-images').createSignedUrl(path,3600);
  if(error)throw error;return data.signedUrl;
}
async function loadCards(){
  if(!session){cards=[];folders=[];activeFolderId=null;refreshYears();render();return;}
  grid.innerHTML='<div class="empty"><div><strong>Opening your binder…</strong></div></div>';
  const [{data:folderRows,error:folderError},{data,error}]=await Promise.all([supabase.from('folders').select('id,name,release_year,auto_name,sort_order').order('sort_order'),supabase.from('posters').select('id,folder_id,title,release_year,rarity,quantity,image_url,image_path,sort_order').order('sort_order')]);
  if(error||folderError){cards=[];folders=[];render();alert((error||folderError).message);return;}
  folders=folderRows.map(row=>({id:row.id,name:row.name,year:row.release_year?String(row.release_year):'',autoName:row.auto_name,sort_order:row.sort_order}));cards=await Promise.all(data.map(async row=>({id:row.id,folderId:row.folder_id,title:row.title,year:row.release_year?String(row.release_year):'',rarity:row.rarity,quantity:row.quantity,imageUrl:row.image_url,imagePath:row.image_path,url:row.image_url||await signedUrl(row.image_path)})));
  if(!cards.length&&legacyCards.length){const migrated=[];for(const item of legacyCards.filter(item=>validSource(String(item?.url||''))&&typeof item.title==='string'))migrated.push(await sourceToCard(String(item.url).replace(/^http:/,'https:'),crypto.randomUUID(),{folderId:null,title:item.title.slice(0,60),year:/^\d{4}$/.test(String(item.year||''))?String(item.year):'',rarity:['Common','Rare','Legendary'].includes(item.rarity)?item.rarity:'Common'}));await persist(migrated);legacyCards=[];localStorage.removeItem('posterdex-v1');return;}
  if(legacyCards.length){legacyCards=[];localStorage.removeItem('posterdex-v1');}
  refreshYears();render();
}
async function loadShared(){
  $('#authButton').hidden=$('#logoutButton').hidden=$('#shareCollection').hidden=$('#openFolder').hidden=$('#openAdd').hidden=true;
  $('#collectionToolbar').hidden=false;$('#importCards').hidden=$('#exportCards').hidden=true;
  document.title='Shared PosterDex Collection';$('.brand p').textContent='A view-only PosterDex collection. Open a folder and browse the pulls.';$('footer span').textContent='SHARED COLLECTION · VIEW ONLY';
  grid.innerHTML='<div class="empty"><div><strong>Opening shared binder…</strong></div></div>';
  try{const response=await fetch(`/api/shared-collection?token=${encodeURIComponent(publicShareToken)}`),data=await response.json();if(!response.ok)throw new Error(data.error||'Could not open this collection.');folders=data.folders;cards=data.cards;refreshYears();render();}catch(err){folders=[];cards=[];count.textContent='0 CARDS';grid.innerHTML=`<div class="empty"><div><strong>Share unavailable.</strong><span>${safe(err.message)}</span></div></div>`;}
}
async function persist(nextCards){
  if(!session)throw new Error('Log in before changing your collection.');
  const rows=nextCards.map((card,index)=>({id:card.id,user_id:session.user.id,folder_id:card.folderId||null,title:card.title,release_year:card.year?Number(card.year):null,rarity:card.rarity,quantity:cardQuantity(card.quantity),image_url:card.imagePath?null:card.url,image_path:card.imagePath||null,sort_order:index,updated_at:new Date().toISOString()}));
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
function syncTitleRequirement(){const optional=Boolean(folderSelect.value);$('#title').required=!optional;$('#titleLabel').textContent=optional?'Movie title (optional)':'Movie title';$('#title').placeholder=optional?'Leave blank if you want':'Enter the title';}
function openEditor(card){
  editingId=card?.id||null;form.reset();error.textContent='';clearPreviewUrls();preview.innerHTML='';
  folderSelect.innerHTML='<option value="">No folder</option>'+folders.map(folder=>`<option value="${folder.id}">${safe(folder.name)}</option>`).join('');folderSelect.value=card?.folderId||activeFolderId||'';syncTitleRequirement();
  $('#dialogTitle').textContent=card?'Edit card':'New pull';$('#savePoster').textContent=card?'Save changes':'Add to collection';
  if(card){if(!card.imagePath)urlInput.value=card.url;else preview.innerHTML=`<img src="${safe(card.url)}" alt="Poster preview">`;$('#title').value=card.title;$('#year').value=card.year;$('#rarity').value=card.rarity;$('#quantity').value=cardQuantity(card.quantity);if(!card.imagePath)showPreview();}
  dialog.showModal();urlInput.focus();
}
function openAuth(){authForm.reset();authMessage.textContent=configured?'':'Add your Supabase project URL and publishable key in config.js first.';authDialog.showModal();}
async function createFolder(name,year='',autoName=false){
  const folder={id:crypto.randomUUID(),user_id:session.user.id,name,release_year:year?Number(year):null,auto_name:autoName,sort_order:folders.length};const {error}=await supabase.from('folders').insert(folder);if(error)throw error;
  const created={id:folder.id,name,year,autoName,sort_order:folder.sort_order};folders.push(created);return created;
}
async function openShare(){
  shareMessage.textContent='Preparing link…';$('#shareUrl').value='';shareDialog.showModal();
  const {data,error}=await supabase.from('share_links').select('token').maybeSingle();if(error){shareMessage.textContent=error.message;return;}
  let link=data;if(!link){const result=await supabase.from('share_links').insert({user_id:session.user.id}).select('token').single();if(result.error){shareMessage.textContent=result.error.message;return;}link=result.data;}
  currentShareToken=link.token;$('#shareUrl').value=`${location.origin}${location.pathname}?share=${link.token}`;shareMessage.textContent='Anyone with this link can view your collection.';
}

$('#openAdd').onclick=()=>session?openEditor():openAuth();
$('#openFolder').onclick=()=>{folderForm.reset();$('#folderError').textContent='';folderDialog.showModal();$('#newFolderName').focus();};
$('#shareCollection').onclick=openShare;
$('#authButton').onclick=openAuth;
$('#closeAuth').onclick=()=>authDialog.close();
authForm.onsubmit=async e=>{e.preventDefault();if(!supabase)return;authMessage.textContent='Logging in…';const {error}=await supabase.auth.signInWithPassword({email:$('#authEmail').value.trim(),password:$('#authPassword').value});if(error){authMessage.textContent=error.message;return;}authDialog.close();};
$('#signupButton').onclick=async()=>{if(!authForm.reportValidity()||!supabase)return;authMessage.textContent='Creating account…';const {data,error}=await supabase.auth.signUp({email:$('#authEmail').value.trim(),password:$('#authPassword').value,options:{emailRedirectTo:`${location.origin}/`}});authMessage.textContent=error?error.message:data.session?'Account created.':'Check your email to confirm your account.';if(data.session)authDialog.close();};
$('#logoutButton').onclick=async()=>{if(supabase)await supabase.auth.signOut();};
$('#cancel').onclick=()=>dialog.close();
$('#cancelFolder').onclick=()=>folderDialog.close();
$('#closeShare').onclick=()=>shareDialog.close();
$('#copyShare').onclick=async()=>{const link=$('#shareUrl').value;if(!link)return;try{await navigator.clipboard.writeText(link);shareMessage.textContent='Link copied.';}catch{$('#shareUrl').select();shareMessage.textContent='Select the link and copy it.';}};
$('#disableShare').onclick=async()=>{if(!currentShareToken||!confirm('Disable this public link?'))return;const {error}=await supabase.from('share_links').delete().eq('token',currentShareToken);if(error){shareMessage.textContent=error.message;return;}currentShareToken=null;$('#shareUrl').value='';shareMessage.textContent='Sharing disabled.';};
$('#shareForm').onsubmit=e=>e.preventDefault();
$('#folderBack').onclick=()=>{activeFolderId=null;search.value='';render();};
folderSelect.onchange=syncTitleRequirement;
urlInput.oninput=showPreview;gallery.onchange=showPreview;

folderForm.onsubmit=async e=>{
  e.preventDefault();const name=$('#newFolderName').value.trim(),year=$('#newFolderYear').value.trim();if(!name)return;if(year&&(!/^\d{4}$/.test(year)||Number(year)<1888||Number(year)>2200)){$('#folderError').textContent='Enter a year from 1888 to 2200.';return;}
  $('#folderError').textContent='Creating…';try{await createFolder(name,year,$('#autoNameFolder').checked);folderDialog.close();render();}catch(err){$('#folderError').textContent=err.message;}
};

form.onsubmit=async e=>{
  e.preventDefault();if(!session)return openAuth();
  const data=new FormData(form),quantity=cardQuantity(data.get('quantity'));let folderId=data.get('folder')||null,folder=folders.find(item=>item.id===folderId);const title=posterTitle(data.get('title'),folder),year=data.get('year').trim(),links=urls(),files=[...gallery.files];
  if(!folderId&&!title){error.textContent='Add a movie title or choose a folder.';return;}
  if(year&&!/^\d{4}$/.test(year)){error.textContent='Year must be four digits.';return;}
  if(links.some(url=>!validUrl(url))){error.textContent='Every pasted line must be a valid HTTPS image URL.';return;}
  if(files.length>10||files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024)){error.textContent='Choose up to 10 JPEG, PNG, or WebP files under 15 MB each.';return;}
  error.textContent='Saving…';
  const rawSources=[...links];
  try{let extras=extraFolder(folders);if(quantity>1&&!extras&&confirm('This poster has extras. Create an “Extra” folder?'))extras=await createFolder('Extra');if(quantity>1&&extras){folderId=extras.id;folder=extras;}const details={folderId,title,year,rarity:data.get('rarity'),quantity};rawSources.push(...await Promise.all(files.map(compressImage)));if(editingId&&!rawSources.length){const current=cards.find(card=>card.id===editingId);rawSources.push(current.imagePath?await supabase.storage.from('poster-images').download(current.imagePath).then(({data,error})=>{if(error)throw error;return data;}):current.url);}if(!rawSources.length)throw new Error('Paste a poster URL or choose an image from your gallery.');if(new Set(links).size!==links.length||links.some(url=>cards.some(card=>card.url===url&&card.id!==editingId)))throw new Error('One of those posters is already in your collection.');const created=[];for(let i=0;i<rawSources.length;i++)created.push(await sourceToCard(rawSources[i],i===0&&editingId?editingId:crypto.randomUUID(),details));let next;if(editingId){const index=cards.findIndex(card=>card.id===editingId);next=[...cards];next.splice(index,1,...created);}else next=[...created,...cards];await persist(next);clearPreviewUrls();dialog.close();}catch(err){error.textContent=err.message;}
};

grid.onclick=async e=>{
  const removeFolderId=e.target.dataset.removeFolder,folderId=e.target.closest('[data-folder]')?.dataset.folder,removeId=e.target.dataset.remove,editId=e.target.dataset.edit;
  if(removeFolderId){if(!confirm('Delete this folder? Its posters will move back to All posters.'))return;try{await persist(cards.map(card=>card.folderId===removeFolderId?{...card,folderId:null,title:card.title||'Untitled poster'}:card));const {error}=await supabase.from('folders').delete().eq('id',removeFolderId);if(error)throw error;if(activeFolderId===removeFolderId)activeFolderId=null;await loadCards();}catch(err){alert(err.message);}return;}
  if(folderId){activeFolderId=folderId;search.value='';render();return;}
  if(removeId){try{await persist(cards.filter(card=>card.id!==removeId));}catch(err){alert(err.message);}}
  if(editId)openEditor(cards.find(card=>card.id===editId));
};
grid.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-folder]')){e.preventDefault();activeFolderId=e.target.dataset.folder;search.value='';render();}};
grid.addEventListener('error',e=>{if(e.target.matches('img'))e.target.parentElement.classList.add('broken');},true);
grid.ondragstart=e=>{if(sharedView)return e.preventDefault();const card=e.target.closest('[data-card]');if(!card)return;draggedId=card.dataset.card;card.classList.add('dragging');};
grid.ondragover=e=>{e.preventDefault();grid.querySelectorAll('.drop-target').forEach(item=>item.classList.remove('drop-target'));e.target.closest('[data-folder]')?.classList.add('drop-target');};
grid.ondragleave=e=>{if(!grid.contains(e.relatedTarget))grid.querySelectorAll('.drop-target').forEach(item=>item.classList.remove('drop-target'));};
grid.ondrop=async e=>{e.preventDefault();grid.querySelectorAll('.drop-target').forEach(item=>item.classList.remove('drop-target'));const folder=e.target.closest('[data-folder]');if(folder&&draggedId){try{await persist(moveCard(cards,draggedId,folders.find(item=>item.id===folder.dataset.folder)));}catch(err){alert(err.message);}return;}const target=e.target.closest('[data-card]');if(!target||target.dataset.card===draggedId)return;const next=[...cards],from=next.findIndex(card=>card.id===draggedId),to=next.findIndex(card=>card.id===target.dataset.card);next.splice(to,0,next.splice(from,1)[0]);try{await persist(next);}catch(err){alert(err.message);}};
grid.ondragend=()=>{draggedId=null;render();};
search.oninput=yearFilter.onchange=rarityFilter.onchange=render;

$('#exportCards').onclick=async()=>{if(!session)return;const exported=[];for(const card of cards){let url=card.url;if(card.imagePath){const {data,error}=await supabase.storage.from('poster-images').download(card.imagePath);if(error)return alert(error.message);url=await blobToDataUrl(data);}exported.push({id:card.id,folderId:card.folderId||null,url,title:card.title,year:card.year,rarity:card.rarity,quantity:cardQuantity(card.quantity)});}const blob=new Blob([JSON.stringify({version:3,folders:folders.map(({id,name,year,autoName,sort_order})=>({id,name,year,autoName,sortOrder:sort_order})),cards:exported},null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`posterdex-${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(link.href);};
$('#importCards').onclick=()=>session&&$('#importFile').click();
$('#importFile').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text()),incoming=Array.isArray(data)?data:data.cards,incomingFolders=Array.isArray(data.folders)?data.folders:[];if(!Array.isArray(incoming)||incoming.some(card=>!validSource(card.url)||typeof card.title!=='string'||(card.quantity!=null&&cardQuantity(card.quantity)!==Number(card.quantity)))||incomingFolders.some(folder=>typeof folder.name!=='string'||!folder.name.trim()||folder.name.length>40||(folder.year&&(!/^\d{4}$/.test(String(folder.year))||Number(folder.year)<1888||Number(folder.year)>2200))))throw new Error('That is not a valid PosterDex backup.');const folderMap=new Map();if(!activeFolderId)for(const item of incomingFolders){let folder=folders.find(existing=>existing.name.toLowerCase()===item.name.trim().toLowerCase());if(!folder){folder=await createFolder(item.name.trim(),item.year?String(item.year):'',Boolean(item.autoName));}folderMap.set(item.id,folder.id);}let extras=extraFolder(folders);if(incoming.some(item=>cardQuantity(item.quantity)>1)&&!extras&&confirm('This backup contains extra posters. Create an “Extra” folder?'))extras=await createFolder('Extra');const known=new Set(cards.filter(card=>!card.imagePath).map(card=>card.url)),created=[];for(const item of incoming.filter(item=>!validUrl(item.url)||(!known.has(item.url)&&known.add(item.url)))){const quantity=cardQuantity(item.quantity),folderId=quantity>1&&extras?extras.id:activeFolderId||folderMap.get(item.folderId)||null,folder=folders.find(candidate=>candidate.id===folderId),title=posterTitle(item.title.slice(0,60),folder);if(!folderId&&!title)throw new Error('A poster outside a folder must have a title.');created.push(await sourceToCard(item.url,crypto.randomUUID(),{folderId,title,year:/^\d{4}$/.test(String(item.year||''))?String(item.year):'',rarity:['Common','Rare','Legendary'].includes(item.rarity)?item.rarity:'Common',quantity}));}await persist([...cards,...created]);}catch(err){alert(err.message);}e.target.value='';};

refreshYears();if(sharedView)await loadShared();else{render();await initializeAuth();}
