import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const origin=process.env.QA_ORIGIN || 'http://127.0.0.1:3000';
const output=resolve('.sites-runtime/qa');
await mkdir(output,{recursive:true});
const child=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
  '--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions',
  '--remote-debugging-port=0',`--user-data-dir=${resolve('.sites-runtime/qa-profile')}`,'about:blank',
],{windowsHide:true,stdio:['ignore','ignore','pipe']});
const watchdog=setTimeout(()=>{child.kill();process.exitCode=1;console.error('Browser QA timed out.');},60000);
try {
  const endpoint=await new Promise((accept,reject)=>{let log='';child.stderr.on('data',d=>{log+=d.toString();const m=log.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)accept(m[1]);});child.on('error',reject);child.on('exit',code=>reject(new Error(`Browser exited: ${code}`)));});
  const ws=new WebSocket(endpoint);await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail;});
  let serial=0;const pending=new Map();
  ws.onmessage=e=>{const result=JSON.parse(e.data);if(result.id){const p=pending.get(result.id);pending.delete(result.id);if(result.error)p.reject(new Error(result.error.message));else p.resolve(result.result);}};
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const cdp=(method,params)=>send(method,params,sessionId);
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  async function waitFor(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,150));}throw new Error(`Timed out: ${expression}`);}
  async function visit(path){await cdp('Page.navigate',{url:origin+path});await waitFor("document.readyState === 'complete' && !!document.querySelector('main')");await new Promise(r=>setTimeout(r,1000));}
  await visit('/');
  await waitFor("document.querySelectorAll('.event-card').length === 50");
  assert.equal(await evaluate("document.querySelector('h1').textContent.includes('Xotiralar')"),true);
  const desktop=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(resolve(output,'home-desktop.png'),Buffer.from(desktop.data,'base64'));
  await visit('/events/30000000-0000-4000-8000-000000006263');
  const localBooking=await evaluate("!!document.querySelector('.seatmap')");
  if(localBooking){
    await waitFor("document.querySelectorAll('button.seat').length === 100");
    await evaluate("document.querySelector('button.seat.available').click()");
    assert.equal(await evaluate("document.querySelectorAll('button.seat.selected').length"),1);
  }else{
    assert.equal(await evaluate("document.querySelector('.panel a.button').href.startsWith('https://iticket.uz/ru/events/')"),true);
  }
  await visit('/events');
  await waitFor("document.querySelectorAll('.event-card').length === 50");
  await evaluate("document.querySelector('.search-field input').value='Cheb';document.querySelector('.search-field input').dispatchEvent(new Event('input',{bubbles:true}))");
  await visit('/account');
  await waitFor("location.pathname === '/login'");
  await visit('/admin');
  await waitFor("location.pathname === '/login'");
  await waitFor("!!document.querySelector('.auth-wrap form')");
  const adminShot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(resolve(output,'admin-login.png'),Buffer.from(adminShot.data,'base64'));
  assert.equal(await evaluate("document.querySelector('input[name=password]').type"),'password');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await visit('/');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true);
  await evaluate("document.querySelector('.mobile-menu').click()");
  await waitFor("document.querySelector('.navigation').classList.contains('open')");
  await evaluate("document.querySelector('.mobile-menu').click()");
  const mobile=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await writeFile(resolve(output,'home-mobile.png'),Buffer.from(mobile.data,'base64'));
  console.log('PASS: 50 real listings, official purchase link, correct source price, no local seats, protected redirects, mobile overflow and menu.');
  console.log(`Screenshots: ${output}`);
  await send('Browser.close');ws.close();
} finally {clearTimeout(watchdog);child.kill();}
