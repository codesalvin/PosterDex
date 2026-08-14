import assert from 'node:assert/strict';
import { cardsInFolder, moveCard } from '../folder-state.mjs';

const cards=[{id:'a',folderId:null},{id:'b',folderId:'favorites'}];
assert.deepEqual(cardsInFolder(cards,null).map(card=>card.id),['a']);
assert.deepEqual(cardsInFolder(cards,'favorites').map(card=>card.id),['b']);
assert.equal(moveCard(cards,'a','favorites')[0].folderId,'favorites');
assert.equal(moveCard(cards,'b','')[1].folderId,null);
console.log('folder-state checks passed');
