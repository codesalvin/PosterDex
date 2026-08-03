const $=selector=>document.querySelector(selector), key='posterdex-v1', grid=$('#grid'), count=$('#count'), dialog=$('#dialog'), form=$('#form'), search=$('#search'), error=$('#error'), urlInput=$('#url'), preview=$('#urlPreview'), yearFilter=$('#yearFilter'), rarityFilter=$('#rarityFilter');
const safe=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const urls=()=>urlInput.value.split(/\r?\n/).map(url=>url.trim()).filter(Boolean);
const validUrl=url=>{ try{return new URL(url).protocol==='https:';}catch{return false;} };
let restored=[];try{const parsed=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(parsed))restored=parsed;}catch{}
let cards=restored.map(card=>({...card,url:String(card?.url||'').replace(/^http:/,'https:')})).filter(card=>validUrl(card.url)&&typeof card.title==='string').map(card=>({id:typeof card.id==='string'&&/^[\w-]+$/.test(card.id)?card.id:crypto.randomUUID(),url:card.url,title:card.title.slice(0,60),year:/^\d{4}$/.test(String(card.year||''))?String(card.year):'',rarity:['Common','Rare','Legendary'].includes(card.rarity)?card.rarity:'Common'})), editingId=null, draggedId=null;
localStorage.removeItem('posterdex-tmdb-token');
const save=()=>{ localStorage.setItem(key,JSON.stringify(cards)); refreshYears(); render(); };

function refreshYears(){
  const selected=yearFilter.value, years=[...new Set(cards.map(card=>card.year).filter(Boolean))].sort((a,b)=>b-a);
  yearFilter.innerHTML='<option value="">All years</option>'+years.map(year=>`<option>${safe(year)}</option>`).join('');
  if(years.includes(selected))yearFilter.value=selected;
}
function render(){
  const q=search.value.trim().toLowerCase(), shown=cards.filter(card=>(card.title+' '+card.year+' '+card.rarity).toLowerCase().includes(q)&&(!yearFilter.value||card.year===yearFilter.value)&&(!rarityFilter.value||card.rarity===rarityFilter.value));
  count.textContent=`${cards.length} CARD${cards.length===1?'':'S'}`;
  grid.innerHTML=shown.length?shown.map((card,i)=>`<article class="card tilt-${i%5}" data-card="${card.id}" draggable="true"><button class="remove" data-remove="${card.id}" aria-label="Remove ${safe(card.title)}">×</button><button class="edit" data-edit="${card.id}" aria-label="Edit ${safe(card.title)}">✎</button><div class="poster glare-hover"><img src="${safe(card.url)}" alt="${safe(card.title)} poster" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></div><div class="meta"><h2>${safe(card.title)}</h2><div class="row"><span>${safe(card.year)||'Year unknown'}</span><span class="rarity ${card.rarity.toLowerCase()}">${safe(card.rarity)}</span></div><div class="row"><span class="number">#${String(cards.indexOf(card)+1).padStart(3,'0')}</span></div></div></article>`).join(''):`<div class="empty"><div><strong>${cards.length?'No matching cards.':'Your binder is empty.'}</strong><span>${cards.length?'Try another filter.':'Hit “Add a poster” to make your first pull.'}</span></div></div>`;
}
function showPreview(){ preview.innerHTML=urls().filter(validUrl).map(url=>`<img src="${safe(url)}" alt="Poster preview">`).join(''); }
function openEditor(card){
  editingId=card?.id||null; form.reset(); error.textContent=''; preview.innerHTML='';
  $('#dialogTitle').textContent=card?'Edit card':'New pull'; $('#savePoster').textContent=card?'Save changes':'Add to collection';
  if(card){ urlInput.value=card.url; $('#title').value=card.title; $('#year').value=card.year; $('#rarity').value=card.rarity; showPreview(); }
  dialog.showModal(); urlInput.focus();
}

$('#openAdd').onclick=()=>openEditor();
$('#cancel').onclick=()=>dialog.close();
urlInput.oninput=showPreview;
form.onsubmit=e=>{
  e.preventDefault(); const data=new FormData(form), year=data.get('year').trim(), links=urls();
  if(year&&!/^\d{4}$/.test(year)){error.textContent='Year must be four digits.';return;}
  if(!links.length||links.some(url=>!validUrl(url))){error.textContent='Every line must be a valid HTTPS image URL.';return;}
  if(new Set(links).size!==links.length||links.some(url=>cards.some(card=>card.url===url&&card.id!==editingId))){error.textContent='One of those posters is already in your collection.';return;}
  const details={title:data.get('title').trim(),year,rarity:data.get('rarity')};
  if(editingId){ const index=cards.findIndex(card=>card.id===editingId); Object.assign(cards[index],{url:links[0],...details}); cards.splice(index+1,0,...links.slice(1).map(url=>({id:crypto.randomUUID(),url,...details}))); }
  else cards.unshift(...links.map(url=>({id:crypto.randomUUID(),url,...details})));
  dialog.close(); save();
};
grid.onclick=e=>{
  const removeId=e.target.dataset.remove, editId=e.target.dataset.edit;
  if(removeId){cards=cards.filter(card=>card.id!==removeId);save();}
  if(editId)openEditor(cards.find(card=>card.id===editId));
};
grid.addEventListener('error',e=>{if(e.target.matches('img'))e.target.parentElement.classList.add('broken');},true);
grid.ondragstart=e=>{const card=e.target.closest('[data-card]');if(!card)return;draggedId=card.dataset.card;card.classList.add('dragging');};
grid.ondragover=e=>e.preventDefault();
grid.ondrop=e=>{e.preventDefault();const target=e.target.closest('[data-card]');if(!target||target.dataset.card===draggedId)return;const from=cards.findIndex(card=>card.id===draggedId),to=cards.findIndex(card=>card.id===target.dataset.card);cards.splice(to,0,cards.splice(from,1)[0]);save();};
grid.ondragend=()=>{draggedId=null;render();};
search.oninput=yearFilter.onchange=rarityFilter.onchange=render;
$('#exportCards').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,cards},null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`posterdex-${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(link.href);};
$('#importCards').onclick=()=>$('#importFile').click();
$('#importFile').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text()),incoming=Array.isArray(data)?data:data.cards;if(!Array.isArray(incoming)||incoming.some(card=>!validUrl(card.url)||typeof card.title!=='string'))throw new Error();const known=new Set(cards.map(card=>card.url));cards.push(...incoming.filter(card=>!known.has(card.url)&&known.add(card.url)).map(card=>({id:crypto.randomUUID(),url:card.url,title:card.title,year:String(card.year||''),rarity:['Common','Rare','Legendary'].includes(card.rarity)?card.rarity:'Common'})));save();}catch{alert('That is not a valid PosterDex backup.');}e.target.value='';};
refreshYears(); render();
