import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $=s=>document.querySelector(s);
const stage=$('#stage');
const inputs=[];
const presets={
  stretch:[[2,0,0],[0,1,0],[0,0,.5]],
  shear:[[2,1,0],[0,1,0],[0,0,.5]],
  rotate:[[0,-1,0],[1,0,0],[0,0,1.4]],
  symmetric:[[2,1,.3],[1,1.2,.2],[.3,.2,.6]]
};

for(let r=0;r<3;r++)for(let c=0;c<3;c++){
  const el=document.createElement('input'); el.type='number'; el.step='0.1';
  el.setAttribute('aria-label',`A row ${r+1} column ${c+1}`);
  $('#matrix').appendChild(el); inputs.push(el);
}
function setMatrix(A){inputs.forEach((e,k)=>e.value=A[Math.floor(k/3)][k%3]);updateAll();}
function getA(){return [0,1,2].map(r=>[0,1,2].map(c=>{let v=+inputs[r*3+c].value;return Number.isFinite(v)?Math.max(-20,Math.min(20,v)):0}))}
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>setMatrix(presets[b.dataset.preset])));
inputs.forEach(e=>e.addEventListener('input',updateAll));

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x0b0e14);
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x0b0e14,.025);
const camera=new THREE.PerspectiveCamera(45,1,.05,100);
camera.position.set(5.7,4.6,5.8);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.target.set(0,0,0); controls.minDistance=2.3; controls.maxDistance=18;

scene.add(new THREE.HemisphereLight(0xffffff,0x263040,2.0));
const dl=new THREE.DirectionalLight(0xffffff,2.2);dl.position.set(4,7,5);scene.add(dl);

const grid=new THREE.GridHelper(10,20,0x344055,0x1c2432);grid.position.y=0;scene.add(grid);
const axes=new THREE.AxesHelper(2.8);scene.add(axes);

const originalGroup=new THREE.Group(), transformedGroup=new THREE.Group(), eigenGroup=new THREE.Group();
scene.add(originalGroup,transformedGroup,eigenGroup);

function cubeLines(material){
 const g=new THREE.BoxGeometry(2,2,2);
 const e=new THREE.EdgesGeometry(g);
 return new THREE.LineSegments(e,material);
}
const originalCube=cubeLines(new THREE.LineBasicMaterial({color:0x677388,transparent:true,opacity:.55}));
originalGroup.add(originalCube);
const transformedCube=cubeLines(new THREE.LineBasicMaterial({color:0x48d9ff,transparent:true,opacity:.9}));
transformedGroup.add(transformedCube);

const sphere=new THREE.Mesh(new THREE.SphereGeometry(1,32,18),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.08}));
scene.add(sphere);

function makeArrow(color){
 const g=new THREE.Group();
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1,10),new THREE.MeshBasicMaterial({color}));
 const cone=new THREE.Mesh(new THREE.ConeGeometry(.075,.22,14),new THREE.MeshBasicMaterial({color}));
 g.add(shaft,cone); g.userData={shaft,cone}; scene.add(g); return g;
}
function setArrow(g,v){
 const len=v.length(); g.visible=len>1e-6;if(!g.visible)return;
 const dir=v.clone().normalize(), up=new THREE.Vector3(0,1,0);
 g.userData.shaft.scale.set(1,len,1);g.userData.shaft.position.copy(dir.clone().multiplyScalar(len/2));
 g.userData.shaft.quaternion.setFromUnitVectors(up,dir);
 g.userData.cone.position.copy(dir.clone().multiplyScalar(len+.06));
 g.userData.cone.quaternion.setFromUnitVectors(up,dir);
}
const bArrow=makeArrow(0xffbd45),cArrow=makeArrow(0x48d9ff);
const handle=new THREE.Mesh(new THREE.SphereGeometry(.09,20,14),new THREE.MeshStandardMaterial({color:0xffbd45,emissive:0x5b3a00,emissiveIntensity:.8}));
scene.add(handle);

