import assert from 'node:assert/strict';
import { cardsInFolder, folderColor, moveCard, posterTitle } from '../folder-state.mjs';

const cards=[{id:'a',folderId:null},{id:'b',folderId:'favorites'}];
assert.deepEqual(cardsInFolder(cards,null).map(card=>card.id),['a']);
assert.deepEqual(cardsInFolder(cards,'favorites').map(card=>card.id),['b']);
assert.equal(moveCard(cards,'a','favorites')[0].folderId,'favorites');
assert.equal(moveCard(cards,'b','')[1].folderId,null);
assert.deepEqual(moveCard([{id:'c',title:'',folderId:null}],'c',{id:'favorites',name:'Favorites',autoName:true})[0],{id:'c',title:'Favorites',folderId:'favorites'});
assert.deepEqual(Array.from({length:8},(_,index)=>folderColor(index)),[0,1,2,3,4,5,6,0]);
assert.equal(posterTitle('',{name:'Favorites',autoName:true}),'Favorites');
assert.equal(posterTitle('',{name:'Favorites',autoName:false}),'');
console.log('folder-state checks passed');
