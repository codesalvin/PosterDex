export const cardsInFolder=(cards,folderId)=>cards.filter(card=>(card.folderId||null)===(folderId||null));
export const moveCard=(cards,id,folderId)=>cards.map(card=>card.id===id?{...card,folderId:folderId||null}:card);
