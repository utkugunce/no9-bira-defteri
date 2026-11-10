import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function authContext(hash,fetch){
 const values=new Map(),replaced=[];
 const context=vm.createContext({URLSearchParams,Date,Error,Number,fetch,
  location:{hash,pathname:'/',search:''},
  history:{replaceState:(_state,_title,url)=>replaced.push(url)},
  localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}
 });
 vm.runInContext(readFileSync(new URL('./auth.js',import.meta.url),'utf8'),context);
 vm.runInContext("authConfig={url:'https://test.supabase.co',key:'public-key'}",context);
 return {context,values,replaced};
}

test('email confirmation validates the session and removes tokens from the URL',async()=>{
 const requests=[];
 const {context,values,replaced}=authContext('#access_token=confirmed&refresh_token=refresh&expires_in=3600',async(url,options)=>{
  requests.push({url,options});return Response.json({id:'confirmed-user'});
 });
 await vm.runInContext('acceptAuthRedirect()',context);
 assert.deepEqual(replaced,['/']);
 assert.equal(requests[0].options.headers.Authorization,'Bearer confirmed');
 assert.equal(JSON.parse(values.get('no9-session')).user.id,'confirmed-user');
});

test('invalid confirmation cannot create a local session',async()=>{
 const {context,values,replaced}=authContext('#access_token=invalid&refresh_token=refresh',async()=>new Response(null,{status:401}));
 await assert.rejects(vm.runInContext('acceptAuthRedirect()',context),/geçersiz/);
 assert.deepEqual(replaced,['/']);
 assert.equal(values.has('no9-session'),false);
});

test('expired confirmation reports a useful error and clears the fragment',async()=>{
 const {context,values,replaced}=authContext('#error=access_denied&error_code=otp_expired',()=>{throw Error('Unexpected fetch')});
 await assert.rejects(vm.runInContext('acceptAuthRedirect()',context),/süresi dolmuş/);
 assert.deepEqual(replaced,['/']);
 assert.equal(values.size,0);
});

test('ordinary page loads do not change an existing session',async()=>{
 const {context,values,replaced}=authContext('',()=>{throw Error('Unexpected fetch')});
 await vm.runInContext('acceptAuthRedirect()',context);
 assert.deepEqual(replaced,[]);
 assert.equal(values.size,0);
});
