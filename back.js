/* ============ Generador congruencial (el mismo del juego) ============ */
class RNG{
  constructor(s){this.x=s%65536}
  next(){this.x=(25173*this.x+13849)%65536;return this.x/65536}
  int(a,b){return a+Math.floor(this.next()*(b-a+1))}
  pick(a){return a[this.int(0,a.length-1)]}
  shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=this.int(0,i);[a[i],a[j]]=[a[j],a[i]]}return a}
}
const rng=new RNG(Date.now());

/* ============ Resolutor: guarda pasos y cuenta operaciones ============ */
class Resolutor{
  constructor(){this.pasos=[];this.ops={}}
  op(tipo,texto,n=1){this.ops[tipo]=(this.ops[tipo]||0)+n;this.pasos.push(texto)}
}

/* ============ Tiempo según las operaciones ============ */
const SEG={lectura:15,arit:4,mod:8,func:6,fact:5,clasif:5,orden:3,tabla:10,comp:3};
function calcularTiempo(ops,margen=1.2){
  let total=SEG.lectura;
  for(const [t,n] of Object.entries(ops)) total+=n*(SEG[t]||0);
  return Math.ceil(total*margen/5)*5;
}

/* ============ Plantillas del nivel 1 (Monte Carlo con un dado) ============ */
function tDado(rng,n){
  const cara=rng.int(1,6),r=new Resolutor(),Rs=[];let veces=0;
  for(let i=0;i<n;i++)Rs.push(+rng.next().toFixed(4));
  Rs.forEach((R,i)=>{
    const p=6*R,e=Math.floor(p),c=e+1;
    r.op("arit",`R${i+1} = ${R}: 6 × ${R} = ${p.toFixed(4)}, parte entera = ${e}, más 1 → sale la cara ${c}`,2);
    const ok=c===cara;
    r.op("comp",`¿${c} = ${cara}? ${ok?"Sí, se cuenta":"No"}`);
    if(ok)veces++;
  });
  return{
    enunciado:`Dado: cara = (parte entera de 6R) + 1. Con R = ${Rs.join(", ")}, ¿cuántas veces salió la cara ${cara}?`,
    respuesta:veces,respuestaTexto:`${veces} ${veces===1?"vez":"veces"}`,pasos:r.pasos,ops:r.ops,
    explicacion:`En Monte Carlo cada número aleatorio R se transforma en un resultado del experimento. Aquí 6R da un valor entre 0 y 6; su parte entera (0 a 5) más 1 es la cara del dado. Después solo se cuentan las veces que apareció la cara ${cara}.`
  };
}
function tSuma(rng,n){
  const r=new Resolutor(),Rs=[];let suma=0;
  for(let i=0;i<n;i++)Rs.push(+rng.next().toFixed(4));
  Rs.forEach((R,i)=>{
    const p=6*R,e=Math.floor(p),c=e+1,ant=suma;suma+=c;
    r.op("arit",`R${i+1} = ${R}: 6 × ${R} = ${p.toFixed(4)}, parte entera = ${e}, más 1 → cara ${c}; acumulado ${ant} + ${c} = ${suma}`,3);
  });
  return{
    enunciado:`Dado: cara = (parte entera de 6R) + 1. Con R = ${Rs.join(", ")}, ¿cuál es la suma de las caras obtenidas?`,
    respuesta:suma,respuestaTexto:`${suma}`,pasos:r.pasos,ops:r.ops,
    explicacion:`Cada R se convierte en una cara del dado con (parte entera de 6R) + 1. Como en una simulación Monte Carlo se repite el experimento varias veces, aquí se van sumando los resultados de cada tirada.`
  };
}
const PLANT={revivir:[tDado,tSuma],jefe:[tDado,tSuma]};
const RANGO={revivir:{n:[3,5],t:[60,90]},jefe:{n:[8,9],t:[120,150]}};

