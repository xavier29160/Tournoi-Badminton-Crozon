/* V2 : données partagées, contexte tournoi/catégorie et extensions de la V3. */
const clone = value => JSON.parse(JSON.stringify(value));
const normal = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
const newId = () => 'id' + Date.now().toString(36) + uid();
const emptyCategory = (code, label) => ({id:newId(), code, label, pools:[{id:'A',name:'Poule A'}], teams:[],scores:{},brackets:{},settings:{mainQualifiers:2},matchStatus:{}});
const categoryTypes = {SH:'Simple hommes',SD:'Simple dames',DH:'Double hommes',DD:'Double dames',DM:'Double mixte'};
let workspace, directoryClub = null, directoryQuery = '';
function validateCategory(c) {
 if(!c || !Array.isArray(c.pools) || !Array.isArray(c.teams) || !c.scores || typeof c.scores !== 'object' || Array.isArray(c.scores)) throw Error('Catégorie incorrecte');
 const ids = new Set(), pools = new Set();
 for(const p of c.pools){if(!/^[a-zA-Z0-9_-]+$/.test(p.id)||pools.has(p.id)||typeof p.name!=='string')throw Error('Poule incorrecte');pools.add(p.id);}
 for(const t of c.teams){if(!/^[a-zA-Z0-9_-]+$/.test(t.id)||ids.has(t.id)||typeof t.name!=='string'||!pools.has(t.pool))throw Error('Équipe incorrecte');ids.add(t.id);}
 for(const [key,sets] of Object.entries(c.scores)){if(!Array.isArray(sets)||sets.length>3||!key.split('|').every(id=>ids.has(id)))throw Error('Score incorrect');for(const set of sets){if(!Array.isArray(set)||set.length!==2||!set.every(v=>v===''||v===null||Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<=99))throw Error('Points incorrects');}}
 c.brackets ||= {};
 if(typeof c.brackets!=='object'||Array.isArray(c.brackets))throw Error('Tableaux incorrects');
 for(const [type,br] of Object.entries(c.brackets)){
  if(!['main','consol'].includes(type)||typeof br.signature!=='string'||!Array.isArray(br.rounds)||br.rounds.length>12)throw Error('Tableau incorrect');
  for(let ri=0;ri<br.rounds.length;ri++){const round=br.rounds[ri];if(!Array.isArray(round)||round.length!==2**(br.rounds.length-ri-1))throw Error('Tour incorrect');for(const m of round){if(!m||![m.a,m.b,m.winner].every(id=>id===null||ids.has(id)))throw Error('Participant incorrect');if(m.scores&&(!Array.isArray(m.scores)||m.scores.length>3||!m.scores.every(set=>Array.isArray(set)&&set.length===2&&set.every(v=>v===''||Number.isInteger(Number(v))&&Number(v)>=0&&Number(v)<=99))))throw Error('Score de tableau incorrect');}}
 }
 c.settings ||= {mainQualifiers:2}; c.matchStatus ||= {};
 // Les anciennes sauvegardes ne contiennent pas de paramètres de catégorie.
 if(!Number.isInteger(c.settings.mainQualifiers)||c.settings.mainQualifiers<1||c.settings.mainQualifiers>8)c.settings.mainQualifiers=2;
 return c;
}
function fromLegacy(data) {
 const category=Object.assign(clone(validateCategory(data)),{id:newId(),code:'DM',label:categoryTypes.DM});
 const tournament={id:newId(),name:'Tournoi Crozon — 24 octobre 2026',categories:[category]};
 return {schemaVersion:2,tournaments:[tournament],players:[],teamHistory:[],activeTournament:tournament.id,activeCategory:category.id,theme:'light'};
}
function validateWorkspace(w){
 if(w?.schemaVersion!==2||!Array.isArray(w.tournaments)||!w.tournaments.length||!Array.isArray(w.players)||!Array.isArray(w.teamHistory))throw Error('Sauvegarde V2 incorrecte');
 const tids=new Set(),cids=new Set(),pids=new Set();
 for(const t of w.tournaments){if(typeof t.name!=='string'||!/^[a-zA-Z0-9_-]+$/.test(t.id)||tids.has(t.id)||!Array.isArray(t.categories)||!t.categories.length)throw Error('Tournoi incorrect');tids.add(t.id);for(const c of t.categories){validateCategory(c);if(!/^[a-zA-Z0-9_-]+$/.test(c.id)||cids.has(c.id)||!categoryTypes[c.code]||typeof c.label!=='string')throw Error('Catégorie incorrecte');cids.add(c.id);}}
 for(const p of w.players){if(typeof p.name!=='string'||typeof p.club!=='string'||!/^[a-zA-Z0-9_-]+$/.test(p.id)||pids.has(p.id))throw Error('Joueur incorrect');pids.add(p.id);}
 for(const h of w.teamHistory){if(!/^[a-zA-Z0-9_-]+$/.test(h.id)||!Array.isArray(h.playerIds)||h.playerIds.length<1||h.playerIds.length>2||!h.playerIds.every(id=>pids.has(id)))throw Error('Historique incorrect');}
 if(!['light','dark'].includes(w.theme))w.theme='light';
 return w;
}
let loadError = '';
try {
 const raw=localStorage.getItem(STORE);
 workspace=raw ? validateWorkspace(JSON.parse(raw)) : fromLegacy(JSON.parse(localStorage.getItem('crozon-tournoi-v2')||'null')||DEFAULT);
} catch(e) {workspace=fromLegacy(DEFAULT);loadError='Les données locales n’ont pas pu être lues. Elles sont conservées dans le stockage ; restaurez une sauvegarde avant de poursuivre. '+e.message;}
const activeTournament = () => workspace.tournaments.find(t=>t.id===workspace.activeTournament)||workspace.tournaments[0];
function selectContext(){const t=activeTournament();workspace.activeTournament=t.id;state=t.categories.find(c=>c.id===workspace.activeCategory)||t.categories[0];workspace.activeCategory=state.id;activePool=null;}
selectContext();
function ensurePlayer(name,club=''){
 name=name.trim();club=club.trim();if(!name)return null;
 let p=workspace.players.find(p=>normal(p.name)===normal(name)&&normal(p.club)===normal(club));
 if(!p){p={id:newId(),name,club};workspace.players.push(p);}return p;
}
function learnTeam(t){
 const parts=t.name.split('/').map(s=>s.trim()).filter(Boolean);if(parts.length>2)return;
 const players=parts.map(s=>{const m=s.match(/^(.*?)\s*\(([^()]*)\)\s*$/);return ensurePlayer(m?m[1]:s,m?m[2]:'');}).filter(Boolean);
 t.playerIds=players.map(p=>p.id);rememberTeam(t.playerIds);
}
function rememberTeam(ids){if(!ids?.length)return;const key=ids.slice().sort().join('|');if(!workspace.teamHistory.some(h=>h.playerIds.slice().sort().join('|')===key))workspace.teamHistory.push({id:newId(),playerIds:ids.slice()});}
for(const t of workspace.tournaments)for(const c of t.categories)for(const team of c.teams)learnTeam(team);
function persist(){if(loadError)return false;try{const old=localStorage.getItem(STORE);if(old===JSON.stringify(workspace))return true;if(old)localStorage.setItem(STORE+'-previous',old);localStorage.setItem(STORE,JSON.stringify(workspace));return true;}catch(e){alert('Enregistrement impossible. Exportez une sauvegarde JSON maintenant.');return false;}}
save = () => {
 const ids=new Set(state.teams.map(t=>t.id));
 for(const key of Object.keys(state.scores))if(!key.split('|').every(id=>ids.has(id)))delete state.scores[key];
 for(const key of Object.keys(state.matchStatus))if(!key.split('|').every(id=>ids.has(id)))delete state.matchStatus[key];
 for(const t of state.teams)learnTeam(t);
 // Recréer seulement les tableaux dont les participants/rangs ont changé.
 const q=qualifiers();for(const type of ['main','consol'])if(state.brackets[type]&&state.brackets[type].signature!==q[type].map(x=>x.id+':'+x.rank).join('|'))delete state.brackets[type];
 return persist();
};
function changeTournament(id){workspace.activeTournament=id;workspace.activeCategory=null;selectContext();save();render();}
function changeCategory(id){workspace.activeCategory=id;selectContext();save();render();}
function addTournament(){const name=prompt('Nom du nouveau tournoi :');if(!name?.trim())return;const c=emptyCategory('DM',categoryTypes.DM),t={id:newId(),name:name.trim(),categories:[c]};workspace.tournaments.push(t);changeTournament(t.id);}
function renameTournament(){const t=activeTournament(),n=prompt('Nom du tournoi :',t.name);if(n?.trim()){t.name=n.trim();save();render();}}
function deleteTournament(){if(workspace.tournaments.length===1){alert('Conservez au moins un tournoi.');return;}if(!confirm('Supprimer ce tournoi et tous ses résultats ? Les joueurs resteront dans le répertoire.'))return;workspace.tournaments=workspace.tournaments.filter(t=>t.id!==workspace.activeTournament);changeTournament(workspace.tournaments[0].id);}
function addCategory(){const code=prompt('Catégorie : SH, SD, DH, DD ou DM','DM')?.trim().toUpperCase();if(!categoryTypes[code])return;const t=activeTournament();if(t.categories.some(c=>c.code===code)){alert('Cette catégorie existe déjà dans ce tournoi.');return;}const c=emptyCategory(code,categoryTypes[code]);t.categories.push(c);changeCategory(c.id);}
function deleteCategory(){const t=activeTournament();if(t.categories.length===1){alert('Conservez au moins une catégorie.');return;}if(!confirm('Supprimer la catégorie active et tous ses résultats ?'))return;t.categories=t.categories.filter(c=>c.id!==state.id);changeCategory(t.categories[0].id);}
function setTheme(value){workspace.theme=value;document.documentElement.dataset.theme=value;persist();}
const originalRender=render;
render=function(){
 document.documentElement.dataset.theme=workspace.theme;
 if(view==='players'){
  $('nav').innerHTML='';renderDirectory();
 }else originalRender();
 const nav=$('nav');nav.insertAdjacentHTML('beforeend',`<button class="${view==='players'?'selected':''}" onclick="go('players')">♧ Répertoire joueurs</button>`);
 if(!$('context')){const box=document.createElement('section');box.id='context';box.className='card context';nav.before(box);}
 $('context').innerHTML=`<div class="flex"><label>Tournoi <select aria-label="Tournoi actif" onchange="changeTournament(this.value)">${workspace.tournaments.map(t=>`<option value="${t.id}" ${t.id===workspace.activeTournament?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><button onclick="addTournament()">＋ Tournoi</button><button onclick="renameTournament()">Renommer</button><button class="danger" onclick="deleteTournament()">Supprimer tournoi</button><label>Thème <select aria-label="Thème" onchange="setTheme(this.value)"><option value="light" ${workspace.theme==='light'?'selected':''}>Clair</option><option value="dark" ${workspace.theme==='dark'?'selected':''}>Sombre</option></select></label></div><div class="flex categories">${activeTournament().categories.map(c=>`<button class="${c.id===state.id?'selected':''}" onclick="changeCategory('${c.id}')">${esc(c.code)} · ${esc(c.label)}</button>`).join('')}<button onclick="addCategory()">＋ Catégorie</button><button class="danger" onclick="deleteCategory()">Supprimer catégorie</button></div><small>Données propres à la catégorie · Répertoire commun à tous les tournois</small>${loadError?`<p role="alert">${esc(loadError)}</p><button onclick="download(localStorage.getItem(STORE)||'', 'donnees-locales-a-recuperer.json','application/json')">Exporter les données brutes</button>`:''}`;
 if(['teams','matches','standings'].includes(view))decoratePools();
 if(view==='teams')$('app').insertAdjacentHTML('afterbegin',`<div class="notice">Catégorie ${esc(state.code)} : ${state.code.startsWith('S')?'1 joueur':'2 joueurs'} par équipe. Le répertoire conserve les joueurs et les anciennes associations.</div>`);
};
function decoratePools(){
 const cards=[...$('app').querySelectorAll(':scope > section.card')].slice(1);
 if(activePool&&!state.pools.some(p=>p.id===activePool))activePool=null;
 const buttons=`<div class="actions poolnav"><button class="${!activePool?'selected':''}" onclick="choosePool(null)">Toutes les poules</button>${state.pools.map(p=>`<button class="${p.id===activePool?'selected':''}" onclick="choosePool('${p.id}')">${esc(p.name)}</button>`).join('')}</div>`;
 $('app').insertAdjacentHTML('afterbegin',buttons);
 cards.forEach((card,i)=>{const p=state.pools[i];if(!p)return;card.hidden=!!activePool&&p.id!==activePool;
 if(view==='matches'){
  const pairs=schedule(poolTeams(p.id).map(t=>t.id));const done=pairs.filter(([a,b])=>scoreStats(a,b).done).length;
  card.insertAdjacentHTML('afterbegin',`<progress max="${pairs.length||1}" value="${done}" aria-label="Progression ${esc(p.name)}"></progress>`);
  [...card.querySelectorAll('.match')].forEach((el,j)=>{if(el.dataset.sportMatch)return;const [a,b]=pairs[j],key=pairKey(a,b),s=scoreStats(a,b),status=s.done?'Terminé':state.matchStatus[key]==='playing'?'En cours':(state.scores[key]||[]).some(set=>set?.some(x=>x!==''&&x!==null))?'Score en cours':'À jouer';el.insertAdjacentHTML('beforeend',`<div class="flex"><span class="pill">${status}</span>${!s.done?`<button onclick="toggleMatch('${a}','${b}')">${state.matchStatus[key]==='playing'?'Remettre à jouer':'Démarrer le match'}</button>`:''}</div>`);});
 }
 });
}
function choosePool(id){activePool=id;render();if(id){const title=document.querySelector('#app > section.card:not([hidden]) .pool-heading');if(title)title.scrollIntoView({block:'start'});}}
function toggleMatch(a,b){const key=pairKey(a,b);state.matchStatus[key]=state.matchStatus[key]==='playing'?'pending':'playing';save();render();}
window.appBack=()=>{if(view!=='home'){go('home');return true;}return false;};
function formatPlayer(p){return p.name+(p.club?' ('+p.club+')':'');}
function directoryMatches(q){return workspace.players.filter(p=>!q||normal(p.name+' '+p.club).includes(normal(q))).sort((a,b)=>a.name.localeCompare(b.name,'fr'));}
function teamHistoryMatches(q,count){return workspace.teamHistory.filter(h=>h.playerIds.length===count&&h.playerIds.some(id=>{const p=workspace.players.find(p=>p.id===id);return p&&normal(p.name+' '+p.club).includes(normal(q));}));}
function renderDirectory(){
 const clubs=[...new Set(workspace.players.map(p=>p.club||'Sans club'))].sort((a,b)=>a.localeCompare(b,'fr'));
 $('app').innerHTML=`<section class="card"><h2>Répertoire permanent</h2><p>${workspace.players.length} joueurs · ${workspace.teamHistory.length} anciennes équipes</p><input id="playerSearch" aria-label="Rechercher un joueur ou un club" placeholder="Rechercher un prénom, un nom ou un club" value="${esc(directoryQuery)}" oninput="directoryQuery=this.value;updateDirectoryList()"><button onclick="editPlayer()">＋ Enregistrer un joueur</button><div class="actions"><button onclick="filterClub(null)">Tous les clubs</button>${clubs.map((club,i)=>`<button data-club-index="${i}" class="${directoryClub===club?'selected':''}">${esc(club)}</button>`).join('')}</div><div id="directoryList"></div></section><div class="actions"><button onclick="go('home')">Retour à l’accueil</button></div>`;
 $('app').querySelectorAll('[data-club-index]').forEach(b=>b.onclick=()=>filterClub(clubs[Number(b.dataset.clubIndex)]));updateDirectoryList();
}
function filterClub(club){directoryClub=club;render();}
function updateDirectoryList(){const matches=directoryMatches(directoryQuery).filter(p=>!directoryClub||(p.club||'Sans club')===directoryClub);$('directoryList').innerHTML=matches.map(p=>`<div class="directoryrow"><span><strong>${esc(p.name)}</strong><small>${esc(p.club||'Sans club')}</small></span><button onclick="editPlayer('${p.id}')">Modifier</button></div>`).join('')||'<p>Aucun joueur trouvé.</p>';}
function editPlayer(id){const p=workspace.players.find(p=>p.id===id);const n=prompt('Prénom et nom du joueur :',p?.name||'');if(!n?.trim())return;const club=prompt('Club :',p?.club||'');if(club===null)return;
 if(p){if(workspace.players.some(q=>q.id!==id&&normal(q.name)===normal(n)&&normal(q.club)===normal(club))){alert('Ce joueur existe déjà.');return;}p.name=n.trim();p.club=club.trim();for(const t of workspace.tournaments)for(const c of t.categories)for(const team of c.teams)if(team.playerIds?.includes(id))team.name=team.playerIds.map(pid=>formatPlayer(workspace.players.find(x=>x.id===pid))).join(' / ');persist();}else{ensurePlayer(n,club);persist();}render();}
addTeam=function(){if(!state.pools.length){alert('Créez d’abord une poule.');return;}const count=state.code.startsWith('S')?1:2;
 $('app').innerHTML=`<section class="card"><h2>Ajouter ${count===1?'un joueur':'une équipe'}</h2><label>Retrouver une ancienne équipe <input id="historyQuery" placeholder="Première lettre d’un prénom ou d’un club" oninput="suggestHistory()"></label><div id="historySuggestions"></div><form onsubmit="event.preventDefault();submitTeam()">${Array.from({length:count},(_,i)=>`<h3>Joueur ${i+1}</h3><label>Prénom et nom <input id="newPlayer${i}" list="suggestPlayers" required autocomplete="off" oninput="suggestPlayers(this)"></label><label>Club <input id="newClub${i}" list="suggestClubs"></label>`).join('')}<datalist id="suggestPlayers"></datalist><datalist id="suggestClubs">${[...new Set(workspace.players.map(p=>p.club).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('')}</datalist><p><label>Poule <select id="newPool">${state.pools.map(p=>`<option value="${p.id}" ${p.id===activePool?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label></p><div class="actions"><button type="submit" class="primary">Enregistrer</button><button type="button" onclick="go('teams')">Annuler</button></div></form></section>`;
};
function suggestPlayers(input){if($('historyQuery')){$('historyQuery').value=input.value;suggestHistory();}const ps=directoryMatches(input.value).slice(0,30);$('suggestPlayers').innerHTML=ps.map(p=>`<option value="${esc(formatPlayer(p))}">`).join('');const found=workspace.players.find(p=>normal(formatPlayer(p))===normal(input.value));if(found){const i=input.id.replace('newPlayer','');$('newClub'+i).value=found.club;}}
function suggestHistory(){const q=$('historyQuery').value.trim(),count=state.code.startsWith('S')?1:2;$('historySuggestions').innerHTML=q?teamHistoryMatches(q,count).slice(0,20).map(h=>`<button type="button" onclick="selectHistory('${h.id}')">${h.playerIds.map(id=>esc(formatPlayer(workspace.players.find(p=>p.id===id)))).join(' / ')}</button>`).join(''):'';}
function selectHistory(id){const h=workspace.teamHistory.find(h=>h.id===id);h.playerIds.forEach((id,i)=>{const p=workspace.players.find(p=>p.id===id);$('newPlayer'+i).value=p.name;$('newClub'+i).value=p.club;});}
function submitTeam(){const count=state.code.startsWith('S')?1:2,entries=[];for(let i=0;i<count;i++){let name=$('newPlayer'+i).value.trim(),club=$('newClub'+i).value.trim();const found=workspace.players.find(p=>normal(formatPlayer(p))===normal(name));if(found){name=found.name;if(!club)club=found.club;}if(!name)return;entries.push({name,club});}
 if(count===2&&normal(entries[0].name)===normal(entries[1].name)&&normal(entries[0].club)===normal(entries[1].club)){alert('Sélectionnez deux joueurs différents.');return;}
 const ps=entries.map(p=>ensurePlayer(p.name,p.club)),ids=ps.map(p=>p.id);
 if(state.teams.some(t=>t.playerIds?.slice().sort().join('|')===ids.slice().sort().join('|'))){alert('Cette équipe est déjà inscrite dans la catégorie.');return;}
 state.teams.push({id:newId(),pool:$('newPool').value,name:ps.map(formatPlayer).join(' / '),playerIds:ids});rememberTeam(ids);state.brackets={};save();go('teams');
}
// Match au meilleur de trois sets, sans imposer de cible de points (format conservé).
scoreStats=function(a,b){let vals=state.scores[pairKey(a,b)]||[];if(a!==pairKey(a,b).split('|')[0])vals=vals.map(v=>v?[v[1],v[0]]:v);let sa=0,sb=0,pa=0,pb=0,invalid=false,gap=false,finished=false;
 for(let i=0;i<3;i++){const v=vals[i]||['',''],blank=v.every(x=>x===''||x===null||x===undefined);if(blank){gap=true;continue;}if(finished||gap){invalid=true;continue;}if(v.some(x=>x===''||x===null||x===undefined)){gap=true;continue;}const x=Number(v[0]),y=Number(v[1]);if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>99||y>99||x===y){invalid=true;continue;}pa+=x;pb+=y;x>y?sa++:sb++;finished=sa===2||sb===2;
 }return {done:finished&&!invalid,sa,sb,pa,pb,invalid,winner:finished&&!invalid?(sa===2?a:b):null};
};
// Les scores de tableaux ne sont effacés que si la qualification change.
setScore=function(a,b,i,side,v){const key=pairKey(a,b),vals=state.scores[key]||[['',''],['',''],['','']];while(vals.length<3)vals.push(['','']);vals[i][a===key.split('|')[0]?side:1-side]=v;state.scores[key]=vals;save();render();};
qualifiers=function(){const main=[],consol=[];for(const p of state.pools)standings(p.id).forEach((r,i)=>(i<state.settings.mainQualifiers?main:consol).push({id:r.id,pool:p.id,rank:i+1}));return {main,consol};};
const originalStandings=renderStandings;
renderStandings=function(){originalStandings();$('app').querySelectorAll('tbody').forEach(body=>[...body.rows].forEach((r,i)=>r.cells[r.cells.length-1].textContent=i<state.settings.mainQualifiers?'Principal':'Consolante'));};
propagate=function(br){for(let r=0;r<br.rounds.length;r++)for(let i=0;i<br.rounds[r].length;i++){const m=br.rounds[r][i],oldA=m.a,oldB=m.b;let ready=true;if(r>0){const left=br.rounds[r-1][i*2],right=br.rounds[r-1][i*2+1];m.a=left.winner;m.b=right.winner;ready=left.resolved&&right.resolved;}if(m.a!==oldA||m.b!==oldB){m.winner=null;delete m.scores;}if(!ready){m.winner=null;m.resolved=false;}else if(!m.a||!m.b){m.winner=m.a||m.b||null;m.resolved=true;}else{if(m.winner!==m.a&&m.winner!==m.b)m.winner=null;m.resolved=!!m.winner;}}};
swapSeed=function(type,index,side,id){const br=state.brackets[type],m=br.rounds[0][index],old=m[side];if(id){for(let i=0;i<br.rounds[0].length;i++)for(const s of ['a','b'])if((i!==index||s!==side)&&br.rounds[0][i][s]===id)br.rounds[0][i][s]=old;}m[side]=id||null;for(const round of br.rounds)for(const match of round){match.winner=null;delete match.scores;}propagate(br);save();render();};
const originalFinals=renderFinals;
renderFinals=function(){originalFinals();const notice=$('app').querySelector('.notice');notice.textContent=(state.pools.length&&state.pools.every(p=>completedPool(p.id))?'Toutes les poules sont terminées.':'Qualifications provisoires : des poules sont encore en cours.')+' Les '+state.settings.mainQualifiers+' premiers de chaque poule vont en principal, les autres en consolante. Exemptions automatiques.';
 $('app').querySelector('section').insertAdjacentHTML('beforeend',`<label>Qualifiés en principal par poule <select onchange="changeQualifiers(this.value)">${Array.from({length:8},(_,i)=>`<option ${state.settings.mainQualifiers===i+1?'selected':''}>${i+1}</option>`).join('')}</select></label>`);
 const cards=[...$('app').querySelectorAll(':scope > section')].slice(1);['main','consol'].forEach((type,index)=>{const br=state.brackets[type];const ties=cards[index].querySelectorAll('.tie');let n=0;for(let r=0;r<br.rounds.length;r++)for(let i=0;i<br.rounds[r].length;i++){const m=br.rounds[r][i],tie=ties[n++];if(m.a&&m.b)tie.insertAdjacentHTML('beforeend',`<button onclick="openFinalScore('${type}',${r},${i})">${m.scores?'Modifier le score':'Saisir le score'}</button>${m.scores?`<div>${m.scores.filter(v=>v[0]!==''&&v[1]!=='').map(v=>v.map(esc).join('–')).join(' / ')}</div>`:''}`);}
 const champion=br.rounds.at(-1)?.[0]?.winner;if(champion)cards[index].insertAdjacentHTML('beforeend',`<p class="winner">🏆 ${esc(name(champion))}</p>`);});save();
};
function changeQualifiers(v){if(Object.keys(state.brackets).length&&!confirm('Recréer les tableaux avec ce nombre de qualifiés ?')){render();return;}state.settings.mainQualifiers=Number(v);state.brackets={};save();render();}
function openFinalScore(type,r,i){const m=state.brackets[type].rounds[r][i];$('app').innerHTML=`<section class="card"><h2>Score — ${esc(name(m.a))} / ${esc(name(m.b))}</h2><form onsubmit="event.preventDefault();submitFinalScore('${type}',${r},${i})">${Array.from({length:3},(_,s)=>`<p class="set">Set ${s+1} <input aria-label="Équipe A set ${s+1}" id="fa${s}" type="number" min="0" max="99" value="${esc(m.scores?.[s]?.[0]??'')}"> – <input aria-label="Équipe B set ${s+1}" id="fb${s}" type="number" min="0" max="99" value="${esc(m.scores?.[s]?.[1]??'')}"></p>`).join('')}<button class="primary">Valider et qualifier le vainqueur</button><button type="button" onclick="go('finals')">Annuler</button></form></section>`;}
function submitFinalScore(type,r,i){const br=state.brackets[type],m=br.rounds[r][i],scores=Array.from({length:3},(_,s)=>[$('fa'+s).value,$('fb'+s).value]);const key=pairKey(m.a,m.b),old=state.scores[key];state.scores[key]=m.a===key.split('|')[0]?scores:scores.map(v=>[v[1],v[0]]);const result=scoreStats(m.a,m.b);if(old===undefined)delete state.scores[key];else state.scores[key]=old;if(!result.done){alert('Saisissez deux sets gagnants, dans l’ordre. Le troisième set doit rester vide après un 2–0.');return;}m.scores=scores;m.winner=result.winner;propagate(br);save();go('finals');}
bracketWinner=function(type,r,i,id){const br=state.brackets[type],m=br.rounds[r][i];if(id&&id!==m.a&&id!==m.b)return;delete m.scores;m.winner=id||null;propagate(br);save();render();};
backup=function(){workspace.savedAt=new Date().toISOString();download(JSON.stringify(workspace,null,2),'tournoi-crozon-v2-'+new Date().toISOString().slice(0,10)+'.json','application/json');};
restore=function(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{let next;try{const data=JSON.parse(reader.result);next=data.schemaVersion===2?validateWorkspace(data):fromLegacy(data);}catch(e){alert('Sauvegarde invalide : '+e.message);return;}if(!confirm('Remplacer tous les tournois et le répertoire par cette sauvegarde ? Exportez vos données actuelles avant de continuer.'))return;workspace=next;loadError='';selectContext();for(const t of workspace.tournaments)for(const c of t.categories)for(const team of c.teams)learnTeam(team);save();render();alert('Sauvegarde restaurée.');};reader.onerror=()=>alert('Lecture du fichier impossible.');reader.readAsText(file);};
function restorePrevious(){const raw=localStorage.getItem(STORE+'-previous');if(!raw){alert('Aucune copie précédente disponible.');return;}let next;try{next=validateWorkspace(JSON.parse(raw));}catch(e){alert('Copie précédente invalide.');return;}if(!confirm('Revenir à la copie locale précédente ?'))return;workspace=next;loadError='';selectContext();save();render();}
const originalBackup=renderBackup;
renderBackup=function(){originalBackup();$('app').querySelector('button.danger').textContent='Réinitialiser la catégorie active';$('app').querySelector('h2').textContent='Sauvegardes de tous les tournois';$('app').querySelector('p').textContent='Enregistrement automatique sur cet appareil : tournois, catégories, scores, tableaux, joueurs, clubs et anciennes équipes. Exportez le JSON pour une copie indépendante ou un transfert.';$('app').insertAdjacentHTML('beforeend',`<section class="card"><h2>Récupération locale</h2><p>Une copie de l’état précédent est conservée sur cet appareil. La V1 utilise un stockage séparé ; importez son JSON pour reprendre ses résultats dans la V2.</p><button onclick="restorePrevious()">Revenir à la sauvegarde locale précédente</button></section>`);};
resetAll=function(){if(!confirm('Réinitialiser uniquement la catégorie active ? Les 18 équipes initiales seront reprises pour le DM. Le répertoire et les autres catégories sont conservés.'))return;const {id,code,label}=state;Object.assign(state,code==='DM'?clone(DEFAULT):emptyCategory(code,label),{id,code,label,matchStatus:{}});save();render();};
if(!loadError)save();
render();
