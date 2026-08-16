export const cardsInFolder=(cards,folderId)=>cards.filter(card=>(card.folderId||null)===(folderId||null));
export const folderColor=sortOrder=>Math.abs(Number(sortOrder)||0)%7;
export const cardQuantity=value=>Number.isInteger(Number(value))&&Number(value)>0?Math.min(Number(value),999):1;
export const posterCount=cards=>cards.reduce((total,card)=>total+cardQuantity(card.quantity),0);
export const extraFolder=folders=>folders.find(folder=>folder.name.trim().toLowerCase()==='extra');
export const extraCards=(cards,folderId)=>cards.filter(card=>card.folderId!==folderId&&cardQuantity(card.quantity)>1).map(card=>({...card,quantity:cardQuantity(card.quantity)-1,extraCopy:true}));
export const posterTitle=(title,folder)=>title.trim()||(folder?.autoName?folder.name:'');
export const moveCard=(cards,id,target)=>cards.map(card=>card.id===id?{...card,folderId:(typeof target==='string'?target:target?.id)||null,title:typeof target==='object'?posterTitle(card.title,target):card.title}:card);