function generarProblema(tipo){
  const {n,t}=RANGO[tipo];let p;
  for(let k=0;k<30;k++){
    p=rng.pick(PLANT[tipo])(rng,rng.int(n[0],n[1]));
    p.tiempo=calcularTiempo(p.ops);
    if(p.tiempo>=t[0]&&p.tiempo<=t[1]){p.fuera=false;return p}
  }
  p.fuera=true;p.tiempo=Math.min(Math.max(p.tiempo,t[0]),t[1]);return p;
}
const acierta=(v,p)=>Math.abs(v-p.respuesta)<=Math.abs(p.respuesta)*0.01+0.0001;

/* ============ Preguntas teóricas (la primera opción es la correcta) ============ */
const PREGUNTAS=[
{q:"¿Qué es la simulación?",o:["Imitar el comportamiento de un sistema real con un modelo para experimentar con él","Resolver únicamente ecuaciones de forma analítica","Construir físicamente una copia del sistema real","Medir un sistema real sin usar ningún modelo"]},
{q:"Una ventaja de la simulación es…",o:["Probar cambios sin alterar el sistema real","Que siempre da la solución exacta","Que no necesita datos","Que no requiere validar el modelo"]},
{q:"Una variable de decisión (factor controlable) es…",o:["Un valor que el analista puede elegir para probar escenarios","Un resultado que no se puede medir","Un número aleatorio fijo","Un error del programa"]},
{q:"El método Monte Carlo se basa en…",o:["Usar números aleatorios para muestrear el experimento","Derivar funciones","Resolver sistemas de ecuaciones lineales","Observar el sistema real durante meses"]},
{q:"La variable de respuesta es…",o:["El resultado que se mide al correr el experimento","El primer número aleatorio","La semilla del generador","El tiempo que tarda en compilar el programa"]},
{q:"Validar un modelo significa comprobar que…",o:["Representa adecuadamente al sistema real","El código no tiene errores de sintaxis","Corre en menos de un segundo","Usa muchos números aleatorios"]},
{q:"Un modelo estocástico se distingue porque…",o:["Incluye variables aleatorias","No tiene variables","Siempre da el mismo resultado","Solo describe sistemas sin tiempo"]},
{q:"Una limitación de la simulación es que…",o:["Sus resultados son estimaciones que dependen de la calidad del modelo y los datos","No permite comparar alternativas","Solo funciona con sistemas pequeños","No puede usar números aleatorios"]}
];

/* ============ Juego ============ */
const W=480,H=270,GRAV=600,FLAP=-190,SPEED=110,GAP=84,PW=32,FX=90,RAD=8,LAMBDA=0.6;
const cv=document.getElementById("c"),g=cv.getContext("2d"),panelEl=document.getElementById("panel");
const G={};let tm=null;
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ===== Pixel art: resolución lógica 480×270, se escala sin suavizado ===== */
const ASSETS={rama:"img/rama.png"};
const IMG={};let RAMA_PAT=null;
function cargar(k,src){const i=new Image();i.onload=()=>{
  IMG[k]=i;
  if(k==="rama"){
    const mosaico=document.createElement("canvas");
    mosaico.width=PW;mosaico.height=Math.round(PW*i.height/i.width);
    const x=mosaico.getContext("2d");x.imageSmoothingEnabled=false;x.drawImage(i,0,0,mosaico.width,mosaico.height);
    RAMA_PAT=g.createPattern(mosaico,"repeat");
  }
};i.src=src}
for(const k in ASSETS)if(ASSETS[k])cargar(k,ASSETS[k]);
const icono=(k,e)=>IMG[k]?`<img class="pix" src="${IMG[k].src}" alt="">`:e;
function rama(x,y,w,h,arriba){
  if(h<=0)return;
  g.fillStyle="#2f8248";g.fillRect(x,y,w,h);
  g.fillStyle="#70bd62";g.fillRect(x+3,y,5,h);
  g.fillStyle="#1e6139";g.fillRect(x+w-4,y,4,h);
  if(RAMA_PAT){
    g.save();g.beginPath();g.rect(x+1,y,w-2,h);g.clip();
    g.translate(x,y);g.fillStyle=RAMA_PAT;g.fillRect(0,0,w,h);g.restore();
  }
  const tapaY=arriba?y+h-8:y;
  g.fillStyle="#3c9b51";g.fillRect(x-4,tapaY,w+8,8);
  g.fillStyle="#83d276";g.fillRect(x-3,tapaY+1,w+6,2);
  g.strokeStyle="#174d31";g.lineWidth=2;g.strokeRect(x-4,tapaY,w+8,8);
}