const bx=$('#bx'),by=$('#by'),bz=$('#bz');
function B(){let v=new THREE.Vector3(+bx.value,+by.value,+bz.value);if(v.length()<.04)v.set(1,0,0);return v.normalize()}
function setB(v){v=v.clone().normalize();bx.value=v.x;by.value=v.y;bz.value=v.z;updateAll()}
[bx,by,bz].forEach(e=>e.addEventListener('input',updateAll));
$('#normalize').addEventListener('click',()=>setB(B()));
$('#randomize').addEventListener('click',()=>setB(new THREE.Vector3(Math.random()*2-1,Math.random()*2-1,Math.random()*2-1)));

function mul(A,v){return new THREE.Vector3(
 A[0][0]*v.x+A[0][1]*v.y+A[0][2]*v.z,
 A[1][0]*v.x+A[1][1]*v.y+A[1][2]*v.z,
 A[2][0]*v.x+A[2][1]*v.y+A[2][2]*v.z)}
function det(A){return A[0][0]*(A[1][1]*A[2][2]-A[1][2]*A[2][1])-A[0][1]*(A[1][0]*A[2][2]-A[1][2]*A[2][0])+A[0][2]*(A[1][0]*A[2][1]-A[1][1]*A[2][0])}
function roots(A){
 const tr=A[0][0]+A[1][1]+A[2][2];
 const A2=[0,1,2].map(r=>[0,1,2].map(c=>A[r][0]*A[0][c]+A[r][1]*A[1][c]+A[r][2]*A[2][c]));
 const tr2=A2[0][0]+A2[1][1]+A2[2][2],s2=(tr*tr-tr2)/2,d=det(A);
 const a=-tr,b=s2,c=-d,p=b-a*a/3,q=2*a*a*a/27-a*b/3+c,disc=q*q/4+p*p*p/27;
 if(disc>1e-10){const sd=Math.sqrt(disc),u=Math.cbrt(-q/2+sd),v=Math.cbrt(-q/2-sd);return [{re:u+v-a/3,im:0},{re:-(u+v)/2-a/3,im:Math.abs(Math.sqrt(3)*(u-v)/2)},{re:-(u+v)/2-a/3,im:-Math.abs(Math.sqrt(3)*(u-v)/2)}]}
 if(Math.abs(p)<1e-12)return [{re:-a/3,im:0},{re:-a/3,im:0},{re:-a/3,im:0}];
 const rr=2*Math.sqrt(Math.max(0,-p/3)),arg=Math.max(-1,Math.min(1,(3*q/(2*p))*Math.sqrt(-3/p))),phi=Math.acos(arg);
 return [0,1,2].map(k=>({re:rr*Math.cos((phi+2*Math.PI*k)/3)-a/3,im:0})).sort((x,y)=>y.re-x.re);
}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function eigvec(A,l){
 const M=A.map((row,r)=>row.map((x,c)=>x-(r===c?l:0)));
 let cs=[cross(M[0],M[1]),cross(M[0],M[2]),cross(M[1],M[2])];
 cs.sort((a,b)=>Math.hypot(...b)-Math.hypot(...a));let v=new THREE.Vector3(...cs[0]);
 if(v.length()<1e-7){
   // repeated eigenvalue fallback: find a vector perpendicular to strongest row
   const rows=M.map(x=>new THREE.Vector3(...x)).sort((a,b)=>b.lengthSq()-a.lengthSq());
   const r=rows[0]; if(r.length()<1e-8)v.set(1,0,0); else v.copy(r).cross(Math.abs(r.x)<.8?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0));
 }
 return v.normalize();
}
function fmt(x){return Math.abs(x)<5e-5?'0':x.toFixed(3).replace(/\.?0+$/,'')}
function vfmt(v){return `(${fmt(v.x)}, ${fmt(v.y)}, ${fmt(v.z)})`}

function rebuildEigen(A,rs){
 while(eigenGroup.children.length)eigenGroup.remove(eigenGroup.children[0]);
 const real=[],unique=[];
 rs.filter(r=>Math.abs(r.im)<1e-7).forEach(r=>{
   const v=eigvec(A,r.re);
   if(!unique.some(e=>Math.abs(e.v.dot(v))>.998)){unique.push({l:r.re,v});}
 });
 unique.forEach((e,i)=>{
   const colors=[0xb79cff,0x58e09a,0xff7fa4], col=colors[i%3];
   const pts=[e.v.clone().multiplyScalar(-3.2),e.v.clone().multiplyScalar(3.2)];
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.85}));
   eigenGroup.add(line); real.push(e);
 });
 $('#eigenvectors').innerHTML=real.length?real.map((e,i)=>`<div class="eig-item"><b>v${i+1}</b><code>${vfmt(e.v)} &nbsp; λ=${fmt(e.l)}</code></div>`).join(''):`<div class="eig-item"><b>—</b><code>No real direction displayed</code></div>`;
 return real;
}

