function openPoolPrintOptions(poolId){
 const pool=state.pools.find(p=>p.id===poolId);if(!pool)return;
 document.getElementById('poolPrintChoice')?.remove();
 const dialog=document.createElement('dialog');dialog.id='poolPrintChoice';dialog.className='no-print';
 dialog.innerHTML=`<h2>Imprimer ${esc(pool.name)}</h2><p>Choisis le contenu de la feuille.</p><button id="printChoiceBlank" class="primary">Feuille vierge</button><button id="printChoiceResults">Avec les scores</button><button id="printChoiceCancel" class="text-button">Annuler</button>`;
 const select=mode=>{if(dialog.close)dialog.close();dialog.remove();printPoolSheets(poolId,mode);};
 dialog.querySelector('#printChoiceBlank').onclick=()=>select('blank');dialog.querySelector('#printChoiceResults').onclick=()=>select('results');dialog.querySelector('#printChoiceCancel').onclick=()=>dialog.remove();
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.remove();});
 document.body.append(dialog);if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
}
function printDisplayedPool(){
 if(['teams','matches','standings'].includes(view)&&activePool){openPoolPrintOptions(activePool);return;}
 openPoolPrinting();
}
function addDirectPoolPrintButtons(){
 const cards=[...$('app').querySelectorAll(':scope > section.card')].slice(1);
 cards.forEach((card,i)=>{
  const pool=state.pools[i],title=card.querySelector('h2');if(!pool||!title)return;
  let heading=title.parentElement;
  if(heading===card){heading=document.createElement('div');title.before(heading);heading.append(title);}
  heading.classList.add('pool-heading');
  const button=document.createElement('button');button.type='button';button.className='primary pool-print-direct no-print';
  button.dataset.printPool=pool.id;button.textContent='Imprimer';button.setAttribute('aria-label','Imprimer '+pool.name);
  button.onclick=()=>openPoolPrintOptions(pool.id);heading.append(button);
 });
}
function openPoolPrinting(){go('printing');window.scrollTo(0,0);}
function renderPoolPrinting(){$('app').innerHTML='';addPoolPrintControls();}
/* Feuilles autonomes : équipes, rencontres et classement sur une page par poule. */
function addPoolPrintControls(){
 const section=document.createElement('div');section.className='card no-print';section.id='poolPrintControls';
 section.innerHTML=`<h2>Imprimer les feuilles de poules</h2><p>Une page A4 par poule : équipes, matchs, scores et classement. À afficher ou à laisser sur le terrain.</p><label>Poule <select id="printPool" aria-label="Poule à imprimer"><option value="">Toutes les poules</option>${state.pools.map(p=>`<option value="${esc(p.id)}" ${activePool===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label> <label>Contenu <select id="printMode" aria-label="Contenu des feuilles"><option value="results">Avec les résultats actuels</option><option value="blank">Feuilles vierges à remplir</option></select></label><div class="actions"><button class="primary" onclick="printPoolSheets(document.getElementById('printPool').value,document.getElementById('printMode').value)">🖨️ Imprimer les feuilles</button></div>`;
 $('app').prepend(section);
}
function buildPoolPrintHtml(poolId='',mode='results'){
 const pools=state.pools.filter(p=>!poolId||p.id===poolId),blank=mode==='blank';
 if(!pools.length)throw Error('Aucune poule à imprimer.');
 const pages=pools.map(p=>{
  const teams=poolTeams(p.id),pairs=schedule(teams.map(t=>t.id)),number=Object.fromEntries(teams.map((t,i)=>[t.id,i+1]));
  const done=pairs.filter(([a,b])=>scoreStats(a,b).done).length;
  const teamRows=teams.map((t,i)=>`<tr><td class="num">${i+1}</td><td>${esc(t.name)}</td></tr>`).join('');
  const matches=pairs.map(([a,b])=>{
   let vals=blank?[]:(state.scores[pairKey(a,b)]||[]);if(a!==pairKey(a,b).split('|')[0])vals=vals.map(v=>v?[v[1],v[0]]:v);
   const stats=scoreStats(a,b),score=j=>`<td class="score">${esc(vals[j]?.[0]??'')} <span>–</span> ${esc(vals[j]?.[1]??'')}</td>`;
   return `<tr><td class="pair">${number[a]} contre ${number[b]}</td>${[0,1,2].map(score).join('')}<td class="num">${!blank&&stats.done?number[stats.winner]:''}</td></tr>`;
  }).join('');
  const rows=blank?teams.map(t=>({id:t.id,name:t.name})):standings(p.id);
  const standingsRows=rows.map((r,i)=>`<tr><td class="num">${blank?'':i+1}</td><td>${esc(r.name)}</td>${['m','w','l','sg','sp','ds','pm','pe','dp'].map(k=>`<td class="num">${blank?'':r[k]}</td>`).join('')}</tr>`).join('');
  return `<section class="sheet"><div class="sheet-content"><div class="brand">PRESQU’ÎLE CROZON BADMINTON</div><h1>${esc(p.name)} <span>· ${esc(state.code)}</span></h1><div class="meta">${esc(activeTournament().name)}<br>${esc(state.label)} · ${teams.length} équipes · ${pairs.length} matchs</div><div class="terrain">Terrain : ................................ &nbsp; Responsable : ................................</div><h2>ÉQUIPES</h2><table><thead><tr><th>N° équipe</th><th>Joueurs / clubs</th></tr></thead><tbody>${teamRows}</tbody></table><h2>RENCONTRES DE POULE</h2><table class="matches"><colgroup><col style="width:28%"><col style="width:18%"><col style="width:18%"><col style="width:18%"><col style="width:18%"></colgroup><thead><tr><th>Équipes</th><th>Set 1</th><th>Set 2</th><th>Set 3</th><th>N° gagnant</th></tr></thead><tbody>${matches||'<tr><td colspan="5">Au moins deux équipes sont nécessaires pour créer des matchs.</td></tr>'}</tbody></table><h2>CLASSEMENT ${blank?'À REPORTER':pairs.length&&done===pairs.length?'FINAL':'PROVISOIRE'}</h2><table class="rankings"><thead><tr><th>Rang</th><th>Équipe</th><th>MJ</th><th>V</th><th>D</th><th>SG</th><th>SP</th><th>ΔS</th><th>PM</th><th>PE</th><th>ΔP</th></tr></thead><tbody>${standingsRows}</tbody></table><p class="legend">MJ : matchs joués · V/D : victoires/défaites · SG/SP : sets gagnés/perdus<br>ΔS : différence de sets · PM/PE : points marqués/encaissés · ΔP : différence de points</p><p class="footnote">${blank?'Feuille à remplir à la main. Les équipes et les rencontres sont conservées.':`${done}/${pairs.length} matchs terminés. Classement calculé par l’application ; les matchs incomplets n’y sont pas comptés.`}<br>Deux sets gagnants : laisser le troisième set vide après un 2–0.</p></div></section>`;
 }).join('');
 return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Feuilles de poules — ${esc(activeTournament().name)}</title><style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:white;color:#111;font:11px Arial,sans-serif}.sheet{width:190mm;height:276mm;overflow:hidden;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}.sheet-content{width:190mm;transform-origin:top center;padding:1mm}.brand{font-size:9px;font-weight:bold;letter-spacing:1.4px;border-bottom:2px solid #111;padding-bottom:5px}h1{font-size:32px;margin:10px 0 6px}h1 span{font-size:16px}.meta{line-height:1.5}.terrain{border:1px solid #777;padding:7px;margin:9px 0}h2{font-size:13px;letter-spacing:.8px;margin:15px 0 7px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #888;padding:7px 6px;text-align:left;overflow-wrap:anywhere}th{background:#eee;font-size:9px}table:not(.matches):not(.rankings) th:first-child{width:12%}.num,.score{text-align:center}.score{font-size:12px;white-space:nowrap}.score span{margin:0 3px}.matches td{height:32px;padding:6px 5px}.matches th,.pair{text-align:center}.pair{font-size:16px}.against{color:#555;font-size:9px}.rankings th:nth-child(1){width:6%}.rankings th:nth-child(2){width:48%}.rankings th{text-align:center}.rankings td{height:31px;padding:6px 3px;font-size:10px}.rankings th{font-size:9px;padding:7px 2px}.legend,.footnote{font-size:8px;line-height:1.5;margin:6px 0}.footnote{border-top:1px solid #777;padding-top:5px}@media screen{body{background:#ddd}.sheet{background:white;margin:12px auto;box-shadow:0 1px 6px #777}}</style></head><body>${pages}<script>function fitSheets(){document.querySelectorAll('.sheet').forEach(function(page){var content=page.firstElementChild;content.style.transform='none';var ratio=Math.min(1,(page.clientHeight-2)/content.scrollHeight);content.style.transform='scale('+ratio+')';});}window.addEventListener('load',fitSheets);window.addEventListener('beforeprint',fitSheets);</`+`script></body></html>`;
}
function printPoolSheets(poolId='',mode='results'){
 let html;try{html=buildPoolPrintHtml(poolId,mode);}catch(e){alert(e.message);return;}
 if(window.AndroidExport?.printHtml){AndroidExport.printHtml(html);return;}
 const popup=window.open('','_blank');if(!popup){alert('Autorisez l’ouverture de la fenêtre d’impression.');return;}
 popup.document.open();popup.document.write(html);popup.document.close();popup.onload=()=>{popup.fitSheets();popup.print();};
}
