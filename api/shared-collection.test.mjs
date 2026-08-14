import assert from 'node:assert/strict';
import handler, { validShareToken } from './shared-collection.js';

assert.equal(validShareToken('123e4567-e89b-42d3-a456-426614174000'),true);
assert.equal(validShareToken('not-a-token'),false);
const response={headers:{},setHeader(name,value){this.headers[name]=value;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
await handler({method:'GET',query:{token:'not-a-token'}},response);
assert.equal(response.statusCode,400);
console.log('shared-collection checks passed');
