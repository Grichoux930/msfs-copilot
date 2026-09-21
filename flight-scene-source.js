import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('flight-canvas');
const section = document.querySelector('.flight-scene');
const status = document.getElementById('flight-status');
const pause = document.getElementById('flight-motion');
const reset = document.getElementById('flight-reset');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches, inView = false, model, renderer, scene, camera;
let frame = 0, drag = null, last = 0, angle = -.28, targetAngle = -.28, tilt = 0, targetTilt = 0, phase = 0;
let failed = false, loaded = false;
function label() {
  const en = document.documentElement.lang === 'en';
  pause.setAttribute('aria-pressed', String(paused));
  pause.querySelector('span').textContent = paused ? (en ? 'Animate' : 'Animer') : (en ? 'Pause' : 'Pause');
  canvas.setAttribute('aria-label', en ? 'Interactive aircraft. Use left and right arrow keys to rotate.' : 'Avion interactif. Utilisez les flèches gauche et droite pour tourner.');
  status.textContent = failed ? (en ? 'The 3D view could not load. Reload the page to try again.' : 'La vue 3D n’a pas pu charger. Actualisez la page pour réessayer.') : (en ? 'Preparing your aircraft…' : 'Préparation de votre avion…');
}
function stop(){ cancelAnimationFrame(frame); frame = 0; }
function draw(){ if (renderer && model) renderer.render(scene,camera); }
function tick(time){
  frame=0;
  if(!loaded || !inView || document.hidden) return;
  const delta=Math.min((time-last)/1000,.05); last=time;
  if(!paused && !drag) {phase+=delta;targetAngle=-.28+Math.sin(phase*.23)*.22;targetTilt=Math.sin(phase*.34)*.018;}
  angle+=(targetAngle-angle)*.12;tilt+=(targetTilt-tilt)*.12;
  model.rotation.y=angle;model.rotation.z=tilt;
  draw();
  if(!paused || drag || Math.abs(targetAngle-angle)>.001 || Math.abs(targetTilt-tilt)>.001) frame=requestAnimationFrame(tick);
}
function start(){if(loaded&&inView&&!document.hidden&&!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
function resize(){
  if(!renderer)return;
  const {width,height}=canvas.getBoundingClientRect();
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  // A fixed bounding sphere keeps all aircraft parts visible at any rotation.
  const vfov=THREE.MathUtils.degToRad(camera.fov),hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect);
  const distance=6.8/Math.sin(Math.min(vfov,hfov)/2);
  camera.position.set(.92,.48,-1.1).normalize().multiplyScalar(distance);
  camera.lookAt(0,0,0);camera.updateProjectionMatrix();draw();
}
async function init(){
  try {
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(32,1,.1,150);
    const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
    const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xc8e8ff,0x162332,2.2));
    const key=new THREE.DirectionalLight(0xfff4e8,3.2);key.position.set(3,7,-5);scene.add(key);
    const rim=new THREE.DirectionalLight(0x79cfff,2.2);rim.position.set(-5,2,4);scene.add(rim);
    const gltf=await new GLTFLoader().loadAsync('assets/aircraft.glb');
    const aircraft=gltf.scene;
    aircraft.traverse(obj=>{if(obj.isMesh){const m=obj.material;m.roughness=.36;m.metalness=.18;}});
    const box=new THREE.Box3().setFromObject(aircraft),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const scale=10.8/Math.max(size.x,size.y,size.z);
    aircraft.position.copy(center).multiplyScalar(-scale);aircraft.scale.setScalar(scale);
    model=new THREE.Group();model.add(aircraft);model.rotation.y=angle;scene.add(model);
    loaded=true;section.classList.add('flight-ready');status.hidden=true;
    pause.disabled=false;reset.disabled=false;resize();start();
  } catch(error) {failed=true;section.classList.add('flight-unavailable');label();console.warn('NavCrew 3D:',error.message);}
}
pause.disabled=true;reset.disabled=true;
pause.addEventListener('click',()=>{paused=!paused;label();if(!paused){phase=0;start();}});
reset.addEventListener('click',()=>{targetAngle=-.28;targetTilt=0;phase=0;start();});
canvas.addEventListener('pointerdown',e=>{if(!loaded)return;paused=true;label();drag={x:e.clientX,y:e.clientY,angle,tilt};canvas.setPointerCapture(e.pointerId);start();});
canvas.addEventListener('pointermove',e=>{if(!drag)return;targetAngle=drag.angle+(e.clientX-drag.x)*.008;targetTilt=THREE.MathUtils.clamp(drag.tilt+(e.clientY-drag.y)*.002,-.18,.18);start();});
const release=()=>{drag=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
canvas.addEventListener('keydown',e=>{if(!loaded||!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();paused=true;label();targetAngle=e.key==='Home'?-.28:targetAngle+(e.key==='ArrowRight'?.15:-.15);start();});
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView){if(!renderer&&!failed)init();else start();}else stop();},{rootMargin:'100px'}).observe(canvas);
document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
reduced.addEventListener('change',e=>{paused=e.matches;label();if(paused)stop();else start();});
new MutationObserver(label).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();failed=true;status.hidden=false;label();});
label();