function nuevo(){
  Object.assign(G,{estado:"inicio",puntos:0,y:H/2,vy:0,hearts:3,seg:0,spawned:0,pipes:[],next:1,cd:0,inv:0,preg:rng.shuffle(PREGUNTAS)});
  hud();
}
function hud(){
  document.getElementById("h1").textContent=(NOMBRE?NOMBRE+" · ":"")+"Nivel 1 · "+"❤".repeat(Math.max(G.hearts,0))+"🖤".repeat(3-Math.max(G.hearts,0));
  document.getElementById("h2").textContent=`Puntos ${G.puntos} · Récord ${leerRecord().puntos} · `+(G.seg<2?`Monstruo ${G.seg+1} de 3`:"Jefe final");
}
function panel(html){clearInterval(tm);panelEl.innerHTML=html;panelEl.style.display="block"}
function ocultar(){panelEl.style.display="none"}
function timer(seg,onTick,onEnd){
  clearInterval(tm);const t0=performance.now();
  tm=setInterval(()=>{
    const left=seg-(performance.now()-t0)/1000;onTick(Math.max(left,0));
    if(left<=0){clearInterval(tm);onEnd()}
  },100);
}
function retomar(){G.spawned=0;G.pipes=[];G.next=1;G.cd=3;G.y=H/2;G.vy=0;G.estado="cuenta";ocultar();hud()}

