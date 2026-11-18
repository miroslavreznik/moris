const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const base = (process.env.MORIS_TEST_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const production = process.env.MORIS_PRODUCTION_TEST_URL?.replace(/\/$/, '');
const output = path.resolve('test-results');
const lines = ['classic', 'zoology', 'origami', 'botanic'];
const thresholds = [0, 30, 100, 250, 700, 1200, 2000];
const labDatabase = 'moris-evolution-lab-v1';
const metadataModule = new URL('src/evolution.ts', `${base}/`).href;
const nav = (page, name) => page.locator('.bottom-nav').getByRole('button', { name, exact: true }).click();
const saved = page => page.locator('.workspace-footer').getByText('SAVED ON THIS DEVICE', { exact: true }).waitFor();
const portrait = page => page.locator('.evolution-portrait .moris-art');
let browser;

async function identity(svg) {
  return svg.evaluate(element => {
    const body = element.querySelector('.moris-body'), face = element.querySelector('.moris-face'), smile = element.querySelector('.moris-smile');
    const faceToBody = body.getCTM().inverse().multiply(face.getCTM()), frame = element.querySelector('.moris-character').getCTM();
    const angle = -7 * Math.PI / 180, points = [[102, 91]];
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2, x = 26.5 * Math.cos(a), y = 33.5 * Math.sin(a);
      points.push([102 + x * Math.cos(angle) - y * Math.sin(angle), 91 + x * Math.sin(angle) + y * Math.cos(angle)]);
    }
    const happy = smile.getAttribute('d').startsWith('M91');
    const [sx, sy, cx, cy, ex, ey] = happy ? [91, 129, 104, 144, 119, 127] : [95, 131, 105, 139, 115, 129];
    for (let i = 0; i <= 32; i++) { const t = i / 32, u = 1 - t; points.push([u*u*sx+2*u*t*cx+t*t*ex, u*u*sy+2*u*t*cy+t*t*ey]); }
    const ids = Array.from(element.querySelectorAll('[id]'), item => item.id);
    const references = Array.from(element.querySelectorAll('*')).flatMap(node => Array.from(node.attributes).flatMap(attribute => Array.from(attribute.value.matchAll(/url\(\s*["']?#([^\s)"']+)["']?\s*\)/g), match => match[1])));
    const useReferences = Array.from(element.querySelectorAll('use'), item => item.getAttribute('href'));
    const clipping = Array.from(element.querySelectorAll('path,circle,ellipse,rect,line,polygon,polyline')).flatMap(shape => {
      if (shape.closest('defs,mask,clipPath,.moris-holo')) return [];
      for (let ancestor = shape; ancestor && ancestor !== element; ancestor = ancestor.parentElement) if (getComputedStyle(ancestor).clipPath !== 'none') return [];
      const style = getComputedStyle(shape);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || style.fill === 'none' && style.stroke === 'none') return [];
      const box = shape.getBBox(), matrix = frame.inverse().multiply(shape.getCTM());
      const corners = [[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]].map(([x,y]) => new DOMPoint(x,y).matrixTransform(matrix));
      const half = style.stroke !== 'none' ? parseFloat(style.strokeWidth)/2 : 0, dx=half*Math.hypot(matrix.a,matrix.c), dy=half*Math.hypot(matrix.b,matrix.d);
      const left=Math.min(...corners.map(point=>point.x))-dx, right=Math.max(...corners.map(point=>point.x))+dx, top=Math.min(...corners.map(point=>point.y))-dy, bottom=Math.max(...corners.map(point=>point.y))+dy;
      return left < -.05 || top < -.05 || right > 200.05 || bottom > 200.05 ? [{left,right,top,bottom,part:shape.classList.value||shape.tagName}] : [];
    });
    return {
      stage:Number(element.dataset.stage), line:element.dataset.branch, fixedLine:element.querySelector('.moris-fixed-form')?.dataset.line,
      bodyCount:element.querySelectorAll('.moris-body').length, body:body.getAttribute('d'),
      classicFaceCount:element.querySelectorAll('.moris-face[data-moris-identity="classic-face"]').length,
      eyeOutline:element.querySelector('.moris-eye > ellipse').outerHTML, smile:smile.getAttribute('d'),
      faceInside:points.every(([x,y]) => body.isPointInFill(new DOMPoint(x,y).matrixTransform(faceToBody))),
      unresolved:references.filter(id=>!ids.includes(id)).concat(useReferences.filter(ref=>!ref?.startsWith('#')||!ids.includes(ref.slice(1)))),
      clipping, holo:element.querySelectorAll('.moris-holo').length, finish:element.dataset.finish,
      geometry:Array.from(element.querySelector('.moris-authored-body').querySelectorAll('path,circle,ellipse,polygon'), item=>`${item.getAttribute('d')||''}|${item.getAttribute('transform')||''}|${item.getAttribute('cx')||''}`).join(';'),
    };
  });
}
function assertArt(actual, original, line, stage) {
  assert.equal(actual.stage, stage); assert.equal(actual.line, line); assert.equal(actual.fixedLine, line);
  assert.equal(actual.bodyCount, 1, `${line}/${stage} has one actual body around its face`);
  assert.equal(actual.classicFaceCount, 1); assert.equal(actual.eyeOutline, original.eyeOutline, 'the original eye geometry is shared by every line');
  assert(['M95 131q10 8 20-2','M91 129q13 15 28-2'].includes(actual.smile));
  assert.equal(actual.faceInside, true, `${line}/${stage}: the complete original eye and smile fit the authored body`);
  assert.deepEqual(actual.unresolved, [], `${line}/${stage}: local paint and mask references resolve`);
  assert.deepEqual(actual.clipping, [], `${line}/${stage}: visible anatomy and strokes fit the 200px drawing area`);
  assert.equal(actual.holo, stage === 6 ? 1 : 0); assert.equal(actual.finish, stage === 6 ? 'holographic' : 'standard');
}
async function records(page, database, store) {
  return page.evaluate(({database,store})=>new Promise((resolve,reject)=>{
    const open=indexedDB.open(database);open.onerror=()=>reject(open.error);open.onsuccess=()=>{
      const db=open.result,tx=db.transaction(store,'readonly'),get=tx.objectStore(store).getAll();get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);tx.oncomplete=()=>db.close();
    };
  }),{database,store});
}
async function allRecords(page,database){const stores=['habits','revisions','completions','plans','meta'];return Object.fromEntries(await Promise.all(stores.map(async store=>[store,await records(page,database,store)])));}
async function config(page){return (await records(page,labDatabase,'meta')).find(row=>row.key==='config').value.settings;}
async function exportBackup(page,filename){await nav(page,'Settings');await saved(page);const event=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:true}).click();const download=await event,file=path.join(output,filename);await download.saveAs(file);return JSON.parse(await readFile(file));}
async function restoreBackup(page,backup,filename){await nav(page,'Settings');await page.getByLabel('Choose Moris backup file',{exact:true}).setInputFiles({name:filename,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});const event=page.waitForEvent('download');await page.getByRole('button',{name:'Back up & replace records',exact:true}).click();await event;await page.getByRole('dialog').waitFor({state:'hidden'});await saved(page);}
async function closeCelebration(page){await page.getByRole('dialog').getByRole('button',{name:'Keep showing up',exact:true}).click();await saved(page);}

