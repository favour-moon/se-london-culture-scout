const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');fs.mkdirSync('test-results',{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const base=process.env.SCOUT_URL||'http://127.0.0.1:8765/';
 const results=[];
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.goto(base);await page.waitForFunction(()=>window.scoutReady);
  const info=await page.evaluate(()=>({cards:document.querySelectorAll('#cards article').length,media:document.querySelectorAll('#cards article .event-media').length,picks:document.querySelectorAll('.pick-item').length,pickMedia:document.querySelectorAll('.pick-item .event-media').length,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(info.cards,info.media);assert(info.picks>0&&info.picks<=10);assert.equal(info.pickMedia,info.picks);assert.equal(info.overflow,false);
  for(const img of await page.locator('#editorPicks img').all()){try{await img.scrollIntoViewIfNeeded()}catch{}}
  await page.waitForFunction(()=>!document.querySelector('#editorPicks .has-photo:not(.photo-loaded)'),{},{timeout:30000});
  await page.locator('#editorPicks').screenshot({path:`test-results/${base.startsWith('https')?'live':'local'}-${width}.png`});
  await page.getByLabel('Search events',{exact:true}).fill('jazz');assert(await page.locator('#cards .event-media').count()>0);
  await page.getByRole('button',{name:'Clear all filters',exact:true}).click();
  await page.getByRole('button',{name:'Suggest a two-stop culture day'}).click();assert.equal(await page.locator('#planResult .event-media').count(),2);
  await page.goto(base+'archive.html');await page.waitForFunction(()=>document.querySelector('#count').textContent.includes('past events'));assert.equal(await page.locator('#list article').count(),await page.locator('#list .event-media').count());
  results.push({width,...info});await page.close();
 }
 // Failed image responses must reveal the inline illustration and honest caption.
 const failed=await browser.newPage();await failed.route('**/*',route=>route.request().resourceType()==='image'?route.abort():route.continue());await failed.goto(base);await failed.waitForFunction(()=>window.scoutReady);for(const img of await failed.locator('#editorPicks img').all()){try{await img.scrollIntoViewIfNeeded()}catch{}}
 await failed.waitForFunction(()=>[...document.querySelectorAll('#editorPicks .event-media')].every(f=>!f.classList.contains('has-photo')));assert(await failed.locator('#editorPicks svg').count()>0);await failed.close();
 // Saved HTML must contain images even without JS or feed.
 const stat=await browser.newPage({javaScriptEnabled:false});await stat.goto(base);assert.equal(await stat.locator('#cards article').count(),await stat.locator('#cards .event-media').count());assert(await stat.locator('#editorPicks .event-media').count()>0);await stat.close();
 const outage=await browser.newPage();await outage.route('**/events.json',r=>r.abort());await outage.goto(base);await outage.getByLabel('Search events',{exact:true}).fill('jazz');assert(await outage.locator('#cards article:visible').count()>0);assert.equal(await outage.locator('#cards article:visible').count(),await outage.locator('#cards article:visible .event-media').count());await outage.close();
 console.log(JSON.stringify({base,results,failedImages:'passed',noJavaScript:'passed'}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