function inicioViejo(){
  panel(`<h3>🧚 Hadas vs Monstruos: Nivel 1</h3>
  <p>Toca la pantalla o presiona espacio para aletear y esquiva las ramas. Cada 10 ramas aparece un monstruo: los dos primeros te hacen una pregunta (20 s) y el tercero es el jefe, con un problema.</p>
  <p>Chocar con una rama quita un corazón. Si fallas una pregunta, pierdes un corazón y debes resolver un problema para revivir. Si fallas ese problema, se muestra la solución y termina la partida.</p>
  <button id="jugar">Jugar</button>`);
  document.getElementById("jugar").onclick=()=>retomar();
}
/* ===== Jugador, hadas y récord ===== */
const MAXPTS=55; // 2 preguntas × 5 + jefe 15 + 3 corazones × 10
let NOMBRE="",SEL=0,recMem={nombre:"—",puntos:0};
const HADA_RUTAS=Array.from({length:6},(_,i)=>`img/hada${i+1}.png`);
const HADAS=[];
const cargarHadas=Promise.all(HADA_RUTAS.map(ruta=>new Promise((resolve,reject)=>{
  const imagen=new Image();
  imagen.onload=()=>resolve(imagen);
  imagen.onerror=()=>reject(new Error(`No se pudo cargar ${ruta}`));
  imagen.src=ruta;
}))).then(hadas=>HADAS.push(...hadas));
function leerRecord(){try{const r=JSON.parse(localStorage.getItem("hvm_record_n1"));if(r)return r}catch(e){}return recMem}
function guardarRecord(){
  const r=leerRecord();if(G.puntos<=r.puntos)return false;
  recMem={nombre:NOMBRE,puntos:G.puntos};
  try{localStorage.setItem("hvm_record_n1",JSON.stringify(recMem))}catch(e){}
  return true;
}
function inicio(){
  const r=leerRecord();
  panel(`<h3>🧚 Hadas vs Monstruos: Nivel 1</h3><p>Récord: <b>${r.puntos}</b> (<span id="rn"></span>)</p>
  <p><input id="nom" maxlength="12" placeholder="Tu nombre"></p><p>Elige a tu hada:</p><div id="hs"></div>
  <p><button id="jugar">Jugar</button></p>
  <small>Espacio o toque = aletear. Cada 10 ramas aparece un monstruo: dos con pregunta (20 s) y el jefe con un problema. Chocar quita un corazón; si fallas una pregunta, resuelve un problema para revivir.</small>`);
  document.getElementById("rn").textContent=r.nombre;
  const nom=document.getElementById("nom");nom.value=NOMBRE;nom.oninput=()=>{NOMBRE=nom.value};
  const hs=document.getElementById("hs");
  HADAS.forEach((h,i)=>{
    const d=document.createElement("div"),imagen=document.createElement("img");
    d.className="card"+(i===SEL?" sel":"");
    imagen.className="fairy-option";imagen.src=HADA_RUTAS[i];imagen.alt=`Hada ${i+1}`;
    d.appendChild(imagen);
    d.onclick=()=>{SEL=i;hs.querySelectorAll(".card").forEach((e,j)=>e.classList.toggle("sel",j===i))};
    hs.appendChild(d);
  });
  const jg=document.getElementById("jugar");
  jg.onclick=()=>{NOMBRE=nom.value.trim()||"Jugador";nuevo();retomar()};
  nom.onkeydown=e=>{if(e.key==="Enter")jg.click()};
}
function cerrar(titulo,msg,gano){
  G.estado="fin";
  if(gano)G.puntos+=G.hearts*10;
  const esNuevo=guardarRecord(),r=leerRecord();
  panel(`<h3>${titulo}</h3><p>${msg}</p>
  <p>Puntaje de <span id="pn"></span>: <b>${G.puntos}</b> de ${MAXPTS} ${esNuevo?'<span class="ok">¡Nuevo récord!</span>':''}</p>
  <p>Récord: <b>${r.puntos}</b> (<span id="rn"></span>)</p><button id="rei">Jugar otra vez</button><button id="cj">Cambiar jugador</button>`);
  document.getElementById("pn").textContent=NOMBRE;document.getElementById("rn").textContent=r.nombre;
  document.getElementById("rei").onclick=()=>{nuevo();retomar()};
  document.getElementById("cj").onclick=()=>{nuevo();inicio()};
  hud();
}
function fin(msg){cerrar("Fin de la partida",msg,false)}
function nivelCompleto(){cerrar("🎉 ¡Nivel 1 completado!",`Corazones restantes: ${G.hearts} (10 puntos cada uno).`,true)}

