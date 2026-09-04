import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLORS=['#bd5c3d','#246657','#c89b42','#4f6e9c','#8b5f82','#608764'];
const seed={version:1,name:'三国纪事',people:[
  {id:'p1',name:'刘备',born:'161年',died:'223年',main:true,note:'蜀汉昭烈帝'},
  {id:'p2',name:'关羽',born:'约160年',died:'220年',main:false,note:'字云长'},
  {id:'p3',name:'张飞',born:'约165年',died:'221年',main:false,note:'字益德'},
  {id:'p4',name:'诸葛亮',born:'181年',died:'234年',main:false,note:'字孔明'},
  {id:'p5',name:'曹操',born:'155年',died:'220年',main:false,note:'魏武帝'},
  {id:'p6',name:'孙权',born:'182年',died:'252年',main:false,note:'吴大帝'}
],relations:[
  {from:'p1',to:'p2',label:'结义兄弟',note:'桃园结义'}, {from:'p1',to:'p3',label:'结义兄弟',note:'桃园结义'},
  {from:'p1',to:'p4',label:'君臣',note:'三顾茅庐'}, {from:'p1',to:'p5',label:'敌手',note:'汉中争衡'}, {from:'p1',to:'p6',label:'盟友',note:'孙刘联盟'}
],events:[
  {id:'e1',title:'煮酒论英雄',date:'199年',year:199,place:'许都',people:['p1','p5'],description:'曹操青梅煮酒，与刘备纵论天下英雄。刘备借雷声掩饰心中惊惧。'},
  {id:'e2',title:'三顾茅庐',date:'207年冬',year:207,place:'隆中',people:['p1','p4'],description:'刘备三次拜访诸葛亮，问以天下大计，遂有隆中对。'},
  {id:'e3',title:'长坂坡之战',date:'208年秋',year:208,place:'当阳',people:['p1','p3','p5'],description:'曹军追至长坂，刘备军民溃散。张飞据水断桥，为众人争取退路。'},
  {id:'e4',title:'赤壁之战',date:'208年冬',year:208.7,place:'赤壁',people:['p1','p4','p5','p6'],description:'孙刘联军以火攻大破曹军，奠定三国鼎立的基础。'},
  {id:'e5',title:'进位汉中王',date:'219年',year:219,place:'汉中',people:['p1','p4','p5'],description:'刘备在汉中之战后进位汉中王，建立较为稳固的蜀汉基业。'},
  {id:'e6',title:'',date:'221年春',year:221,place:'成都',people:['p1','p4'],description:''},
  {id:'e7',title:'夷陵之战',date:'222年',year:222,place:'夷陵',people:['p1'],description:'刘备伐吴，于夷陵遭陆逊火攻，蜀军大败。'}
]};

let data=loadLocal()||structuredClone(seed);let scene,camera,renderer,controls,raycaster,pointer,targets=[],resizeObserver;
const $=s=>document.querySelector(s);const byId=id=>data.people.find(p=>p.id===id);
const escapeHtml=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function save(){localStorage.setItem('suiyue-book',JSON.stringify(data));}
function loadLocal(){try{return JSON.parse(localStorage.getItem('suiyue-book'))}catch{return null}}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1900)}

function init(){lucide.createIcons();bindUI();renderAll();initScene();}
function bindUI(){
  $('#addEventBtn').onclick=()=>openEventForm();$('#addPersonBtn').onclick=()=>openPersonForm();
  $('#exportBtn').onclick=exportBook;$('#newBookBtn').onclick=newBook;$('#renameBookBtn').onclick=renameBook;
  $('#loadBookInput').onchange=importBook;$('#scrim').onclick=closeDrawer;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeDrawer);
  document.querySelectorAll('[data-dialog-close]').forEach(b=>b.onclick=()=>$('#editorDialog').close());
  $('#resetViewBtn').onclick=resetCamera;$('#zoomInBtn').onclick=()=>{camera.position.multiplyScalar(.85)};$('#zoomOutBtn').onclick=()=>{camera.position.multiplyScalar(1.15)};
  window.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
}
function renderAll(){
  $('#bookName').textContent=data.name;$('#personCount').textContent=data.people.length;$('#relationCount').textContent=data.relations.length;
  $('#personLegend').innerHTML=data.people.slice(0,5).map((p,i)=>`<span class="legend-item"><i style="background:${COLORS[i%COLORS.length]}"></i>${escapeHtml(p.name)}</span>`).join('');
  renderRelations();if(scene)buildScene();lucide.createIcons();
}

