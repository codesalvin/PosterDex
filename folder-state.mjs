export const cardsInFolder=(cards,folderId)=>cards.filter(card=>(card.folderId||null)===(folderId||null));
export const folderColor=sortOrder=>Math.abs(Number(sortOrder)||0)%7;
export const posterTitle=(title,folder)=>title.trim()||(folder?.autoName?folder.name:'');
export const moveCard=(cards,id,target)=>cards.map(card=>card.id===id?{...card,folderId:(typeof target==='string'?target:target?.id)||null,title:typeof target==='object'?posterTitle(card.title,target):card.title}:card);
