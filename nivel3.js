/* ==== Nivel 3 - pruebas de promedios,frecuencias y ks ==== */
(function(){
"use strict";

const RUTA_TABLAS="img/tablas/";
const f2=x=>x.toFixed(2),f3=x=>x.toFixed(3),f4=x=>x.toFixed(4);
const suma=a=>a.reduce((s,x)=>s+x,0);
const clamp=(x,a,b)=>Math.min(Math.max(x,a),b);
const genRs=(rng,n)=>Array.from({length:n},()=>+rng.next().toFixed(4));
const lista=Rs=>Rs.map(f4).join(", ");

const TABLA_Z={5:[0.475,1.96],2:[0.49,2.33],15:[0.425,1.44],20:[0.40,1.28],25:[0.375,1.15]};
const TABLA_CHI={5:{1:3.84,2:5.99,3:7.81,4:9.49,5:11.07},1:{1:6.63,2:9.21,3:11.34,4:13.28,5:15.09}};
// KS: d(α, N)
const TABLA_KS={10:{7:0.438,8:0.411},5:{7:0.486,8:0.457},1:{7:0.577,8:0.543}};

function calcProm(Rs,alfa){
  const N=Rs.length,S=suma(Rs),xb=S/N;
  const z0=(xb-0.5)*Math.sqrt(N)/Math.sqrt(1/12);
  const [area,zt]=TABLA_Z[alfa];
  return{N,S,xb,z0,area,zt,acepta:Math.abs(z0)<zt};
}
function calcFrec(Rs,n,alfa){
  const N=Rs.length,FE=N/n,FO=Array(n).fill(0);
  Rs.forEach(R=>FO[Math.min(Math.floor(R*n+1e-9),n-1)]++);
  const chi=suma(FO.map(o=>(o-FE)**2))/FE,gl=n-1,tabla=TABLA_CHI[alfa][gl];
  return{N,n,FE,FO,chi,gl,tabla,acepta:chi<tabla};
}
function calcKS(Rs,alfa){
  const N=Rs.length,x=Rs.slice().sort((a,b)=>a-b);
  const dif=x.map((xi,i)=>Math.abs((i+1)/N-xi));
  const Dn=Math.max(...dif);
  const imax=dif.map((d,i)=>Math.abs(d-Dn)<1e-9?i+1:0).filter(Boolean);
  const tabla=TABLA_KS[alfa][N];
  return{N,x,dif,Dn,imax,tabla,acepta:Dn<tabla};
}

const num=(id,label,val,o={})=>({id,kind:"num",label,val,rel:o.rel??0.01,atol:o.atol??0.0001,abs:!!o.abs,valores:o.valores,mostrar:o.mostrar??String(val)});
const entero=(id,label,val,valores)=>num(id,label,val,{rel:0,atol:1e-9,valores,mostrar:(valores||[val]).join(" o ")});
const deTabla=(id,label,val,dec)=>num(id,label,val,{rel:0,atol:Math.pow(10,-dec)/2+1e-9,mostrar:val.toFixed(dec)});
const veredicto=(acepta)=>({id:"ver",kind:"sel",label:"Veredicto",val:acepta?"aceptados":"rechazados",mostrar:acepta?"aceptados":"rechazados"});

function revisar(c,raw){
  if(c.kind==="sel")return raw===c.val;
  if(raw===""||raw==null)return false;
  const v=parseFloat(raw);if(isNaN(v))return false;
  if(c.valores)return c.valores.some(x=>Math.abs(v-x)<=c.atol);
  const a=c.abs?Math.abs(v):v,b=c.abs?Math.abs(c.val):c.val;
  return Math.abs(a-b)<=Math.abs(b)*c.rel+c.atol;
}

// modifique tiempos

function tPromedios(rng,n){
  n=clamp(n,4,6);
  const alfa=rng.pick([5,2,15,20,25]),Rs=genRs(rng,n),c=calcProm(Rs,alfa),r=new Resolutor();
  const comp=Math.abs(c.z0);
  r.op("arit",`Suma de los ${n} números: ${Rs.map(f4).join(" + ")} = ${f4(c.S)}`,n-1);
  r.op("arit",`X̄ = ΣR / N = ${f4(c.S)} / ${n} = ${f4(c.xb)}`);
  r.op("arit",`Z₀ = (X̄ − 1/2)·√N / √(1/12) = (${f4(c.xb)} − 0.5)·√${n} / √(1/12)`,3);
  r.op("func",`√${n} = ${f4(Math.sqrt(n))} y √(1/12) = 0.2887, así que Z₀ = ${f4(c.z0)}`,2);
  r.op("arit",`α real = 100% − ${alfa}% = ${100-alfa}% = ${(100-alfa)/100}; entre 2: ${c.area}`,2);
  r.op("tabla",`En la tabla Z se busca ${c.area} (o el valor más cercano): Z = ${f2(c.zt)}`);
  r.op("comp",`|Z₀| = ${f4(comp)} ${c.acepta?"<":"≥"} ${f2(c.zt)} → los números son ${c.acepta?"aceptados":"rechazados"}`);
  return{
    enunciado:`Prueba de promedios con α = ${alfa}% y N = ${n} números rectangulares: ${lista(Rs)}. Calcula el promedio, Z₀, el valor Z de la tabla (Z<sub>α real/2</sub>) y decide si los números rectangulares son aceptados o rechazados.`,
    respuesta:c.z0,respuestaTexto:`X̄ = ${f4(c.xb)}; Z₀ = ${f4(c.z0)}; Z = ${f2(c.zt)}; ${c.acepta?"aceptados":"rechazados"}`,
    pasos:r.pasos,ops:r.ops,tfijo:220,tmin:180,margen:1.8,
    explicacion:`Se aceptan los números si |Z₀| es menor que el Z de la tabla.`,
    campos:[
      num("xb","Promedio X̄",c.xb,{mostrar:f4(c.xb)}),
      num("z0","Z₀ (con o sin signo)",c.z0,{abs:true,mostrar:f4(Math.abs(c.z0))}),
      deTabla("zt","Valor Z de la tabla",c.zt,2),
      veredicto(c.acepta)
    ]
  };
}

function tFrecuencias(rng,N){
  const jefe=N>=7;
  N=jefe?clamp(N,8,10):clamp(N,4,6);
  const n=jefe?rng.pick([4,5]):rng.pick([2,3]),alfa=rng.pick([5,1]);
  const Rs=genRs(rng,N),c=calcFrec(Rs,n,alfa),r=new Resolutor();
  const lim=k=>[k/n,(k+1)/n].map(f4).join(" a ");
  Rs.forEach((R,i)=>{
    const k=Math.min(Math.floor(R*n+1e-9),n-1);
    r.op("clasif",`R${i+1} = ${f4(R)} cae en el intervalo ${k+1} (${lim(k)})`);
  });
  r.op("arit",`FE = N / n = ${N} / ${n} = ${c.FE}`);
  r.op("arit",`FO por intervalo: ${c.FO.map((o,k)=>`${k+1}→${o}`).join(", ")}`,0);
  r.op("arit",`Diferencias: ${c.FO.map(o=>`(${o} − ${c.FE})`).join(", ")}`,n);
  r.op("func",`Al cuadrado: ${c.FO.map(o=>f4((o-c.FE)**2)).join(", ")}`,n);
  r.op("arit",`χ²₀ = (1/FE)·Σ(FO − FE)² = (1/${c.FE})·${f4(suma(c.FO.map(o=>(o-c.FE)**2)))} = ${f4(c.chi)}`,n-1+1);
  r.op("arit",`Grados de libertad = n − 1 = ${c.gl}`);
  r.op("tabla",`En la tabla χ², gl = ${c.gl} y α = ${alfa}%: χ² = ${f2(c.tabla)}`);
  r.op("comp",`χ²₀ = ${f4(c.chi)} ${c.acepta?"<":"≥"} ${f2(c.tabla)} → los números son ${c.acepta?"aceptados":"rechazados"}`);
  return{
    enunciado:`Prueba de frecuencias con α = ${alfa}%, n = ${n} intervalos iguales entre 0 y 1 y N = ${N} números rectangulares: ${lista(Rs)}. Calcula FE, la FO de cada intervalo, χ²₀, el valor χ² de la tabla y decide si los números son aceptados o rechazados.`,
    respuesta:c.chi,respuestaTexto:`FE = ${c.FE}; FO = ${c.FO.join(", ")}; χ²₀ = ${f4(c.chi)}; χ² tabla = ${f2(c.tabla)}; ${c.acepta?"aceptados":"rechazados"}`,
    pasos:r.pasos,ops:r.ops,tfijo:250,tmin:190,margen:1.8,
    explicacion:`Se aceptan los números si χ²₀ es menor que el χ² de la tabla.`,
    campos:[
      num("fe","FE (frecuencia esperada)",c.FE,{mostrar:String(c.FE)}),
      ...c.FO.map((o,k)=>entero("fo"+k,`FO del intervalo ${k+1} (${lim(k)})`,o)),
      num("chi","χ²₀",c.chi,{mostrar:f4(c.chi)}),
      deTabla("tb","Valor χ² de la tabla",c.tabla,2),
      veredicto(c.acepta)
    ]
  };
}

function tKS(rng,N){
  N=clamp(N,7,8);
  const alfa=rng.pick([10,5,1]),Rs=genRs(rng,N),c=calcKS(Rs,alfa),r=new Resolutor();
  const k=rng.int(2,N-1);
  r.op("orden",`Números ordenados de menor a mayor: ${lista(c.x)}`,N);
  c.x.forEach((xi,i)=>{
    r.op("arit",`i = ${i+1}: F(xᵢ) = ${i+1}/${N} = ${f4((i+1)/N)}; |F(xᵢ) − xᵢ| = |${f4((i+1)/N)} − ${f4(xi)}| = ${f4(c.dif[i])}`,2);
  });
  r.op("comp",`El mayor valor es Dₙ = ${f4(c.Dn)}, en i = ${c.imax.join(" o ")}`,N-1);
  r.op("tabla",`En la tabla KS, N = ${N} y α = ${alfa}%: d = ${f3(c.tabla)}`);
  r.op("comp",`Dₙ = ${f4(c.Dn)} ${c.acepta?"<":"≥"} ${f3(c.tabla)} → los números son ${c.acepta?"aceptados":"rechazados"}`);
  return{
    enunciado:`Prueba de Kolmogorov-Smirnov con α = ${alfa}% y N = ${N} números rectangulares: ${lista(Rs)}. Ordénalos de menor a mayor, calcula Dₙ = máx |F(xᵢ) − xᵢ| con F(xᵢ) = i/N y decide si son aceptados o rechazados.`,
    respuesta:c.Dn,respuestaTexto:`posición ${k}: ${f4(c.x[k-1])}; Dₙ = ${f4(c.Dn)} en i = ${c.imax.join(" o ")}; d = ${f3(c.tabla)}; ${c.acepta?"aceptados":"rechazados"}`,
    pasos:r.pasos,ops:r.ops,tfijo:300,tmin:260,margen:1.8,
    explicacion:`Se aceptan los números si el mayor Dₙ es menor que el d de la tabla.`,
    campos:[
      num("xk",`Número en la posición ${k} al ordenar`,c.x[k-1],{rel:0,atol:0.00005,mostrar:f4(c.x[k-1])}),
      entero("im","Posición i donde ocurre la mayor diferencia",c.imax[0],c.imax),
      num("dn","Dₙ",c.Dn,{mostrar:f4(c.Dn)}),
      deTabla("dt","Valor d de la tabla",c.tabla,3),
      veredicto(c.acepta)
    ]
  };
}

function tMonMedia(rng,n){
  n=clamp(n,4,6);
  const Rs=genRs(rng,n),S=suma(Rs),xb=S/n,r=new Resolutor();
  r.op("arit",`Suma: ${Rs.map(f4).join(" + ")} = ${f4(S)}`,n-1);
  r.op("arit",`X̄ = ${f4(S)} / ${n} = ${f4(xb)}`);
  return{
    enunciado:`Calcula el promedio (media aritmética) de estos ${n} números rectangulares: ${lista(Rs)}.`,
    respuesta:xb,respuestaTexto:`X̄ = ${f4(xb)}`,pasos:r.pasos,ops:r.ops,tmin:90,margen:1.8,
    explicacion:`El promedio es la suma de los números entre la cantidad de números.`,
    campos:[num("xb","Promedio X̄",xb,{mostrar:f4(xb)})]
  };
}
function tMonFO(rng,n){
  n=clamp(n,4,6);
  const Rs=genRs(rng,n),k=rng.int(0,3),r=new Resolutor();let cuenta=0;
  Rs.forEach((R,i)=>{
    const j=Math.min(Math.floor(R*4+1e-9),3),dentro=j===k;if(dentro)cuenta++;
    r.op("clasif",`R${i+1} = ${f4(R)} cae en el intervalo ${j+1}: ${dentro?"se cuenta":"no se cuenta"}`);
  });
  return{
    enunciado:`Se divide el intervalo de 0 a 1 en 4 partes iguales. ¿Cuántos de estos ${n} números caen en el intervalo ${k+1} (de ${f4(k/4)} a ${f4((k+1)/4)})? Números: ${lista(Rs)}.`,
    respuesta:cuenta,respuestaTexto:`${cuenta}`,pasos:r.pasos,ops:r.ops,tmin:60,margen:1.8,
    explicacion:`La frecuencia observada (FO) de un intervalo es la cantidad de números que caen en él.`,
    campos:[entero("fo","Cantidad de números en ese intervalo",cuenta)]
  };
}

const st=document.createElement("style");
st.textContent=`
.campos{text-align:left;margin:8px 0}
.campo{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap}
.campo label{flex:1 1 55%;font-size:13px}
.campo input{flex:1 1 30%;width:auto;min-width:90px;padding:5px}
.campo .vbs{flex:1 1 30%}
.vb{margin:0 4px 0 0;padding:5px 8px;font-size:13px;background:var(--bg);color:var(--fg)}
.vb.sel{background:var(--ok);color:#fff}
.tablas{text-align:left;margin:6px 0}
.tablas summary{cursor:pointer;font-weight:700;margin:4px 0}
.tablas img{width:100%;height:auto;display:block;background:#fff;border:2px solid var(--line);image-rendering:auto}
`;
document.head.appendChild(st);

const TABLAS=[["Distribución normal (Z)","tabla_z.png"],["Distribución χ²","tabla_chi.png"],["Kolmogorov-Smirnov (d α,N)","tabla_ks.png"]];
const tablasHTML=()=>`<button id="vt" type="button">📖 Ver tablas</button><div id="tb" class="tablas" hidden>`+
  TABLAS.map(([t,f])=>`<details><summary>${t}</summary><a href="${RUTA_TABLAS}${f}" target="_blank" rel="noopener"><img src="${RUTA_TABLAS}${f}" alt="${t}" loading="lazy"></a></details>`).join("")+`</div>`;

function leerCampo(c){
  if(c.kind==="sel"){const b=panelEl.querySelector(`.vb.sel[data-c="${c.id}"]`);return b?b.dataset.v:""}
  const el=document.getElementById("f_"+c.id);return el?el.value.trim():"";
}

function problemaCampos(p,tipo,ok,fail){
  const titulo=tipo==="jefe"?icono("jefe","👹")+" Jefe final":tipo==="monstruo"?icono("monstruo"+(G.seg+1),"👹")+" Monstruo "+(G.seg+1):"💀 Problema para revivir";
  const campos=p.campos.map(c=>c.kind==="sel"
    ?`<div class="campo"><label>${c.label}</label><span class="vbs"><button type="button" class="vb" data-c="${c.id}" data-v="aceptados">Aceptados</button><button type="button" class="vb" data-c="${c.id}" data-v="rechazados">Rechazados</button></span></div>`
    :`<div class="campo"><label for="f_${c.id}">${c.label}</label><input id="f_${c.id}" type="number" step="any" inputmode="decimal"></div>`).join("");
  panel(`<h3>${titulo}</h3><p>${p.enunciado}</p>${tablasHTML()}
  <div class="barra"><i id="b"></i></div><p id="t">${p.tiempo} s</p>
  <div class="campos">${campos}</div><button id="rs" type="button">Responder</button><p id="fb"></p>`,tipo!=="revivir");
  const tb=document.getElementById("tb");
  document.getElementById("vt").onclick=()=>{tb.hidden=!tb.hidden};
  panelEl.querySelectorAll(".vb").forEach(b=>b.onclick=()=>{
    panelEl.querySelectorAll(`.vb[data-c="${b.dataset.c}"]`).forEach(x=>x.classList.toggle("sel",x===b));
  });
  const base=p.explicacion;let listo=false;
  const terminar=(bien,motivo)=>{
    if(listo)return;listo=true;clearInterval(tm);
    const fb=document.getElementById("fb");
    emitirSonido(bien?"correcto":"incorrecto");
    if(bien){fb.innerHTML='<span class="ok">¡Correcto!</span>';setTimeout(ok,900)}
    else{
      const lineas=p.campos.map(c=>{
        const raw=leerCampo(c),b=revisar(c,raw);
        return `${b?"✅":"❌"} ${c.label}: ${raw===""?"sin respuesta":"tu respuesta "+raw}${b?"":` (correcta: ${c.mostrar})`}`;
      });
      p.explicacion=lineas.join("<br>")+"<br><br>"+base;
      fb.innerHTML=`<span class="mal">${motivo==="tiempo"?"Se acabó el tiempo.":"Hay respuestas incorrectas."}</span>`;
      setTimeout(()=>fail(p),900);
    }
  };
  const enviar=()=>{
    const raws=p.campos.map(leerCampo);
    if(raws.some(x=>x==="")){document.getElementById("fb").innerHTML='<span class="mal">Llena todos los campos.</span>';return}
    terminar(p.campos.every((c,i)=>revisar(c,raws[i])),"error");
  };
  document.getElementById("rs").onclick=enviar;
  panelEl.querySelectorAll(".campo input").forEach(i=>i.onkeydown=e=>{if(e.key==="Enter")enviar()});
  const primero=panelEl.querySelector(".campo input");if(primero)primero.focus({preventScroll:true});
  timer(p.tiempo,l=>{document.getElementById("b").style.width=(l/p.tiempo*100)+"%";document.getElementById("t").textContent=Math.ceil(l)+" s"},()=>terminar(false,"tiempo"));
}

function problemaMonstruo(){
  const p=generarProblema("monstruo");
  problemaCampos(p,"monstruo",
    ()=>{G.puntos+=5;G.seg++;retomar()},
    p=>{G.hearts--;hud();solucion(p,()=>G.hearts<=0?fin("Fallaste el problema del monstruo y no quedan corazones."):revivir())});
}

function irANivel(n=3,seg=0){G.nivel=n;G.seg=seg;G.preg=rng.shuffle(NV().preg);retomar()}

Object.assign(window,{tPromedios,tFrecuencias,tKS,tMonMedia,tMonFO,problemaCampos,problemaMonstruo,irANivel});
window.Nivel3={calcProm,calcFrec,calcKS,revisar};
})();