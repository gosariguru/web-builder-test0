const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
class Element {
  constructor() { this.children=[]; this.events={}; this.value=''; this.classList={toggle(){}}; }
  append(...items) { this.children.push(...items); }
  replaceChildren() { this.children=[]; }
  addEventListener(name,fn) { this.events[name]=fn; }
  setAttribute() {} focus() {} reset() {} showModal() { this.open=true; } close() { this.open=false; this.events.close?.(); }
  querySelector() { return this.button ||= new Element(); }
}
let listener, session=null, fail=false, signupArgs, queryCount=0;
const rows=[], els={}, queue=[];
const get=s=>els[s] ||= new Element();
const user=id=>({id,email:id+'@example.com',user_metadata:{username:id==='A'?'앨리스':'밥'}});
const client={auth:{
 onAuthStateChange(fn){listener=fn;}, async getSession(){return {data:{session},error:null};},
 async signUp(args){signupArgs=args;return {data:{session:null},error:null};},
 async signInWithPassword(){session={user:user('A')};listener('SIGNED_IN',session);return {data:{session},error:null};},
 async signOut(){session=null;listener('SIGNED_OUT',null);return {error:null};}
},from(table){assert.equal(table,'todos');queryCount++;let op='select',values,filters=[];const q={
 select(){return q;},order(){return q;},eq(k,v){filters.push([k,v]);return q;},
 insert(v){op='insert';values=v;return q;},update(v){op='update';values=v;return q;},delete(){op='delete';return q;},single(){return q;},
 then(resolve,reject){return Promise.resolve().then(()=>{if(fail)return {data:null,error:{message:'network failure'}};
 const matches=r=>filters.every(([k,v])=>r[k]===v);let data;
 if(op==='insert'){assert(!('user_id' in values));data={...values,id:String(rows.length+1),user_id:session.user.id};rows.push(data);}
 else if(op==='update'){data=rows.find(matches);Object.assign(data,values);}
 else if(op==='delete'){const i=rows.findIndex(matches);data={id:rows[i].id};rows.splice(i,1);}
 else data=rows.filter(matches);
 return {data,error:null};}).then(resolve,reject);}
 };return q;}};
vm.runInNewContext(script,{document:{querySelector:get,createElement:()=>new Element()},window:{supabase:{createClient(url,key,opts){assert(url.startsWith('https://xbgj'));assert(key.startsWith('sb_publishable_'));assert(opts.auth.persistSession);return client;}}},setTimeout:fn=>queue.push(fn)});
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();while(queue.length){queue.shift()();for(let i=0;i<15;i++)await Promise.resolve();}};
const fire=(id,event='click')=>get('#'+id).events[event]({preventDefault(){}});
(async()=>{
 await flush();assert(get('#task-input').disabled);assert.equal(queryCount,0);
 fire('open-login');fire('auth-switch');get('#auth-email').value='A@EXAMPLE.COM';get('#auth-username').value='앨리스';get('#auth-password').value='test-only-pass';await fire('auth-form','submit');
 assert.equal(signupArgs.options.data.username,'앨리스');assert.equal(signupArgs.options.emailRedirectTo,'https://web-builder-test0-16ye9i931-ej-adab.vercel.app/');assert.match(get('#auth-message').textContent,/인증/);assert.equal(get('#auth-password').value,'');
 get('#auth-password').value='test-only-pass';await fire('auth-form','submit');await flush();assert.equal(get('#page-title').textContent,'앨리스님의 To-Do List');
 get('#task-input').value='산책';await fire('task-form','submit');assert.equal(rows.length,1);assert.equal(get('#task-list').children.length,1);
 const check=get('#task-list').children[0].children[0].children[0];check.checked=true;check.events.change();await flush();assert.equal(rows[0].completed,true);
 fail=true;get('#task-input').value='실패';await fire('task-form','submit');assert.equal(rows.length,1);assert.equal(get('#task-input').value,'실패');assert.match(get('#storage-message').textContent,/network/);fail=false;
 session={user:user('B')};listener('SIGNED_IN',session);assert.equal(get('#task-list').children.length,0);await flush();assert.equal(get('#task-list').children.length,0);
 session={user:user('A')};listener('SIGNED_IN',session);await flush();assert.equal(get('#task-list').children.length,1);
 get('#task-list').children[0].children[1].events.click();await flush();assert.equal(rows.length,0);
 await fire('logout');assert(get('#task-input').disabled);assert.equal(get('#task-list').children.length,0);
 assert(!/passwordHash|localStorage\.setItem|readUsers|hashPassword/.test(script));
 console.log('PASS: signup email confirmation, nickname, auth session, task CRUD, user switching, DB errors, logout, no custom password storage');
})().catch(error=>{console.error(error);process.exitCode=1;});