function initScene(){
  const host=$('#scene');scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xf0eee7,.016);
  camera=new THREE.PerspectiveCamera(44,host.clientWidth/host.clientHeight,.1,1000);camera.position.set(20,23,28);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(host.clientWidth,host.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.target.set(0,6,0);controls.minDistance=10;controls.maxDistance=70;
  raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();renderer.domElement.addEventListener('pointerup',pick);
  resizeObserver=new ResizeObserver(()=>{if(!host.clientWidth)return;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight)});resizeObserver.observe(host);
  buildScene();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
}
function resetCamera(){camera.position.set(20,23,28);controls.target.set(0,6,0);controls.update()}
function disposeScene(){while(scene.children.length){const o=scene.children.pop();o.traverse?.(x=>{x.geometry?.dispose();if(x.material){(Array.isArray(x.material)?x.material:[x.material]).forEach(m=>m.dispose())}})}}
function buildScene(){
  disposeScene();targets=[];$('#sceneEmpty').hidden=data.events.length>0;
  scene.add(new THREE.HemisphereLight(0xffffff,0x6c766f,2.2));const dl=new THREE.DirectionalLight(0xffffff,2);dl.position.set(5,15,8);scene.add(dl);
  const grid=new THREE.GridHelper(38,19,0xcbd1cb,0xdfe2dc);grid.position.y=-.05;grid.material.opacity=.48;grid.material.transparent=true;scene.add(grid);
  const years=[...new Set(data.events.map(e=>Number(e.year)||0))].sort((a,b)=>a-b);const places=[...new Set(data.events.map(e=>e.place||'未详'))];const minY=Math.min(...years,0);const maxY=Math.max(...years,1);const yFor=y=>years.length<2?5:((y-minY)/(maxY-minY))*13;
  const placePos=new Map();places.forEach((p,i)=>{const a=(i/Math.max(places.length,1))*Math.PI*2;const radius=places.length===1?0:Math.min(10,4+places.length*.75);placePos.set(p,new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius))});
  places.forEach((p,i)=>{const base=placePos.get(p);const ring=new THREE.Mesh(new THREE.RingGeometry(1.7,1.76,64),new THREE.MeshBasicMaterial({color:i%2?0xb8c3bc:0xd1b985,transparent:true,opacity:.65,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.copy(base);ring.position.y=.02;scene.add(ring);const label=makeLabel(p,'place');label.position.set(base.x,.16,base.z);scene.add(label)});
  years.forEach(y=>{const yy=yFor(y);const mat=new THREE.LineBasicMaterial({color:0xb9c1bb,transparent:true,opacity:.3});const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-15,yy,-12),new THREE.Vector3(15,yy,-12)]);scene.add(new THREE.Line(geo,mat));const label=makeLabel(`${y}年`,'year');label.position.set(-15.7,yy,-12);scene.add(label)});
  const eventPositions=new Map();data.events.forEach((e,i)=>{const base=placePos.get(e.place||'未详');const same=data.events.filter(x=>x.place===e.place&&x.year===e.year);const idx=same.indexOf(e);const angle=(idx/Math.max(1,same.length))*Math.PI*2;const pos=new THREE.Vector3(base.x+Math.cos(angle)*.65,yFor(Number(e.year)||0),base.z+Math.sin(angle)*.65);eventPositions.set(e.id,pos);const mesh=new THREE.Mesh(new THREE.SphereGeometry(.24,20,20),new THREE.MeshStandardMaterial({color:e.title?0xbd5c3d:0xc89b42,roughness:.35,metalness:.08,emissive:e.title?0x351107:0x3b2c09,emissiveIntensity:.13}));mesh.position.copy(pos);mesh.userData={type:'event',id:e.id};scene.add(mesh);targets.push(mesh);const halo=new THREE.Mesh(new THREE.RingGeometry(.35,.42,32),new THREE.MeshBasicMaterial({color:e.title?0xbd5c3d:0xc89b42,transparent:true,opacity:.28,side:THREE.DoubleSide}));halo.position.copy(pos);halo.lookAt(camera.position);scene.add(halo);});
  data.people.forEach((p,pi)=>{const evs=data.events.filter(e=>e.people.includes(p.id)).sort((a,b)=>a.year-b.year);if(evs.length<2)return;const pts=evs.map(e=>eventPositions.get(e.id));const curve=new THREE.CatmullRomCurve3(pts);const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(16,pts.length*10),.055,8,false),new THREE.MeshBasicMaterial({color:COLORS[pi%COLORS.length],transparent:true,opacity:.8}));tube.userData={type:'person',id:p.id};scene.add(tube);targets.push(tube)});
}
function makeLabel(textValue,type){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.font=type==='year'?'500 24px sans-serif':'600 27px serif';x.fillStyle=type==='year'?'#7e8983':'#30443d';x.textAlign='center';x.fillText(textValue,128,39);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));s.scale.set(3.2,.8,1);return s}
function pick(ev){const r=renderer.domElement.getBoundingClientRect();pointer.x=((ev.clientX-r.left)/r.width)*2-1;pointer.y=-((ev.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(targets,false)[0];if(!hit)return;hit.object.userData.type==='event'?showEvent(hit.object.userData.id):showPersonTimeline(hit.object.userData.id)}

function renderRelations(){
  const host=$('#relationCanvas'),nodes=$('#relationNodes'),svg=$('#relationLines');nodes.innerHTML='';svg.innerHTML='';const main=data.people.find(p=>p.main)||data.people[0];if(!main)return;
  const w=host.clientWidth||370,h=host.clientHeight||520,cx=w/2,cy=h/2;const positions=new Map([[main.id,{x:cx,y:cy}]]);const others=data.people.filter(p=>p.id!==main.id);
  others.forEach((p,i)=>{const older=parseInt(p.born)<parseInt(main.born);const group=others.filter(q=>(parseInt(q.born)<parseInt(main.born))===older);const idx=group.indexOf(p);positions.set(p.id,{x:group.length===1?cx:45+(idx/(group.length-1))*(w-90),y:older?Math.max(68,cy-150):Math.min(h-75,cy+160)})});
  data.relations.forEach(rel=>{const a=positions.get(rel.from),b=positions.get(rel.to);if(!a||!b)return;const ns='http://www.w3.org/2000/svg';const line=document.createElementNS(ns,'path');const midY=(a.y+b.y)/2;line.setAttribute('d',`M${a.x},${a.y} C${a.x},${midY} ${b.x},${midY} ${b.x},${b.y}`);line.setAttribute('class','relation-edge');svg.appendChild(line);const t=document.createElementNS(ns,'text');t.setAttribute('x',(a.x+b.x)/2);t.setAttribute('y',midY-5);t.setAttribute('class','edge-label');t.textContent=rel.label;svg.appendChild(t)});
  data.people.forEach((p,i)=>{const pos=positions.get(p.id);if(!pos)return;const el=document.createElement('button');el.className=`relation-node${p.main?' main':''}`;el.style.left=pos.x+'px';el.style.top=pos.y+'px';el.style.setProperty('--node-color',COLORS[i%COLORS.length]);el.innerHTML=`<span class="avatar">${escapeHtml(p.name.slice(-1))}</span><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml([p.born,p.died].filter(Boolean).join('—'))}</small>`;el.onclick=()=>showPerson(p.id);nodes.appendChild(el)});
}
function openDrawer(html){$('#detailContent').innerHTML=html;$('#detailDrawer').classList.add('open');$('#detailDrawer').setAttribute('aria-hidden','false');$('#scrim').classList.add('open');lucide.createIcons()}
function closeDrawer(){$('#detailDrawer').classList.remove('open');$('#detailDrawer').setAttribute('aria-hidden','true');$('#scrim').classList.remove('open')}
function showEvent(id){const e=data.events.find(x=>x.id===id);if(!e)return;openDrawer(`<span class="detail-kicker">${e.title?'历史事件':'人物行迹'}</span><h2 class="detail-title">${escapeHtml(e.title||`${e.place} · 行迹记录`)}</h2><div class="detail-meta"><div class="meta-block"><span>时间</span><strong>${escapeHtml(e.date)}</strong></div><div class="meta-block"><span>地点</span><strong>${escapeHtml(e.place)}</strong></div></div><div class="people-row">${e.people.map(id=>`<span class="person-chip">${escapeHtml(byId(id)?.name||id)}</span>`).join('')}</div>${e.description?`<p class="detail-body">${escapeHtml(e.description)}</p>`:'<p class="detail-body">此条记录只标记人物在该时刻所处的位置。</p>'}`)}
function showPersonTimeline(id){const p=byId(id);const evs=data.events.filter(e=>e.people.includes(id)).sort((a,b)=>a.year-b.year);openDrawer(`<span class="detail-kicker">人物变动</span><h2 class="detail-title">${escapeHtml(p.name)}的行迹</h2><div class="timeline">${evs.map(e=>`<div class="timeline-item"><time>${escapeHtml(e.date)}</time><strong>${escapeHtml(e.place)}</strong><p>${escapeHtml(e.title||'位置记录')}</p></div>`).join('')}</div>`)}
function showPerson(id){const p=byId(id);const rels=data.relations.filter(r=>r.from===id||r.to===id);openDrawer(`<span class="detail-kicker">人物小传${p.main?' · 主节点':''}</span><h2 class="detail-title">${escapeHtml(p.name)}</h2><div class="detail-meta"><div class="meta-block"><span>生年</span><strong>${escapeHtml(p.born||'未详')}</strong></div><div class="meta-block"><span>卒年</span><strong>${escapeHtml(p.died||'未详')}</strong></div></div><p class="detail-body">${escapeHtml(p.note||'暂无人物备注。')}</p><div class="timeline">${rels.map(r=>{const other=byId(r.from===id?r.to:r.from);return `<div class="timeline-item"><time>${escapeHtml(r.label)}</time><strong>${escapeHtml(other?.name||'未知')}</strong><p>${escapeHtml(r.note||'')}</p></div>`}).join('')}</div>`)}

function openEventForm(){
  $('#dialogEyebrow').textContent='新记录';$('#dialogTitle').textContent='添加事件';
  $('#formFields').innerHTML=`<div class="form-grid"><div class="field full"><label>事件标题（位置记录可留空）</label><input name="title" placeholder="例如：赤壁之战"></div><div class="field"><label>时间文本</label><input name="date" required placeholder="208年冬"></div><div class="field"><label>排序年份</label><input name="year" required type="number" step="0.1" placeholder="208"></div><div class="field full"><label>地点</label><input name="place" required placeholder="赤壁"></div><div class="field full"><label>人物（可多选）</label><select name="people" multiple size="4" required>${data.people.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select></div><div class="field full"><label>事件描述</label><textarea name="description" placeholder="记录事件经过与影响"></textarea></div></div>`;
  openEditor(form=>{const selected=[...form.elements.people.selectedOptions].map(o=>o.value);data.events.push({id:'e'+Date.now(),title:form.elements.title.value.trim(),date:form.elements.date.value.trim(),year:Number(form.elements.year.value),place:form.elements.place.value.trim(),people:selected,description:form.elements.description.value.trim()});save();renderAll();toast('事件已添加')});
}
function openPersonForm(){
  $('#dialogEyebrow').textContent='新人物';$('#dialogTitle').textContent='添加人物';const main=data.people.find(p=>p.main);
  $('#formFields').innerHTML=`<div class="form-grid"><div class="field"><label>姓名</label><input name="name" required></div><div class="field"><label>与主节点关系</label><input name="relation" ${main?'required':''} placeholder="例如：君臣"></div><div class="field"><label>生年</label><input name="born" placeholder="181年"></div><div class="field"><label>卒年</label><input name="died" placeholder="234年"></div><div class="field full"><label>人物备注</label><textarea name="note"></textarea></div><label class="check-row full"><input type="checkbox" name="main">设为新的主节点</label></div>`;
  openEditor(form=>{const id='p'+Date.now();if(form.elements.main.checked)data.people.forEach(p=>p.main=false);const p={id,name:form.elements.name.value.trim(),born:form.elements.born.value.trim(),died:form.elements.died.value.trim(),note:form.elements.note.value.trim(),main:form.elements.main.checked||!data.people.length};data.people.push(p);if(main&&main.id!==id)data.relations.push({from:main.id,to:id,label:form.elements.relation.value.trim()||'相关',note:''});save();renderAll();toast('人物已添加')});
}
function openEditor(onSubmit){const d=$('#editorDialog'),f=$('#editorForm');f.onsubmit=e=>{e.preventDefault();if(!f.reportValidity())return;onSubmit(f);d.close()};d.showModal();lucide.createIcons()}
function downloadJson(value,filename){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function exportBook(){const name=data.name||'未命名书籍';downloadJson({format:'suiyue-relations',version:1,book:name,people:data.people,relations:data.relations},`${name}-人物关系.json`);setTimeout(()=>downloadJson({format:'suiyue-events',version:1,book:name,events:data.events},`${name}-事件记录.json`),180);toast('已导出两份书籍文件')}
async function importBook(ev){const files=[...ev.target.files];if(!files.length)return;try{const parsed=await Promise.all(files.map(async f=>JSON.parse(await f.text())));let next;if(parsed.length===1&&parsed[0].people&&parsed[0].events){next=parsed[0]}else{const relationFile=parsed.find(x=>x.format==='suiyue-relations'||(x.people&&x.relations));const eventFile=parsed.find(x=>x.format==='suiyue-events'||x.events);if(!relationFile||!eventFile)throw new Error('请选择人物关系和事件记录两份文件');next={version:1,name:relationFile.book||eventFile.book||'导入书籍',people:relationFile.people,relations:relationFile.relations,events:eventFile.events}}if(!next.name||!Array.isArray(next.people)||!Array.isArray(next.relations)||!Array.isArray(next.events))throw new Error('文件格式不正确');if(next.people.length&&next.people.filter(p=>p.main).length!==1)throw new Error('人物关系文件必须且只能有一个主节点');data=next;save();renderAll();toast('书籍载入成功')}catch(err){toast(err.message||'文件格式不正确')}finally{ev.target.value=''}}
function newBook(){const name=prompt('新书籍名称','未命名书籍');if(!name)return;data={version:1,name:name.trim(),people:[],relations:[],events:[]};save();renderAll();toast('新书籍已创建')}
function renameBook(){const name=prompt('书籍名称',data.name);if(name?.trim()){data.name=name.trim();save();renderAll()}}
init();
