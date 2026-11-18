/* Shared by live cards, archive and the build-time HTML snapshot. */
(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories={
 Comedy:'<path d="M260 90q60-35 120 0v55q-10 65-60 75-50-10-60-75zM285 120h8m54 0h8m-60 40q25 30 50 0"/>',
 Theatre:'<path d="M255 80l100 20-12 70q-30 60-75 5zM278 116l14 4m29 6l13 4m-49 22q12 20 30 7M355 82l35-8 5 80q-5 45-45 58"/>',
 Art:'<rect x="250" y="75" width="140" height="125"/><path d="M265 175l32-38 30 25 22-19 26 32M292 200l-10 20m66-20l10 20"/><circle cx="350" cy="105" r="11"/>',
 Film:'<rect x="245" y="85" width="150" height="110" rx="7"/><path d="M275 85v110m90-110v110M245 110h30m-30 60h30m90-60h30m-30 60h30M307 115l30 25-30 25z"/>',
 Heritage:'<path d="M240 110l80-45 80 45zM252 200h136M245 215h150M270 120v70m32-70v70m36-70v70m32-70v70"/>',
 Oddities:'<path d="M280 210V85q40-35 80 0v125M310 210V115h30v95M250 210h140M320 45v-15m-65 35-15-15m145 15 15-15"/><circle cx="332" cy="160" r="3"/>',
 Music:'<path d="M280 180V80l100-20v100M280 100l100-20"/><ellipse cx="260" cy="180" rx="20" ry="14"/><ellipse cx="360" cy="160" rx="20" ry="14"/>',
 Comedy:'<path d="M265 90q55-30 110 0v55q-55 90-110 0zM285 115h12m47 0h12M292 145q28 28 56 0"/>',
 Theatre:'<path d="M220 65h200v150H220zM220 65q75 80 0 150M420 65q-75 80 0 150M280 215v-85q40-40 80 0v85"/>',
 Art:'<path d="M250 200V70h140v130zM265 175l35-40 30 20 30-40 20 60z"/><circle cx="290" cy="105" r="10"/>',
 Film:'<rect x="240" y="70" width="160" height="135" rx="8"/><path d="M265 70v135m110-135v135M240 100h25m-25 35h25m-25 35h25m110-70h25m-25 35h25m-25 35h25M300 110l45 28-45 28z"/>',
 Heritage:'<path d="M230 100l90-50 90 50zM240 205h160M250 190h140M260 110v70m40-70v70m40-70v70m40-70v70"/>',
 Oddities:'<path d="M320 55l24 58 61 24-61 24-24 58-24-58-61-24 61-24zM400 60v30m-15-15h30M235 185v30m-15-15h30"/>'
};
function illustration(e){const cat=categories[e.category]?e.category:'Oddities';return '<svg class="event-illustration" viewBox="0 0 640 280" role="img" aria-label="'+esc(cat+' illustration for '+e.title)+'"><rect width="640" height="280" fill="#263d36"/><circle cx="320" cy="137" r="113" fill="#ed8837" opacity=".13"/><g fill="none" stroke="#efb379" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">'+categories[cat]+'</g><path d="M30 250h580" stroke="#efb379" opacity=".3"/></svg>';}
function safeImage(u){try{const v=new URL(u,'https://scout.invalid/');return v.protocol==='https:'?u:''}catch{return ''}}
function html(e,options={}){const src=e.imageKind==='event'||e.imageKind==='venue'?safeImage(e.imageUrl):'';const fallback=(categories[e.category]?e.category:'Culture')+' illustration · event photo unavailable';const caption=e.imageCaption||(e.imageKind==='venue'?'Venue photo':'Organiser’s event image');const source=safeImage(e.imageSourceUrl);return '<figure class="event-media'+(src?' has-photo':'')+'"><div class="event-frame">'+illustration(e)+(src?'<img class="event-photo" src="'+esc(src)+'" alt="'+esc(e.imageAlt||e.title+' — event image')+'" width="640" height="360" loading="lazy" decoding="async" onload="this.closest(&quot;figure&quot;).classList.add(&quot;photo-loaded&quot;)" onerror="this.closest(\'figure\').classList.remove(\'has-photo\');this.remove()">':'')+'</div><figcaption><span class="media-fallback">'+esc(fallback)+'</span>'+(src?'<span class="media-credit">'+esc(caption)+(source&&!options.compact?' · <a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">'+esc(e.imageCredit||'Image source')+'</a>':e.imageCredit?' · '+esc(e.imageCredit):'')+'</span>':'')+'</figcaption></figure>';}
root.ScoutMedia={html};if(typeof module!=='undefined')module.exports=root.ScoutMedia;
})(typeof window!=='undefined'?window:globalThis);
