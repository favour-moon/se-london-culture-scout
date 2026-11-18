/* Refresh the saved HTML with the same media markup as the live site. */
const fs=require('node:fs');
const media=require('../event-media.js');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=JSON.parse(fs.readFileSync('events.json','utf8'));
const events=data.events||[];
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const current=events.filter(e=>(e.endDate||e.date)>=today);
const link=e=>/^https:\/\//.test(e.url)?esc(e.url):'#';
const dates=e=>e.scheduleUnverified?'Performance dates and times unconfirmed':e.date+(e.endDate&&e.endDate!==e.date?' – '+e.endDate:'');
const cards=current.map(e=>'<article class="card" data-scout-card="1" data-search="'+esc([e.title,e.venue,e.area,e.location,e.category,e.description,e.price].join(' ').toLowerCase())+'">'+media.html(e)+'<header><span>'+esc(dates(e))+'</span><b>'+esc(e.category)+'</b></header><div class="body"><h3>'+esc(e.title)+'</h3><div class="venue">📍 '+esc(e.location||e.venue+' · '+e.area)+'</div><p>'+esc(e.description)+'</p></div><div class="foot"><span>'+esc(e.price||'Check organiser')+'</span><a href="'+link(e)+'" target="_blank" rel="noopener noreferrer">EVENT DETAILS ↗</a></div></article>').join('');
let html=fs.readFileSync('index.html','utf8');
html=html.replace(/(<div class="grid" id="cards">)[\s\S]*?(<\/div><div class="notice")/,(_,open,close)=>open+cards+close);
// Keep the editorial snapshot selection, refreshing its media from current data.
const old=html.match(/<div id="editorPicks" class="pick">([\s\S]*?)<\/div><section id="specials">/);
if(old){
 const titles=[...old[1].matchAll(/<(?:b|h4)>(.*?)<\/(?:b|h4)>/g)].map(m=>m[1]);
 const decode=s=>s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
 let picks=titles.map(t=>current.find(e=>e.title===decode(t))).filter(Boolean);
 const sunday=new Date(today+'T12:00:00Z');sunday.setUTCDate(sunday.getUTCDate()+(7-sunday.getUTCDay())%7);const end=sunday.toISOString().slice(0,10);
 picks=picks.filter(e=>e.date<=end);const seen=new Set(picks.map(e=>e.venue));
 for(const e of current){if(picks.length>=10)break;if(e.date<=end&&!seen.has(e.venue)&&e.linkStatus!=='unverified'){picks.push(e);seen.add(e.venue)}}
 const markup='<div id="editorPicks" class="pick"><div class="eyebrow">THE EDITOR’S TOP TEN</div><h3>Recommended outings this week · through '+esc(end)+'</h3><div class="pick-list">'+picks.slice(0,10).map(e=>'<article class="pick-item">'+media.html(e)+'<div><h4>'+esc(e.title)+'</h4><p>'+esc(dates(e))+'</p><p>📍 '+esc(e.location||e.venue+', '+e.area)+'</p><a href="'+link(e)+'" target="_blank" rel="noopener noreferrer">Event details ↗</a></div></article>').join('')+'</div></div><section id="specials">';
 html=html.replace(old[0],markup);
}
html=html.replace(/\d+ DISCOVERIES · FILTERS LOADING…/,current.length+' DISCOVERIES · FILTERS LOADING…');
fs.writeFileSync('index.html',html);console.log('Saved HTML:',current.length,'cards with images');
