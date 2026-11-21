
'use strict';
const $=id=>document.getElementById(id), today=()=>londonDate.format(new Date());
const londonDate = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/London', year:'numeric', month:'2-digit', day:'2-digit'});
let events=[], saved=[], range='all', selectedDate='', view='cards', edition='', venues={};
let venueMap, pins, calendarMonth='';
function refreshRollingDates(){const start=today(),end=new Date(start+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+6);const fmt=x=>new Date(x+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});const el=$('range');if(el)el.textContent=fmt(start)+' – '+end.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
document.addEventListener('DOMContentLoaded',refreshRollingDates);
try{saved=JSON.parse(localStorage.getItem('scout-saved')||'[]')}catch(e){}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>{try{const x=new URL(u,location.href);return ['https:','http:'].includes(x.protocol)?x.href:'#'}catch{return '#'}};
const fmt=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{
  timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short',
  ...(d.slice(0,4)!==today().slice(0,4)?{year:'numeric'}:{})
});
const key=e=>e.id||[e.title,e.venue].join('|');
const end=e=>e.endDate||e.date;
const savedKey=e=>e.seriesId||key(e);
const calendarISO=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dateLabel=e=>fmt(e.date)+(end(e)!==e.date?' – '+fmt(end(e)):'')+(e.startTime?' · '+e.startTime+(e.endTime?'–'+e.endTime:''):'');
const dateLines=e=>e.scheduleUnverified?'Performance dates and times unconfirmed':dateLabel(e);
function runsOn(e, date) {
  return e.date<=date && end(e)>=date && (!e.openDays || e.extraOpenDates?.includes(date) || e.openDays.includes(new Date(date+'T12:00:00Z').getUTCDay()));
}
function occursBetween(e, first, last) {
  if(e.scheduleUnverified) return e.date<=last&&end(e)>=first;
  const from = new Date((first>e.date?first:e.date)+'T12:00:00Z');
  const until = last<end(e)?last:end(e);
  for(let d=from;d.toISOString().slice(0,10)<=until;d.setUTCDate(d.getUTCDate()+1)){
    if(runsOn(e,d.toISOString().slice(0,10)))return true;
  }
  return false;
}
function expandEvents(list){
  return list.flatMap(e=>e.sessions?.length?e.sessions.map(session=>({
    ...e,...session,endDate:session.date,seriesId:key(e),id:key(e)+'|'+session.date+'|'+(session.startTime||'')
  })): [e]);
}
const londonOffset = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',timeZoneName:'longOffset'});
function londonTimeToUTC(value){
  const guess=new Date(value+'Z');
  const zone=londonOffset.formatToParts(guess).find(part=>part.type==='timeZoneName').value;
  const utc=new Date(zone==='GMT'?guess:value+zone.slice(3));
  return utc.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
}
function calendarDates(e){
  if(e.startTime){
    const start=e.date+'T'+e.startTime+':00';
    const finish=e.endTime?e.date+'T'+e.endTime+':00':null;
    return {start:londonTimeToUTC(start),finish:finish?londonTimeToUTC(finish):null,timed:true};
  }
  const finish=new Date(end(e)+'T12:00:00Z');
  finish.setUTCDate(finish.getUTCDate()+1);
  return {start:e.date.replace(/-/g,''),finish:finish.toISOString().slice(0,10).replace(/-/g,''),timed:false};
}
function eventLink(e){
  const label=e.linkStatus==='unverified'?'Organiser programme · unconfirmed':e.linkStatus==='link-unverified'?'Event page · link unconfirmed':e.linkStatus==='programme'?'Programme listing (not direct booking)':e.linkStatus==='details'?'Event details':'Tickets';
  return '<a target="_blank" rel="noopener noreferrer" href="'+esc(safeUrl(e.url))+'">'+label+' ↗</a>';
}
function directions(e,name=e.location||e.venue){
  const place=venues[name];
  const destination=place?.address||e.venue+', '+e.area+', London';
  return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination);
}
const age=e=>e.minAge!=null?e.minAge:(e.family?12:18);
const isNew=e=>e.addedAt===edition||e.newThisEdition===true;
function budgetOK(e,b){if(b==='all')return true;const p=String(e.price||'').toLowerCase();if(p.includes('free')||p.includes('pay what'))return true;if(b==='free')return false;const vals=[...p.matchAll(/£\s*(\d+(?:\.\d+)?)/g)].map(m=>+m[1]);return vals.length>0&&Math.min(...vals)<=15}
function dateOK(e){
  const t=today();
  if(end(e)<t)return false;
  if(selectedDate)return selectedDate>=t&&occursBetween(e,selectedDate,selectedDate);
  if(range==='all')return true;
  if(range==='today')return occursBetween(e,t,t);
  const lo=new Date(t+'T12:00:00'),hi=new Date(lo);
  if(range==='week')hi.setDate(hi.getDate()+7);
  else {
    const days=lo.getDay()===0?0:(6-lo.getDay()+7)%7;
    lo.setDate(lo.getDate()+days);
    hi.setTime(lo.getTime());
    if(lo.getDay()===6)hi.setDate(hi.getDate()+1);
  }
  return occursBetween(e,calendarISO(lo),calendarISO(hi));
}
function matching(){const q=$('search').value.trim().toLocaleLowerCase(),cat=$('category').value,b=$('budget').value,interest=$('interest').value,travel=$('travel').value;let a=events.filter(e=>dateOK(e)&&(cat==='All categories'||e.category===cat)&&(!$('family').checked||age(e)<=12)&&(!$('saved').checked||saved.includes(savedKey(e)))&&(!$('newonly').checked||isNew(e))&&budgetOK(e,b)&&[e.title,e.area,e.venue,e.location,e.category,e.description,e.note,e.price].join(' ').toLocaleLowerCase().includes(q));if(interest!=='all')a=a.filter(e=>interest==='jazz'?/jazz|music/i.test(e.category+' '+e.title+' '+e.description):interest==='family'?age(e)<=12:interest==='art'?e.category==='Art':e.category==='Comedy');if(travel!=='all')a=a.filter(e=>{const near=['Honor Oak','Forest Hill','Brockley','Peckham','Dulwich','New Cross','Deptford','Camberwell','Lewisham','West Norwood'];return travel==='30'||near.some(x=>e.area.toLowerCase().includes(x.toLowerCase()))});const sort=$('sort').value;a.sort((x,y)=>sort==='area'?x.area.localeCompare(y.area):sort==='title'?x.title.localeCompare(y.title):x.date.localeCompare(y.date)||(x.startTime||'').localeCompare(y.startTime||''));return a}
function verdict(e){return e.verdict||({Music:'For the curious ear: a local gig worth investigating.',Comedy:'A small-room comedy prospect worth checking.',Art:'An interesting detour from the usual gallery circuit.',Oddities:'Precisely the kind of oddity this guide exists to uncover.',Theatre:'A neighbourhood-stage discovery.'}[e.category]||'A local cultural discovery worth exploring.')}
function badges(e){const t=[];if(e.featured)t.push("SCOUT'S PICK");if(e.hiddenGem)t.push('HIDDEN GEM');if(isNew(e))t.push('NEW');if(age(e)<=12)t.push('12+ FRIENDLY');if(e.minAge>12)t.push(e.minAge+'+');return t.map(x=>'<span>'+esc(x)+'</span>').join('')}
function card(e){const k=key(e),photo=ScoutMedia.html(e);const dates=calendarDates(e);
const calendarUrl='https://calendar.google.com/calendar/render?'+new URLSearchParams({
  action:'TEMPLATE',text:e.title,dates:dates.start+'/'+(dates.finish||dates.start),
  ctz:'Europe/London',details:e.description+' '+e.url,location:e.venue+', '+e.area+', London'
});
const sessionList=e.displaySessions?.length>1?'<details class="show-dates"><summary>See '+e.displaySessions.length+' performance dates</summary><ul>'+e.displaySessions.map(x=>'<li>'+esc(fmt(x.date)+(x.startTime?' · '+x.startTime:''))+'</li>').join('')+'</ul></details>':'';
const calendarActions=(e.displaySessions?.length>1||e.scheduleUnverified)?'':'<button data-ics="'+encodeURIComponent(k)+'">Add to calendar</button><a href="'+esc(calendarUrl)+'" target="_blank" rel="noopener noreferrer">Google Calendar ↗</a>';
return '<article class="card '+(e.featured?'feature':'')+'">'+photo+'<header><span>'+esc(dateLines(e))+'</span><b>'+esc(e.category)+'</b></header><div class="body"><h3>'+esc(e.title)+'</h3><div class="venue">'+esc(e.venue)+' · '+esc(e.area)+'</div><div class="tags">'+badges(e)+'</div><p>'+esc(e.description)+'</p>'+sessionList+'<div class="verdict"><b>THE SCOUT’S VERDICT</b><br>'+esc(verdict(e))+'</div><p>'+esc(e.note||'')+(e.linkStatus==='unverified'?' · Listing unconfirmed.':'')+'</p></div><div class="foot"><span>'+esc(e.price||'Check organiser')+'</span><button class="heart" data-save="'+encodeURIComponent(savedKey(e))+'" aria-label="Save event" aria-pressed="'+saved.includes(savedKey(e))+'">'+(saved.includes(savedKey(e))?'♥':'♡')+'</button>'+eventLink(e)+'</div><div class="actions"><button data-share="'+encodeURIComponent(k)+'">Share ↗</button>'+calendarActions+'<a href="'+esc(directions(e))+'" target="_blank" rel="noopener noreferrer">Directions ↗</a><a href="'+esc(safeUrl(e.sourceUrl||e.url))+'" target="_blank" rel="noopener noreferrer">Source ↗</a></div></article>'}
function calendar(){
  const el=$('calendar');
  $('calendarNav').classList.toggle('hidden',view!=='calendar');
  el.classList.toggle('hidden',view!=='calendar');
  if(view!=='calendar')return;
  const month=new Date((calendarMonth||selectedDate.slice(0,7)||today().slice(0,7))+'-01T12:00:00');
  $('calendarMonth').textContent=month.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  const start=new Date(month);
  start.setDate(1-(start.getDay()+6)%7);
  let html='';
  const t=today();
  for(let i=0;i<42;i++){
    const d=new Date(start);
    d.setDate(start.getDate()+i);
    const iso=calendarISO(d);
    const count=iso<t?0:events.filter(e=>!e.scheduleUnverified&&runsOn(e,iso)).length;
    html+='<button class="day '+(selectedDate===iso?'selected':'')+'" data-day="'+iso+'" aria-label="'+esc(fmt(iso)+', '+count+' events')+'" aria-pressed="'+(selectedDate===iso?true:false)+'"><b>'+d.getDate()+'</b><span aria-hidden="true">'+count+'</span></button>';
  }
  el.innerHTML=html;
  el.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{
    selectedDate=b.dataset.day;
    calendarMonth=selectedDate.slice(0,7);
    $('specific').value=selectedDate;
    render();
    el.querySelector('[data-day="'+selectedDate+'"]')?.focus();
  });
}
function moveMonth(step){
  const month=new Date((calendarMonth||selectedDate.slice(0,7)||today().slice(0,7))+'-01T12:00:00');
  month.setMonth(month.getMonth()+step);
  calendarMonth=calendarISO(month).slice(0,7);
  calendar();
}
$('prevMonth').onclick=()=>moveMonth(-1);
$('nextMonth').onclick=()=>moveMonth(1);
function map(a){
  const box=$('mapArea');
  box.classList.toggle('hidden',view!=='map');
  if(view!=='map')return;
  const grouped=new Map();
  for(const e of a){
    for(const name of [e.location||e.venue,...(e.additionalLocations||[])]){
      if(!grouped.has(name))grouped.set(name,[]);
      grouped.get(name).push(e);
    }
  }
  const sections=[...grouped].map(([name,list])=>{
    const place=venues[name];
    const header='<b>'+esc(name)+'</b> · '+esc(list[0].area);
    const rows='<ul>'+list.map(e=>'<li class="event-mini">'+ScoutMedia.html(e)+'<div>'+esc(e.title)+' · '+esc(dateLines(e))+' · '+eventLink(e)+'</div></li>').join('')+'</ul>';
    const link='<a target="_blank" rel="noopener noreferrer" href="'+esc(directions(list[0],name))+'">Directions ↗</a>';
    return {name,place,count:list.length,html:header+' · '+link+rows};
  });
  $('venuePanel').innerHTML=sections.length?sections.map(({html})=>'<section>'+html+'</section>').join(''):'No matching venues.';
  $('mapFrame').classList.toggle('hidden',!sections.some(s=>s.place));
  if(!sections.some(s=>s.place))return;
  if(!window.L){
    $('mapFrame').textContent='The map is unavailable. Directions are listed below.';
    return;
  }
  if(!venueMap){
    venueMap=L.map('mapFrame',{scrollWheelZoom:false}).setView([51.465,-0.065],12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(venueMap);
    pins=L.featureGroup().addTo(venueMap);
  }
  venueMap.closePopup();
  pins.clearLayers();
  for(const {name,place,count,html} of sections){
    if(!place)continue;
    const icon=L.divIcon({className:'venue-pin',html:String(count),iconSize:[36,36]});
    L.marker(place.coordinates,{icon,alt:name,title:name}).bindPopup(html,{maxHeight:220,maxWidth:245}).addTo(pins).getElement()?.setAttribute('aria-label',name);
  }
  venueMap.invalidateSize();
  if(pins.getLayers().length)venueMap.fitBounds(pins.getBounds(),{padding:[25,25],maxZoom:15});
}
function groupProductions(items){const groups=new Map();for(const e of items){const k=e.seriesId||key(e);if(!groups.has(k))groups.set(k,{...e,displaySessions:[]});const g=groups.get(k);g.displaySessions.push({date:e.date,startTime:e.startTime||''});if(e.date<g.date)g.date=e.date;if(end(e)>end(g))g.endDate=end(e);}return [...groups.values()].map(e=>({...e,displaySessions:[...new Map(e.displaySessions.map(x=>[x.date+'|'+x.startTime,x])).values()].sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime))}));}
function render(){if(!events.length&&!window.scoutReady)return;const a=groupProductions(matching());const active=[];if($('search').value.trim())active.push('Search');if($('category').value!=='All categories')active.push($('category').value);if($('budget').value!=='all')active.push('Budget');if($('travel').value!=='all')active.push('Area');if($('interest').value!=='all')active.push('Interest');if($('family').checked)active.push('Family');if($('saved').checked)active.push('Saved');if($('newonly').checked)active.push('New');if(selectedDate)active.push('Date: '+selectedDate);else if(range!=='all')active.push(range==='week'?'Next 7 days':range==='weekend'?'Weekend':'Today');$('filterStatus').textContent=active.length?'Active filters: '+active.join(' · '):'Showing all upcoming discoveries';$('count').textContent=new Set(a.map(savedKey)).size+' DISCOVERIES';$('cards').innerHTML=a.length?a.map(card).join(''):'<div class="empty">No matching future events. Try another date or filter.</div>';const pickScore=e=>{const text=(e.title+' '+e.description+' '+e.category).toLowerCase();const local=/honor oak|forest hill|brockley|deptford|new cross|peckham|dulwich|nunhead|blackheath|greenwich|camberwell/.test(e.area.toLowerCase())?3:0;const quirky=/immersive|unusual|experimental|solstice|folklore|vintage|studio|crypt|lantern|ship|makers|midwinter|workshop|jazz|comedy|magic|pantomime/.test(text)?4:0;const distinctive=e.hiddenGem?2:0;const editorial=e.featured?2:0;const linkQuality=e.url&& !/\/whats-on\/?$|\/events\/?$|\/whats-on\/?\?|\/browse\//.test(e.url)?3:0;const upcoming=new Date(e.date+'T12:00:00Z').getTime()-Date.now();const timely=upcoming>=0&&upcoming<=21*86400000?2:0;return local+quirky+distinctive+editorial+linkQuality+timely;};const nowUK=today();const weekStart=new Date(nowUK+'T12:00:00Z');const weekEnd=new Date(weekStart);weekEnd.setUTCDate(weekEnd.getUTCDate()+6);const weekEndISO=weekEnd.toISOString().slice(0,10);const thisWeek=events.filter(e=>e.date<=weekEndISO&&end(e)>=nowUK&&e.url&&e.linkStatus!=='unverified'&&(!e.sessions||!e.sessions.length||e.sessions.some(x=>x.date>=nowUK&&x.date<=weekEndISO)));const candidates=groupProductions(thisWeek).sort((a,b)=>pickScore(b)-pickScore(a)||a.date.localeCompare(b.date));const picks=[];const venueCounts=new Map(),categoryCounts=new Map(),areaCounts=new Map();while(picks.length<10&&candidates.length){let bestIndex=-1,bestScore=-Infinity;for(let i=0;i<candidates.length;i++){const e=candidates[i],venue=(e.venue||'').toLowerCase().trim(),cat=e.category||'Other',area=e.area||'Other';if((venueCounts.get(venue)||0)>=1)continue;const score=pickScore(e)-6*(categoryCounts.get(cat)||0)-2*(areaCounts.get(area)||0);if(score>bestScore){bestScore=score;bestIndex=i}}if(bestIndex<0)break;const e=candidates.splice(bestIndex,1)[0],v=(e.venue||'').toLowerCase().trim();picks.push(e);venueCounts.set(v,(venueCounts.get(v)||0)+1);categoryCounts.set(e.category||'Other',(categoryCounts.get(e.category||'Other')||0)+1);areaCounts.set(e.area||'Other',(areaCounts.get(e.area||'Other')||0)+1);}$('editorPicks').innerHTML='<div class="eyebrow">THE EDITOR’S TOP TEN</div><h3>Ten recommended outings for the next 7 days · through ' + weekEnd.toLocaleDateString("en-GB",{day:"numeric",month:"short"}) + '.</h3>'+'<div class="pick-list">'+picks.map(e=>'<article class="pick-item">'+ScoutMedia.html(e)+'<div><h4>'+esc(e.title)+'</h4><p>'+esc(dateLines(e))+'</p><p>📍 '+esc(e.location||e.venue+', '+e.area)+'</p><a href="'+esc(safeUrl(e.url))+'" target="_blank" rel="noopener noreferrer">Official event details ↗</a></div></article>').join('')+'</div>';$('cards').classList.toggle('hidden',view==='map');$('mapToggle').setAttribute('aria-pressed',view==='map');$('calendarToggle').setAttribute('aria-pressed',view==='calendar');try{calendar()}catch(err){console.warn('Calendar unavailable',err)}try{map(a)}catch(err){console.warn('Map unavailable',err)}document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>{const k=decodeURIComponent(b.dataset.save);saved=saved.includes(k)?saved.filter(x=>x!==k):[...saved,k];try{localStorage.setItem('scout-saved',JSON.stringify(saved))}catch{}render()});document.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>share(events.find(e=>key(e)===decodeURIComponent(b.dataset.share))));document.querySelectorAll('[data-ics]').forEach(b=>b.onclick=()=>downloadIcs(events.find(e=>key(e)===decodeURIComponent(b.dataset.ics))))}
function share(e){if(!e)return;const text=e.title+' — '+e.venue+' ('+dateLines(e)+') '+e.url;if(navigator.share)navigator.share({title:e.title,text,url:e.url}).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(text).then(()=>alert('Event copied to clipboard')).catch(()=>prompt('Copy event',text));else prompt('Copy event',text)}
function downloadIcs(e){if(!e||e.scheduleUnverified)return;const clean=x=>String(x||'').replace(/[\r\n]+/g,' ').replace(/[,;]/g,' ');const dates=calendarDates(e);const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SE London Culture Scout//EN','BEGIN:VEVENT','UID:'+encodeURIComponent(key(e))+'@culture-scout','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'').replace('Z','Z'),'DTSTART'+(dates.timed?'':';VALUE=DATE')+':'+dates.start,...(dates.finish?['DTEND'+(dates.timed?'':';VALUE=DATE')+':'+dates.finish]:[]),'SUMMARY:'+clean(e.title),'LOCATION:'+clean(e.venue+', '+e.area),'DESCRIPTION:'+clean(e.description+' '+e.url),'END:VEVENT','END:VCALENDAR'].join('\r\n');const url=URL.createObjectURL(new Blob([content],{type:'text/calendar'}));const a=document.createElement('a');a.href=url;a.download='culture-scout.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('resetFilters').onclick=()=>{['search','specific'].forEach(id=>$(id).value='');['category','sort','budget','travel','interest'].forEach(id=>$(id).selectedIndex=0);['family','saved','newonly'].forEach(id=>$(id).checked=false);range='all';selectedDate='';document.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('active',b.dataset.range==='all'));render()};
['search','category','sort','family','saved','budget','travel','interest','newonly'].forEach(id=>$(id).addEventListener('input',render));
$('searchButton').onclick=()=>{view='cards';render();$('count').scrollIntoView({behavior:'smooth',block:'start'});};
$('clearSearch').onclick=()=>{$('search').value='';render();$('search').focus();};
$('search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('searchButton').click();}});
document.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>{range=b.dataset.range;selectedDate='';$('specific').value='';document.querySelectorAll('[data-range]').forEach(x=>x.classList.toggle('active',x===b));render()});
$('specific').addEventListener('change',e=>{selectedDate=e.target.value;calendarMonth=selectedDate.slice(0,7);range='all';render()});
$('calendarToggle').onclick=()=>{view=view==='calendar'?'cards':'calendar';render()};
$('mapToggle').onclick=()=>{view=view==='map'?'cards':'map';render()};
$('surprise').onclick=()=>{const a=groupProductions(matching());if(!a.length)return alert('No events match your filters.');const pick=a[Math.floor(Math.random()*a.length)];alert('🎲 YOUR SIDE-DOOR DISCOVERY\n\n'+pick.title+'\n'+dateLines(pick)+' · '+pick.venue+'\n\n'+verdict(pick));};
$('shareSite').onclick=()=>{if(navigator.share)navigator.share({title:'SE London Culture Scout',url:location.href}).catch(()=>{});else navigator.clipboard?.writeText(location.href).then(()=>alert('Website link copied'))};
fetch('./events.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Feed unavailable');return r.json()}).then(d=>{edition=d.issue||'';venues=d.venues||{};events=expandEvents((d.events||[]).filter(e=>e.title&&e.date&&e.url));$('issue').textContent=d.issue||'THE FIELD GUIDE';$('range').textContent=d.range||'CULTURAL DISCOVERIES';$('notice').textContent=(d.notice||'Confirm event details with the organiser.')+' Map neighbourhood filters are approximate, not calculated travel times. Calendar exports use all-day entries for untimed listings.';render();window.scoutReady=true;extras()}).catch(err=>{$('count').textContent='Unable to load events';console.error(err);$('filterStatus').textContent='Live feed unavailable; search still works on the saved event listings.'});


function extras(){const active=groupProductions(events.filter(e=>end(e)>=today()));$('afterDark').innerHTML=active.filter(e=>['Music','Comedy','Theatre'].includes(e.category)).slice(0,7).map(e=>'<button class="event-shortcut" data-event="'+encodeURIComponent(key(e))+'">'+ScoutMedia.html(e,{compact:true})+esc(e.title)+' · '+esc(e.area)+'</button>').join('');$('afterDark').querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{const e=events.find(x=>key(x)===decodeURIComponent(b.dataset.event));$('search').value=e.title;document.getElementById('discover').scrollIntoView({behavior:'smooth'});render()});const areas=[...new Set(active.map(e=>e.area))].sort();$('neighbourhoods').innerHTML=areas.map(x=>'<button data-area="'+encodeURIComponent(x)+'">'+esc(x)+' · '+active.filter(e=>e.area===x).length+'</button>').join('');$('neighbourhoods').querySelectorAll('[data-area]').forEach(b=>b.onclick=()=>{$('search').value=decodeURIComponent(b.dataset.area);document.getElementById('discover').scrollIntoView({behavior:'smooth'});render()})}
$('weekendPlan').onclick=()=>{const a=groupProductions(events.filter(e=>end(e)>=today()&&e.date<=new Date(Date.now()+30*86400000).toISOString().slice(0,10)));const groups={};for(const e of a){const k=e.date+'|'+e.area;(groups[k]??=[]).push(e)}const distinct=list=>[...new Map(list.map(e=>[savedKey(e),e])).values()];const pair=Object.values(groups).map(distinct).find(v=>v.length>=2)||distinct(a).slice(0,2);$('planResult').classList.remove('hidden');$('planResult').innerHTML='<b>YOUR TWO-STOP OUTING</b>'+pair.slice(0,2).map(e=>'<div class="event-mini">'+ScoutMedia.html(e)+'<p>'+esc(dateLines(e)+' · '+e.title+' — '+e.venue)+'</p></div>').join('')+'<p>Suggested combination only. Check performance times, travel and ticket availability before committing.</p>'};