function golpe(piso){
  if(G.inv>0)return;
  G.hearts--;hud();
  if(piso){G.y=H/2;G.vy=0}
  if(G.hearts<=0)return fin("Te quedaste sin corazones.");
  G.inv=2;
}
function monstruo(){
  G.estado="pausa";
  if(G.seg<2)pregunta();else problema("jefe",()=>{G.puntos+=15;nivelCompleto()},p=>{
    G.hearts--;hud();
    solucion(p,()=>G.hearts<=0?fin("Fallaste al jefe y no quedan corazones."):revivir());
  });
}
function pregunta(){
  const q=G.preg[G.seg],ops=rng.shuffle(q.o.map((t,i)=>({t,ok:i===0})));
  panel(`<h3>${icono("monstruo","👹")} Monstruo ${G.seg+1}</h3><p>${q.q}</p><div class="barra"><i id="b"></i></div><p id="t">20 s</p>`+
    ops.map((o,i)=>`<button class="op" data-i="${i}">${o.t}</button>`).join("")+`<p id="fb"></p>`);
  let listo=false;
  const resolver=ok=>{
    if(listo)return;listo=true;clearInterval(tm);
    const fb=document.getElementById("fb");
    if(ok){G.puntos+=5;hud();fb.innerHTML='<span class="ok">¡Correcto! Monstruo derrotado.</span>';setTimeout(()=>{G.seg++;retomar()},1000)}
    else{fb.innerHTML='<span class="mal">Fallaste. Pierdes un corazón.</span>';setTimeout(()=>{G.hearts--;hud();G.hearts<=0?fin("Fallaste la pregunta y no quedan corazones."):revivir()},1200)}
  };
  panelEl.querySelectorAll(".op").forEach(b=>b.onclick=()=>resolver(ops[b.dataset.i].ok));
  timer(20,l=>{document.getElementById("b").style.width=(l/20*100)+"%";document.getElementById("t").textContent=Math.ceil(l)+" s"},()=>resolver(false));
}
function revivir(){
  problema("revivir",()=>{G.inv=2;retomar()},p=>solucion(p,()=>fin("No resolviste el problema para revivir.")));
}
function problema(tipo,ok,fail){
  const p=generarProblema(tipo);
  panel(`<h3>${tipo==="jefe"?icono("jefe","👹")+" Jefe final":"💀 Problema para revivir"}</h3><p>${p.enunciado}</p>
  <div class="barra"><i id="b"></i></div><p id="t">${p.tiempo} s</p>
  <input id="in" type="number" step="any" inputmode="decimal" placeholder="Tu respuesta"> <button id="rs">Responder</button><p id="fb"></p>`);
  const inp=document.getElementById("in");let listo=false;
  const fin_=bien=>{
    if(listo)return;listo=true;clearInterval(tm);
    const fb=document.getElementById("fb");
    if(bien){fb.innerHTML='<span class="ok">¡Correcto!</span>';setTimeout(ok,900)}
    else{fb.innerHTML='<span class="mal">Incorrecto o se acabó el tiempo.</span>';setTimeout(()=>fail(p),900)}
  };
  document.getElementById("rs").onclick=()=>{const v=parseFloat(inp.value);if(!isNaN(v))fin_(acierta(v,p))};
  inp.onkeydown=e=>{if(e.key==="Enter")document.getElementById("rs").click()};
  inp.focus();
  timer(p.tiempo,l=>{document.getElementById("b").style.width=(l/p.tiempo*100)+"%";document.getElementById("t").textContent=Math.ceil(l)+" s"},()=>fin_(false));
}
function solucion(p,sig){
  panel(`<h3>Solución</h3><p>${p.enunciado}</p><p class="ok">Respuesta correcta: ${p.respuestaTexto}</p>
  <p>${p.explicacion}</p><ol id="ps"></ol><button id="sg">Continuar</button>`);
  p.pasos.forEach((t,i)=>setTimeout(()=>{const li=document.createElement("li");li.textContent=t;const o=document.getElementById("ps");if(o)o.appendChild(li)},i*500));
  document.getElementById("sg").onclick=sig;
}
function finViejo(msg){
  G.estado="fin";
  panel(`<h3>Fin de la partida</h3><p>${msg}</p><button id="rei">Reintentar</button>`);
  document.getElementById("rei").onclick=()=>{nuevo();retomar()};
}
function nivelCompletoViejo(){
  G.estado="fin";
  panel(`<h3>🎉 ¡Nivel 1 completado!</h3><p>Corazones restantes: ${G.hearts}</p><button id="rei">Jugar otra vez</button>`);
  document.getElementById("rei").onclick=()=>{nuevo();retomar()};
}

function aletear(){if(G.estado==="vuelo")G.vy=FLAP}
cv.addEventListener("pointerdown",aletear);
addEventListener("keydown",e=>{if(e.code==="Space"&&document.activeElement.tagName!=="INPUT"){e.preventDefault();aletear()}});