function updateAll(){
 const A=getA(),b=B(),c=mul(A,b);
 bx.value=b.x;by.value=b.y;bz.value=b.z;
 $('#bxo').value=fmt(b.x);$('#byo').value=fmt(b.y);$('#bzo').value=fmt(b.z);
 $('#bval').textContent=vfmt(b);$('#cval').textContent=vfmt(c);
 setArrow(bArrow,b);setArrow(cArrow,c);handle.position.copy(b);

 // Three.js Matrix4 is column-major; set explicitly for x' = A x.
 const m=new THREE.Matrix4();
 m.set(A[0][0],A[0][1],A[0][2],0,A[1][0],A[1][1],A[1][2],0,A[2][0],A[2][1],A[2][2],0,0,0,0,1);
 transformedCube.matrixAutoUpdate=false;transformedCube.matrix.copy(m);

 const rs=roots(A);
 $('#eigenvalues').innerHTML=rs.map((r,i)=>`<div class="eig-item"><b>λ${i+1}</b><code>${fmt(r.re)}${Math.abs(r.im)>1e-7?(r.im>=0?' + ':' − ')+fmt(Math.abs(r.im))+'i':''}</code></div>`).join('');
 rebuildEigen(A,rs);
 const complex=rs.find(r=>Math.abs(r.im)>1e-7),note=$('#complex-note');
 if(complex){note.hidden=false;note.textContent='Complex conjugate pair detected: only the real eigenvector direction is drawn.'}else note.hidden=true;

 const cn=c.length(), crossLen=b.clone().cross(c).length(), alignment=cn<1e-7?0:crossLen/cn;
 const lambda=b.dot(c); const status=$('#alignment');
 if(cn<1e-7){status.className='status found';status.textContent='Eigenvector direction found • λ = 0';}
 else if(alignment<.035){status.className='status found';status.textContent=`Eigenvector direction found • λ ≈ ${fmt(lambda)}`;}
 else {status.className='status';status.textContent=`Not aligned • direction error ≈ ${(Math.asin(Math.min(1,alignment))*180/Math.PI).toFixed(1)}°`;}
}

$('#show-original').addEventListener('change',e=>originalGroup.visible=e.target.checked);
$('#show-transformed').addEventListener('change',e=>transformedGroup.visible=e.target.checked);
$('#show-eigen').addEventListener('change',e=>eigenGroup.visible=e.target.checked);
$('#show-sphere').addEventListener('change',e=>sphere.visible=e.target.checked);
$('#reset-camera').addEventListener('click',()=>{camera.position.set(5.7,4.6,5.8);controls.target.set(0,0,0);controls.update()});

// Drag the B endpoint on the unit sphere using a screen-facing plane through the origin,
// then project the pointer intersection back onto the sphere.
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(), dragPlane=new THREE.Plane(), hit=new THREE.Vector3();
let dragging=false;
function pointerNDC(e){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1}
renderer.domElement.addEventListener('pointerdown',e=>{
 pointerNDC(e);raycaster.setFromCamera(pointer,camera);
 if(raycaster.intersectObject(handle,false).length){dragging=true;controls.enabled=false;dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),new THREE.Vector3(0,0,0));renderer.domElement.setPointerCapture(e.pointerId)}
});
renderer.domElement.addEventListener('pointermove',e=>{
 if(!dragging)return;pointerNDC(e);raycaster.setFromCamera(pointer,camera);
 if(raycaster.ray.intersectPlane(dragPlane,hit)&&hit.length()>.03)setB(hit.clone().normalize());
});
renderer.domElement.addEventListener('pointerup',e=>{dragging=false;controls.enabled=true;try{renderer.domElement.releasePointerCapture(e.pointerId)}catch{}});
renderer.domElement.addEventListener('pointercancel',()=>{dragging=false;controls.enabled=true});

function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(stage);resize();
function loop(){controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)}loop();
setMatrix(presets.symmetric);