(async()=>{
  await mkdir(output,{recursive:true});
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:process.env.MORIS_BROWSER||'msedge'}:{})});
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Budapest',acceptDownloads:true});
  const errors=[];context.on('page',page=>{page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));});
  const normal=await context.newPage();await normal.goto(base);
  assert.equal(await normal.locator('.evolution-lab').count(),0);
  await normal.getByRole('checkbox',{name:'Read a few pages',exact:true}).check();await normal.getByRole('button',{name:"Let's begin with 1",exact:true}).click();
  await normal.getByRole('button',{name:'Complete Read a few pages today',exact:true}).click();await saved(normal);
  await normal.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('moris');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('meta','readwrite');tx.objectStore('meta').put({key:'reminder-device',value:{id:'normal-isolation-sentinel',token:'synthetic-normal-only-token',enabled:false,version:0,pendingSync:false}});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
  const normalBefore=await allRecords(normal,'moris');
  const lab=await context.newPage(),reminderRequests=[];lab.on('request',request=>{if(/reminders\/(config|subscription|test)/.test(request.url()))reminderRequests.push(request.url());});
  await lab.goto(`${base}/?evolutionLab=1`);const controls=lab.getByRole('region',{name:'Local evolution lab',exact:true});await controls.waitFor();
  assert.equal(await controls.locator('[data-lab-line]').count(),4);
  const stageNames=await lab.evaluate(async moduleUrl=>{
    const {evolutionLabel}=await import(moduleUrl);
    return Object.fromEntries(['classic','zoology','origami','botanic'].map(line=>[line,Array.from({length:7},(_,stage)=>evolutionLabel(stage,line))]));
  },metadataModule);
  async function assertCardNames(stage){
    for(const line of lines){
      const card=controls.locator(`[data-lab-line="${line}"]`);
      assert.equal((await card.locator('h3').textContent()).trim(),stageNames[line][stage],`${line}/${stage}: the current test card shows the form's own name`);
      assert((await card.locator('.evolution-lab-line-name').textContent()).includes(`Stage ${stage}`));
    }
  }
  await assertCardNames(0);
  await controls.locator('.evolution-lab-gallery summary').click();
  const forms=controls.locator('.evolution-lab-forms article');assert.equal(await forms.count(),28);
  const galleryNames=(await forms.locator('h3').allTextContents()).map(name=>name.trim());
  const expectedNames=Array.from({length:7},(_,stage)=>lines.map(line=>stageNames[line][stage])).flat();
  assert.equal(new Set(galleryNames).size,28,'all 28 forms have distinct individual names, rather than repeating four family labels');
  assert.deepEqual(galleryNames,expectedNames,'each gallery form displays its own name at the correct line and stage');
  const original=await identity(forms.filter({has:lab.locator('[data-stage="0"][data-branch="classic"]')}).locator('.moris-art'));
  for(const line of lines){let previous;for(let stage=0;stage<=6;stage++){
    const svg=controls.locator(`.evolution-lab-forms article[data-lab-stage="${stage}"][data-lab-branch="${line}"] > .moris-art`),actual=await identity(svg);assertArt(actual,original,line,stage);
    if(previous)assert.notEqual(actual.geometry,previous,'every fixed-line step has a separately authored form');previous=actual.geometry;
  }}
  await lab.evaluate(async()=>{
    const rm=await import('/node_modules/.vite/deps/react.js'),R=rm.default??rm,cm=await import('/node_modules/.vite/deps/react-dom_client.js');
    const {Moris}=await import('/src/Moris.tsx'),host=document.createElement('div');host.id='fixed-personal-art-audit';host.style.cssText='position:fixed;left:-10000px;top:0;display:grid;grid-template-columns:repeat(12,200px);width:2400px;pointer-events:none';document.body.append(host);
    window.__fixedArtRoot=(cm.createRoot??cm.default.createRoot)(host);
    window.__fixedArtRoot.render(R.createElement(R.Fragment,null,...['classic','zoology','origami','botanic'].flatMap(branch=>Array.from({length:7},(_,stage)=>['freckles','tuft','antenna'].map(morisDetail=>R.createElement(Moris,{key:`${branch}-${stage}-${morisDetail}`,branch,stage,happy:true,motion:'still',appearance:{morisColor:'lagoon',morisDetail}}))).flat())));
  });
  const personalized=lab.locator('#fixed-personal-art-audit > .moris-art');await personalized.nth(83).waitFor({state:'attached'});
  for(const svg of await personalized.all()){const actual=await identity(svg);assertArt(actual,original,actual.line,actual.stage);}
  await lab.evaluate(()=>{window.__fixedArtRoot.unmount();document.getElementById('fixed-personal-art-audit').remove();delete window.__fixedArtRoot;});
  const ids=await forms.locator('[id]').evaluateAll(elements=>elements.map(item=>item.id));assert.equal(new Set(ids).size,ids.length,'all side-by-side SVGs have independent local paint definitions');
  await lab.setViewportSize({width:1400,height:1100});await controls.locator('.evolution-lab-gallery').screenshot({path:path.join(output,'four-fixed-lines-gallery.png')});
  console.log('PASS all 28 individually named forms and 84 happy personalized variants retain the original face, fit their drawing area and use valid independent paints; only the four finales are holographic');

  const final=controls.locator('.evolution-lab-forms article[data-lab-stage="6"][data-lab-branch="zoology"] > .moris-art');
  const animated=()=>final.locator('.moris-holo *').evaluateAll(elements=>elements.some(item=>getComputedStyle(item).animationName!=='none'));
  await lab.emulateMedia({reducedMotion:'no-preference'});assert.equal(await animated(),true,'the foil sweeps automatically');
  await final.scrollIntoViewIfNeeded();const box=await final.boundingBox();await lab.mouse.move(box.x+box.width*.8,box.y+box.height*.2);
  assert.notEqual(await final.evaluate(el=>el.style.getPropertyValue('--foil-x')),'');assert.notEqual(await final.evaluate(el=>el.style.getPropertyValue('--foil-y')),'');
  await lab.mouse.move(2,2);assert.equal(await final.evaluate(el=>el.style.getPropertyValue('--foil-x')),'');
  await lab.emulateMedia({reducedMotion:'reduce'});assert.equal(await animated(),false,'reduced motion stops the foil animation');assert.equal(await final.locator('.moris-holo').count(),1,'a static foil finish remains');await lab.emulateMedia({reducedMotion:'no-preference'});
  await lab.setViewportSize({width:320,height:800});assert(await lab.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await controls.evaluate(el=>el.scrollWidth>el.clientWidth),false);
  await controls.locator('.evolution-lab-gallery summary').click();
  console.log('PASS holographic finales animate, react to pointer position and retain a static finish under reduced motion; the lab fits 320px');

  await controls.getByRole('button',{name:'Next milestone',exact:true}).click();const chooser=lab.getByRole('dialog');await chooser.waitFor();
  assert.equal(await chooser.locator('.evolution-choices > article').count(),4);
  for(const line of lines){await chooser.getByRole('button',{name:`Choose ${line}`,exact:true}).waitFor();await chooser.locator(`.evolution-choice-${line} > .moris-art[data-stage="1"]`).waitFor();}
  assert.equal(await chooser.evaluate(el=>el.scrollWidth>el.clientWidth),false);await chooser.screenshot({path:path.join(output,'fixed-line-chooser-mobile.png')});
  await chooser.getByRole('button',{name:'Choose later',exact:true}).click();await nav(lab,'Moris');assert.equal(await portrait(lab).getAttribute('data-stage'),'0');assert.equal((await config(lab)).evolutionLine,null);
  await lab.locator('.evolution-ready').getByRole('button',{name:'Choose your line',exact:true}).click();await chooser.getByRole('button',{name:'Choose zoology',exact:true}).click();
  await chooser.locator('.evolution-after .moris-art[data-branch="zoology"][data-stage="1"]').waitFor();await closeCelebration(lab);
  await assertCardNames(1);
  assert.deepEqual(await controls.getByLabel('Test stage',{exact:true}).locator('option').allTextContents(),thresholds.map((xp,stage)=>`Stage ${stage} · ${stageNames.zoology[stage]} · ${xp} XP`),'the stage selector names every form of the chosen line');
  const firstChoice=(await config(lab)).evolutionChoices;assert.equal(firstChoice.length,1);assert.equal((await config(lab)).evolutionLine,'zoology');
  for(let stage=2;stage<=6;stage++){await controls.getByRole('button',{name:'Next milestone',exact:true}).click();await controls.getByText(`${thresholds[stage]} XP`,{exact:true}).waitFor();await saved(lab);assert.equal(await lab.getByRole('dialog').count(),0);assertArt(await identity(portrait(lab)),original,'zoology',stage);await assertCardNames(stage);assert.equal((await config(lab)).evolutionLine,'zoology');}
  assert.deepEqual((await config(lab)).evolutionChoices,firstChoice,'future XP milestones do not add choices or mix lines');
  await controls.getByRole('button',{name:'Replay transformation',exact:true}).click();await chooser.locator('.evolution-before .moris-art[data-stage="5"][data-branch="zoology"]').waitFor();await chooser.locator('.evolution-after .moris-art[data-stage="6"][data-branch="zoology"] .moris-holo').waitFor();await closeCelebration(lab);
  const chosenBackup=await exportBackup(lab,'fixed-line-v6-backup.json');assert.equal(chosenBackup.schemaVersion,6);assert.equal(chosenBackup.settings.evolutionLine,'zoology');assert.equal(chosenBackup.completions.length,200);
  await lab.reload();await nav(lab,'Moris');assertArt(await identity(portrait(lab)),original,'zoology',6);assert.equal(await lab.getByRole('dialog').count(),0);
  console.log('PASS one of four lines is chosen once, later lab milestones follow it automatically and the final transformation can be replayed');

  await controls.getByLabel('Test stage',{exact:true}).selectOption('0');await controls.getByText('0 XP',{exact:true}).waitFor();assertArt(await identity(portrait(lab)),original,'zoology',0);assert.equal((await config(lab)).evolutionLine,'zoology');
  await controls.getByLabel('Test stage',{exact:true}).selectOption('6');await controls.getByText('2000 XP',{exact:true}).waitFor();assert.equal(await lab.getByRole('dialog').count(),0);
  await controls.getByRole('button',{name:'Reset test',exact:true}).click();await controls.getByText('0 XP',{exact:true}).waitFor();await restoreBackup(lab,chosenBackup,'fixed-v6-restore.json');
  const restored=await exportBackup(lab,'fixed-v6-restored.json');assert.deepEqual(restored.settings.evolutionChoices,chosenBackup.settings.evolutionChoices);assert.equal(restored.settings.evolutionLine,'zoology');assert.deepEqual(restored.completions,chosenBackup.completions);
  const mixed=structuredClone(chosenBackup);mixed.schemaVersion=5;delete mixed.settings.evolutionLine;mixed.settings.evolutionChoices=[{stage:1,branch:'origami'},{stage:2,branch:'zoology'},{stage:6,branch:'botanic'}];
  await restoreBackup(lab,mixed,'old-mixed-v5.json');await nav(lab,'Moris');assertArt(await identity(portrait(lab)),original,'origami',6);
  const migrated=await exportBackup(lab,'fixed-migrated-v6.json');assert.equal(migrated.settings.evolutionLine,'origami');assert.deepEqual(migrated.settings.evolutionChoices,mixed.settings.evolutionChoices);assert.deepEqual(migrated.completions,mixed.completions);
  console.log('PASS reload, XP undo/re-unlock and v6 restore keep the chosen line; old v5 mixed history adopts its first line without losing history or XP');

  const legacy=structuredClone(chosenBackup);legacy.schemaVersion=4;delete legacy.settings.evolutionLine;delete legacy.settings.evolutionChoices;delete legacy.settings.evolutionLegacyStage;
  await restoreBackup(lab,legacy,'original-v4.json');await nav(lab,'Moris');assertArt(await identity(portrait(lab)),original,'classic',6);assert.equal((await config(lab)).evolutionLine,null);
  await lab.locator('.evolution-ready').getByRole('button',{name:'Choose your direction',exact:true}).click();await chooser.getByRole('button',{name:'Choose classic',exact:true}).click();await closeCelebration(lab);
  const adopted=await exportBackup(lab,'chosen-classic-v6.json');assert.equal(adopted.settings.evolutionLine,'classic');assert.deepEqual(adopted.completions,chosenBackup.completions);
  await nav(lab,'Moris');for(const line of lines){const card=controls.locator(`[data-lab-line="${line}"]`);await card.getByRole('button',{name:/Test(ing)? this line/}).click();await saved(lab);assert.equal((await config(lab)).evolutionLine,line);assertArt(await identity(portrait(lab)),original,line,6);assert.equal((await lab.locator('.evolution-portrait h2').textContent()).trim(),stageNames[line][6]);}
  console.log('PASS original legacy forms and XP stay intact until a line is chosen; the lab can switch freely among all four lines');

  assert.deepEqual(await allRecords(normal,'moris'),normalBefore,'lab controls and restores leave all five normal data stores intact');assert.deepEqual(reminderRequests,[]);assert.equal((await records(lab,labDatabase,'meta')).filter(row=>row.key==='reminder-device').length,0);
  await normal.reload();assert.equal(await normal.locator('.evolution-lab').count(),0);await normal.getByRole('button',{name:'Undo Read a few pages today',exact:true}).waitFor();
  if(production){const published=await context.newPage();await published.goto(`${production}/?evolutionLab=1`);await published.getByRole('button',{name:'Start with a blank page',exact:true}).waitFor();assert.equal(await published.locator('.evolution-lab').count(),0);}
  console.log(`PASS the lab has isolated data and no reminder requests or tokens; it is absent from normal${production?' and production':''} pages`);

  const progressionContext=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Budapest',acceptDownloads:true});
  const progression=await progressionContext.newPage();progression.on('pageerror',error=>errors.push(error.message));await progression.goto(base);await progression.getByRole('button',{name:'Start with a blank page',exact:true}).click();
  const beforeThreshold=structuredClone(chosenBackup);beforeThreshold.completions=beforeThreshold.completions.slice(0,9);beforeThreshold.settings.celebratedStage=1;
  await restoreBackup(progression,beforeThreshold,'chosen-line-at-90xp.json');await nav(progression,'Today');await progression.getByRole('button',{name:'Complete Lab daily practice today',exact:true}).click();
  await progression.getByRole('dialog').locator('.evolution-after .moris-art[data-stage="2"][data-branch="zoology"]').waitFor();assert.equal(await progression.getByRole('button',{name:'Choose zoology',exact:true}).count(),0);await closeCelebration(progression);
  await progression.getByRole('button',{name:'Undo Lab daily practice today',exact:true}).click();await progression.getByRole('button',{name:'Complete Lab daily practice today',exact:true}).click();await saved(progression);assert.equal(await progression.getByRole('dialog').count(),0);
  await progression.reload();assert.equal(await progression.getByRole('dialog').count(),0);const progressed=await exportBackup(progression,'automatically-progressed-v6.json');assert.equal(progressed.settings.evolutionLine,'zoology');assert.equal(progressed.settings.celebratedStage,2);assert.equal(progressed.completions.length,10);assert.deepEqual(progressed.settings.evolutionChoices,chosenBackup.settings.evolutionChoices);
  console.log('PASS a real completion advances the selected line and celebrates automatically once; undo/redo and reload preserve both line and celebration marker');

  // A real IndexedDB transaction holds the write queue while UI feedback stays
  // optimistic. Undo before persistence must cancel the older celebration.
  await restoreBackup(progression,beforeThreshold,'delayed-write-at-90xp.json');await nav(progression,'Today');
  await progression.evaluate(()=>{
    window.__releaseMorisLock=false;window.__morisLockReady=false;
    window.__morisLockDone=new Promise((resolve,reject)=>{
      const open=indexedDB.open('moris');open.onerror=()=>reject(open.error);open.onsuccess=()=>{
        const db=open.result,tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta'),deadline=performance.now()+5000;
        function pump(){const request=store.get('config');request.onsuccess=()=>{window.__morisLockReady=true;if(!window.__releaseMorisLock&&performance.now()<deadline)pump();};request.onerror=()=>reject(request.error);}
        tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};pump();
      };
    });
  });
  await progression.waitForFunction(()=>window.__morisLockReady);
  await progression.getByRole('button',{name:'Complete Lab daily practice today',exact:true}).click();
  await progression.locator('.today-moris .moris-art[data-stage="2"]').waitFor();
  await progression.getByRole('button',{name:'Undo Lab daily practice today',exact:true}).click();
  await progression.locator('.today-moris .moris-art[data-stage="1"]').waitFor();
  await progression.evaluate(()=>{window.__releaseMorisLock=true;});await progression.evaluate(()=>window.__morisLockDone);await saved(progression);
  assert.equal(await progression.getByRole('dialog').count(),0,'undo cancels an obsolete milestone celebration waiting on IndexedDB');
  const afterRace=await exportBackup(progression,'delayed-write-undone-v6.json');assert.equal(afterRace.settings.evolutionLine,'zoology');assert.deepEqual(afterRace.completions,beforeThreshold.completions);
  await progression.reload();await nav(progression,'Today');await progression.locator('.today-moris .moris-art[data-stage="1"]').waitFor();assert.equal(await progression.getByRole('dialog').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS undo while IndexedDB persistence is delayed cancels an obsolete evolution celebration and preserves the earlier XP records');

  // Exercise a second interaction during the delayed save in the isolated lab.
  // The earned scene must wait for the editor, without losing its saved marker.
  await restoreBackup(lab,beforeThreshold,'editor-overlap-lab-at-90xp.json');await nav(lab,'Today');
  await lab.evaluate(()=>{
    window.__releaseEditorLock=false;window.__editorLockReady=false;
    window.__editorLockDone=new Promise((resolve,reject)=>{
      const open=indexedDB.open('moris-evolution-lab-v1');open.onerror=()=>reject(open.error);open.onsuccess=()=>{
        const db=open.result,tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta'),deadline=performance.now()+5000;
        function pump(){const request=store.get('config');request.onsuccess=()=>{window.__editorLockReady=true;if(!window.__releaseEditorLock&&performance.now()<deadline)pump();};request.onerror=()=>reject(request.error);}
        tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};pump();
      };
    });
  });
  await lab.waitForFunction(()=>window.__editorLockReady);
  await lab.getByRole('button',{name:'Complete Lab daily practice today',exact:true}).click();
  await lab.locator('.today-moris .moris-art[data-stage="2"]').waitFor();
  await lab.getByRole('button',{name:'Add habit',exact:true}).click();
  const editor=lab.getByRole('dialog').filter({has:lab.getByRole('heading',{name:'A little commitment.',exact:true})});
  await editor.getByLabel('Habit name',{exact:true}).fill('An uninterrupted draft');
  await lab.evaluate(()=>{window.__releaseEditorLock=true;});await lab.evaluate(()=>window.__editorLockDone);await saved(lab);
  assert.equal(await lab.getByRole('dialog').count(),1,'a committed evolution never opens over the habit editor');
  assert.equal(await lab.locator('.celebration').count(),0,'the earned scene waits while editing');
  assert.equal((await config(lab)).celebratedStage,2,'the queued scene already has a durable milestone marker');
  await editor.getByLabel('Habit name',{exact:true}).fill('The editor still works');
  assert.equal(await editor.getByLabel('Habit name',{exact:true}).inputValue(),'The editor still works');
  await editor.getByRole('button',{name:'Close dialog',exact:true}).click();
  await lab.getByRole('dialog').getByRole('heading',{name:'A new kind of weird.',exact:true}).waitFor();
  assert.equal(await lab.getByRole('dialog').count(),1,'only the queued celebration opens after the editor closes');
  await lab.getByRole('dialog').locator('.evolution-after .moris-art[data-stage="2"][data-branch="zoology"]').waitFor();
  await closeCelebration(lab);await lab.reload();await controls.waitFor();
  assert.equal(await lab.getByRole('dialog').count(),0,'the queued celebration is shown exactly once and stays acknowledged after reload');
  assert.equal((await config(lab)).celebratedStage,2);
  assert.deepEqual(await allRecords(normal,'moris'),normalBefore,'the isolated regression cannot alter normal app records');
  assert.deepEqual(errors,[]);console.log('PASS a delayed evolution waits for the usable habit editor to close, then appears exactly once with its milestone already saved');
  await browser.close();
})().catch(async error=>{console.error(error);if(browser)for(const [i,context]of browser.contexts().entries())for(const [j,page]of context.pages().entries())await page.screenshot({path:path.join(output,`fixed-line-failure-${i}-${j}.png`),fullPage:true}).catch(()=>{});await browser?.close();process.exitCode=1;});
