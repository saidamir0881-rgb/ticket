import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOrigin } from '../lib/api.js';
test('same-origin mutations work behind Next local hostname normalization',()=>{
  assert.doesNotThrow(()=>checkOrigin(new Request('http://localhost:3000/api/bookings',{headers:{origin:'http://127.0.0.1:3000',host:'127.0.0.1:3000','x-forwarded-proto':'http'}})));
  assert.doesNotThrow(()=>checkOrigin(new Request('https://internal/api/bookings',{headers:{origin:'https://uzticket.example',host:'uzticket.example','x-forwarded-proto':'https'}})));
});
test('cross-origin and absent-origin mutations are rejected',()=>{
  for(const origin of ['https://evil.example','null','']){
    assert.throws(()=>checkOrigin(new Request('https://uzticket.example/api/admin',{headers:{origin,host:'uzticket.example'}})),/rad etildi/);
  }
});
