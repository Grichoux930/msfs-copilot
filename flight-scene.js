/* Lightweight, local 3D mesh renderer. No remote models, trackers or libraries. */
(() => {
  'use strict';
  const canvas = document.getElementById('flight-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const faces = [];
  const face = (points, color) => faces.push({points, color});
  // Coordinates: nose +X, up +Y, starboard +Z.
  function body(sections, offset, color, sides = 40) {
    const rings = sections.map(([x, ry, rz]) => Array.from({length:sides}, (_,i) => {
      const a=i/sides*Math.PI*2; return [x+offset[0], Math.cos(a)*ry+offset[1],Math.sin(a)*rz+offset[2]];
    }));
    for(let r=0;r<rings.length-1;r++) for(let i=0;i<sides;i++) face([rings[r][i],rings[r][(i+1)%sides],rings[r+1][(i+1)%sides],rings[r+1][i]],color);
  }
  // More stations keep the fuselage smooth and improve depth ordering.
  body([[-4.8,.025,.025],[-4.3,.12,.13],[-3.8,.24,.25],[-3,.36,.35],[-2.2,.45,.43],[-1.5,.49,.46],[-.8,.50,.47],[0,.51,.47],[.8,.51,.47],[1.6,.51,.47],[2.1,.49,.46],[2.6,.43,.42],[3,.35,.36],[3.4,.25,.28],[3.8,.13,.17],[4.2,.015,.02]],[0,0,0],[216,228,237]);
  function foil(points, thickness, color){
    face(points.map(p=>[p[0],p[1]+thickness,p[2]]),color);
    face([...points].reverse().map(p=>[p[0],p[1]-thickness,p[2]]),[color[0]*.65,color[1]*.65,color[2]*.65]);
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];face([[a[0],a[1]+thickness,a[2]],[b[0],b[1]+thickness,b[2]],[b[0],b[1]-thickness,b[2]],[a[0],a[1]-thickness,a[2]]],color);}
  }
  for(const side of [-1,1]){
    foil([[1,-.13,side*.3],[-1.8,-.08,side*4.9],[-2.5,-.08,side*4.85],[-1.5,-.13,side*.3]],.055,[159,183,205]);
    foil([[-3,.13,side*.15],[-4.1,.2,side*2.15],[-4.65,.2,side*2.1],[-4.35,.13,side*.15]],.035,[173,198,215]);
    face([[-1.8,-.08,side*4.9],[-2.1,.48,side*5.03],[-2.55,.44,side*5.0],[-2.5,-.08,side*4.85]],[84,168,209]);
    body([[-2.9,.1,.1],[-2.55,.29,.29],[-1.3,.3,.3],[-1.13,.25,.25]], [0,.2,side*.78],[187,207,224],32);
    face(Array.from({length:16},(_,i)=>[-1.12,.2+Math.cos(i*Math.PI/8)*.22,side*.78+Math.sin(i*Math.PI/8)*.22]),[17,35,48]);
    // Cockpit glazing and cabin windows.
    face([[3.4,.19,side*.23],[2.85,.39,side*.32],[2.1,.43,side*.37],[2.2,.21,side*.45]],[24,67,91]);
    for(let x=-1.1;x<1.9;x+=.48) face([[x,.15,side*.465],[x+.23,.15,side*.465],[x+.23,.32,side*.411],[x,.32,side*.411]],[25,62,83]);
    face([[2.2,-.08,side*.47],[-2.7,-.08,side*.37],[-3.5,.02,side*.28],[-2.6,.02,side*.39],[2.2,.02,side*.48]],[53,136,177]);
  }
  for(const side of [-1,1]) {
    face([[-3.05,.25,side*.05],[-3.8,1.8,side*.035],[-4.38,1.8,side*.035],[-4.45,.15,side*.05]],[55,131,174]);
    face([[-3.64,1.40,side*.038],[-4.37,1.20,side*.038],[-4.38,1.05,side*.04],[-3.72,1.24,side*.04]],[185,227,246]);
    // Engine mounting pylons and subtle control-surface detail.
    foil([[-1.5,.15,side*.4],[-1.7,.2,side*.85],[-2.6,.2,side*.85],[-2.7,.15,side*.4]],.035,[146,172,193]);
    face([[-1.8,-.018,side*3.0],[-2.20,-.018,side*4.75],[-2.36,-.018,side*4.74],[-2.02,-.018,side*3.0]],[113,146,169]);
  }
  let width=0,height=0,yaw=-.38,pitch=-.42,drag=null,paused=reduced.matches,visible=true,raf=0,last=0,phase=0;
  const pauseButton=document.getElementById('flight-motion');
  const rotate=p=>{const c=Math.cos(yaw),s=Math.sin(yaw),x=p[0]*c-p[2]*s,z=p[0]*s+p[2]*c;return [x,p[1]*Math.cos(pitch)-z*Math.sin(pitch),p[1]*Math.sin(pitch)+z*Math.cos(pitch)];};
  const project=p=>{const scale=Math.min(width/14,height/8.2)*15/(15+p[2]);return [width*.53+p[0]*scale,height*.58-p[1]*scale];};
  function draw(){
    ctx.clearRect(0,0,width,height);
    ctx.strokeStyle='rgba(113,198,244,.10)';ctx.lineWidth=1;
    for(let r=1;r<=3;r++){ctx.beginPath();ctx.ellipse(width*.53,height*.68,Math.min(width*.42,340)*r/3,85*r/3,0,0,Math.PI*2);ctx.stroke();}
    const shadow=ctx.createRadialGradient(width*.53,height*.74,0,width*.53,height*.74,width*.3);shadow.addColorStop(0,'rgba(0,0,0,.4)');shadow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=shadow;ctx.fillRect(0,height*.55,width,height*.4);
    const transformed=faces.map(f=>({...f,points:f.points.map(rotate)})).sort((a,b)=>b.points.reduce((s,p)=>s+p[2],0)/b.points.length-a.points.reduce((s,p)=>s+p[2],0)/a.points.length);
    transformed.forEach(f=>{const [a,b,c]=f.points,u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;const light=.55+.45*Math.abs((n[0]*-.3+n[1]*.8+n[2]*-.5)/len);ctx.beginPath();f.points.map(project).forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=`rgb(${f.color.map(c=>Math.round(c*light)).join(',')})`;ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.5;ctx.stroke();});
  }
  function loop(t){raf=0;if(!visible||document.hidden||paused||drag)return;if(t-last>32){phase+=.012;yaw=-.38+Math.sin(phase)*.13;pitch=-.42+Math.sin(phase*.7)*.035;draw();last=t;}raf=requestAnimationFrame(loop);}
  function start(){if(!raf&&!paused&&visible&&!document.hidden&&!drag)raf=requestAnimationFrame(loop);}
  function stop(){cancelAnimationFrame(raf);raf=0;}
  function state(){pauseButton.setAttribute('aria-pressed',String(paused));const en=document.documentElement.lang==='en';pauseButton.querySelector('span').textContent=paused?(en?'Resume animation':'Reprendre animation'):(en?'Pause animation':'Pause animation');}
  pauseButton.addEventListener('click',()=>{paused=!paused;state();paused?stop():start();});
  document.getElementById('flight-reset').addEventListener('click',()=>{yaw=-.38;pitch=-.42;phase=0;draw();});
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw,pitch};canvas.setPointerCapture(e.pointerId);stop();});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.006;pitch=Math.max(-1.0,Math.min(.6,drag.pitch+(e.clientY-drag.y)*.004));draw();});
  function release(){if(!drag)return;drag=null;paused=true;state();}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?start():stop();}).observe(canvas);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  reduced.addEventListener('change',e=>{paused=e.matches;state();paused?stop():start();});
  new MutationObserver(state).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  state();start();
})();