let ult=performance.now();
function loop(ts){
  const dt=Math.min((ts-ult)/1000,0.033);ult=ts;
  if(G.estado==="cuenta"){G.cd-=dt;if(G.cd<=0)G.estado="vuelo"}
  if(G.estado==="vuelo"){
    G.vy+=GRAV*dt;G.y+=G.vy*dt;G.inv-=dt;
    if(G.spawned<10){
      G.next-=dt;
      if(G.next<=0){
        G.pipes.push({x:W,gy:rng.int(GAP/2+25,H-GAP/2-25)});G.spawned++;
        const x=-(1/LAMBDA)*Math.log(rng.next()||0.0001);G.next=Math.min(4,Math.max(1,x));
      }
    }
    G.pipes.forEach(p=>p.x-=SPEED*dt);
    G.pipes=G.pipes.filter(p=>p.x>-PW);
    for(const p of G.pipes){
      if(FX+RAD>p.x+6&&FX-RAD<p.x+PW-6&&(G.y-RAD<p.gy-GAP/2||G.y+RAD>p.gy+GAP/2)){golpe(false);break}
    }
    if(G.y>H-RAD||G.y<RAD)golpe(true);
    if(G.estado==="vuelo"&&G.spawned===10&&G.pipes.every(p=>p.x+PW<FX-RAD))monstruo();
  }
  dibujar();requestAnimationFrame(loop);
}
function dibujar(){
  g.imageSmoothingEnabled=false;
  if(IMG.fondo)g.drawImage(IMG.fondo,0,0,W,H);else{g.fillStyle=css("--sky");g.fillRect(0,0,W,H)}
  G.pipes.forEach(p=>{const x=Math.round(p.x),a=Math.round(p.gy-GAP/2),b=Math.round(p.gy+GAP/2);rama(x,0,PW,a,true);rama(x,b,PW,H-b,false)});
  g.globalAlpha=G.inv>0&&Math.floor(G.inv*8)%2?0.35:1;
  const h=HADAS[SEL];g.drawImage(h,Math.round(FX-16),Math.round(G.y-16),32,32);g.globalAlpha=1;
  g.textAlign="center";g.textBaseline="middle";g.fillStyle=css("--fg");
  if(G.estado==="cuenta"){g.font="bold 32px monospace";g.fillText(Math.ceil(G.cd),W/2,H/2-50)}
  g.font="10px monospace";g.textAlign="left";g.fillText(`Ramas del tramo: ${G.spawned}/10`,6,H-8);
}

/* ============ Probador de problemas ============ */
const out=document.getElementById("out");
document.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{
  const p=generarProblema(b.dataset.t);
  out.innerHTML=`<p><b>${p.enunciado}</b></p>
  <p>Tiempo asignado: <b>${p.tiempo} s</b> (rango ${RANGO[b.dataset.t].t.join(" a ")} s) · Operaciones: ${Object.entries(p.ops).map(([k,v])=>k+" "+v).join(", ")}</p>
  <p class="ok">Respuesta: ${p.respuestaTexto}</p><p>${p.explicacion}</p><ol>${p.pasos.map(s=>`<li>${s}</li>`).join("")}</ol>`;
});
document.getElementById("lote").onclick=()=>{
  let txt="";
  for(const tipo of ["revivir","jefe"]){
    let mn=1e9,mx=0,fuera=0;
    for(let i=0;i<200;i++){const p=generarProblema(tipo);mn=Math.min(mn,p.tiempo);mx=Math.max(mx,p.tiempo);if(p.fuera)fuera++}
    txt+=`<p>${tipo}: tiempos de ${mn} a ${mx} s (rango ${RANGO[tipo].t.join(" a ")} s), ${fuera} fuera de rango.</p>`;
  }
  out.innerHTML=txt;
};

cargarHadas.then(()=>{nuevo();inicio();requestAnimationFrame(loop)}).catch(error=>{
  console.error(error);
  panel("<p>No se pudieron cargar las hadas. Verifica que las imágenes de la carpeta img estén disponibles.</p>");
});