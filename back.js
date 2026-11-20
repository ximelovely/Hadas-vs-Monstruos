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
const generarRs=(rng,n)=>Array.from({length:n},()=>Math.min(+rng.next().toFixed(4),0.9999));

function tDado(rng,n){
  const cara=rng.int(1,6),r=new Resolutor(),Rs=generarRs(rng,n);let veces=0;
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
  const r=new Resolutor(),Rs=generarRs(rng,n);let suma=0;
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

/* ============ Plantillas del nivel 2 (generadores congruenciales) ============ */
const mcd=(a,b)=>b?mcd(b,a%b):a;

function mixtoDatos(rng){
  const m=2**rng.int(4,6),a=4*rng.int(1,Math.min(7,m/4-1))+1,c=2*rng.int(0,m/2-1)+1;
  return{m,a,c,x0:rng.int(1,m-1)};
}

function iterarMixto(r,{m,a,c,x0},n){
  let x=x0;
  for(let i=1;i<=n;i++){
    const prod=a*x+c,nx=prod%m;
    r.op("arit",`X${i} = (${a}·${x} + ${c}) mod ${m}: ${a}·${x} + ${c} = ${prod}`,2);
    r.op("mod",`${prod} ÷ ${m} = ${Math.floor(prod/m)} y sobra ${nx}, así que X${i} = ${nx}`);
    x=nx;
  }
  return x;
}

const EXPL_MIXTO=n=>`En un generador congruencial mixto cada valor sale del anterior con Xₙ₊₁ = (a·Xₙ + c) mod m: se multiplica, se suma c y se toma el residuo al dividir entre m. Se repite ${n} ${n===1?"vez":"veces"} a partir de la semilla X₀.`;

function tMixtoX(rng,n){
  const d=mixtoDatos(rng),r=new Resolutor(),x=iterarMixto(r,d,n);
  return{
    enunciado:`Generador mixto X(n+1) = (${d.a}·Xn + ${d.c}) mod ${d.m}, con X₀ = ${d.x0}. Calcula X${n}.`,
    respuesta:x,respuestaTexto:`X${n} = ${x}`,pasos:r.pasos,ops:r.ops,explicacion:EXPL_MIXTO(n)
  };
}

function tMixtoR(rng,n){
  const d=mixtoDatos(rng),r=new Resolutor(),x=iterarMixto(r,d,n),R=x/d.m;
  r.op("arit",`R${n} = X${n} / m = ${x} / ${d.m} = ${R.toFixed(4)}`);
  return{
    enunciado:`Generador mixto X(n+1) = (${d.a}·Xn + ${d.c}) mod ${d.m}, con X₀ = ${d.x0}. Calcula R${n} (4 decimales).`,
    respuesta:R,respuestaTexto:`R${n} = ${R.toFixed(4)}`,pasos:r.pasos,ops:r.ops,
    explicacion:EXPL_MIXTO(n)+` Al final, R = X/m convierte el entero en un número uniforme entre 0 y 1.`
  };
}

function tMulti(rng,n){
  const m=2**rng.int(5,6),a=8*rng.int(0,3)+rng.pick([3,5]),x0=2*rng.int(0,m/2-1)+1,r=new Resolutor();
  let x=x0;
  for(let i=1;i<=n;i++){
    const prod=a*x,nx=prod%m;
    r.op("arit",`X${i} = (${a}·${x}) mod ${m}: ${a}·${x} = ${prod}`);
    r.op("mod",`${prod} ÷ ${m} = ${Math.floor(prod/m)} y sobra ${nx}, así que X${i} = ${nx}`);
    x=nx;
  }
  return{
    enunciado:`Generador multiplicativo X(n+1) = (${a}·Xn) mod ${m}, con X₀ = ${x0}. Calcula X${n}.`,
    respuesta:x,respuestaTexto:`X${n} = ${x}`,pasos:r.pasos,ops:r.ops,
    explicacion:`El generador multiplicativo es el caso del mixto con c = 0: Xₙ₊₁ = (a·Xₙ) mod m. Solo se multiplica y se toma el residuo; se repite ${n} ${n===1?"vez":"veces"} desde X₀.`
  };
}

function tPeriodo(rng,m){
  let a; do { a = rng.int(2,m-1); } while (mcd(a,m)!==1); // a es coprimo con m: la secuencia siempre regresa a X₀
  const c=rng.int(1,m-1),x0=rng.int(0,m-1),r=new Resolutor();
  let x=x0,k=0;
  do{
    const prod=a*x+c,nx=prod%m;k++;
    r.op("arit",`X${k} = (${a}·${x} + ${c}) mod ${m}: ${a}·${x} + ${c} = ${prod}`,2);
    r.op("mod",`${prod} ÷ ${m} sobra ${nx}, así que X${k} = ${nx}`);
    r.op("comp",`¿X${k} = X₀ = ${x0}? ${nx===x0?"Sí, la secuencia vuelve a empezar":"No, sigo"}`);
    x=nx;
  }while(x!==x0);
  r.pasos.push(`La secuencia regresó a X₀ después de ${k} pasos, así que el período es ${k}${k===m?" (período completo, igual a m)":" (menor que m, no es completo)"}.`);
  return{
    enunciado:`Generador mixto X(n+1) = (${a}·Xn + ${c}) mod ${m}, con X₀ = ${x0}. ¿Cuál es su período (cuántos pasos pasan hasta que vuelve a salir X₀)?`,
    respuesta:k,respuestaTexto:`${k}`,pasos:r.pasos,ops:r.ops,
    explicacion:`El período es la cantidad de números que genera antes de que la secuencia se repita. Es completo cuando vale m (aquí ${m}). Con m = 2ᵏ, un mixto lo logra si c es impar y a − 1 es múltiplo de 4.`
  };
}

function generarProblema(tipo,nivel=G.nivel){
  const N=NIVELES[nivel-1],{n,t}=N.rango[tipo],mg=N.margen??(nivel>=3?2:1.2);let p;
  for(let k=0;k<30;k++){
    p=rng.pick(N.plant[tipo])(rng,rng.int(n[0],n[1]));
    // margen de tiempo: 1.2 en los niveles 1 y 2, 2.0 del nivel 3 en adelante (o el que ponga el nivel en `margen`)
    // problemas con varios campos: tiempo de las operaciones + 15 s por cada campo extra que hay que escribir
    if(p.campos){p.tiempo=calcularTiempo(p.ops,mg)+15*(p.campos.length-1);p.fuera=p.tiempo<t[0]||p.tiempo>t[1];return p}
    p.tiempo=calcularTiempo(p.ops,mg);
    if(p.tiempo>=t[0]&&p.tiempo<=t[1]){p.fuera=false;return p}
  }
  p.fuera=true;p.tiempo=Math.min(Math.max(p.tiempo,t[0]),t[1]);return p;
}

const acierta=(v,p)=>Math.abs(v-p.respuesta)<=Math.abs(p.respuesta)*0.01+0.0001;

/* ============ Preguntas teóricas (la primera opción es la correcta) ============ */
const PREG1=[
{q:"¿Qué es la simulación?",o:["Imitar el comportamiento de un sistema real con un modelo para experimentar con él","Resolver únicamente ecuaciones de forma analítica","Construir físicamente una copia del sistema real","Medir un sistema real sin usar ningún modelo"]},
{q:"Una ventaja de la simulación es…",o:["Probar cambios sin alterar el sistema real","Que siempre da la solución exacta","Que no necesita datos","Que no requiere validar el modelo"]},
{q:"Una variable de decisión (factor controlable) es…",o:["Un valor que el analista puede elegir para probar escenarios","Un resultado que no se puede medir","Un número aleatorio fijo","Un error del programa"]},
{q:"El método Monte Carlo se basa en…",o:["Usar números aleatorios para muestrear el experimento","Derivar funciones","Resolver sistemas de ecuaciones lineales","Observar el sistema real durante meses"]},
{q:"La variable de respuesta es…",o:["El resultado que se mide al correr el experimento","El primer número aleatorio","La semilla del generador","El tiempo que tarda en compilar el programa"]},
{q:"Validar un modelo significa comprobar que…",o:["Representa adecuadamente al sistema real","El código no tiene errores de sintaxis","Corre en menos de un segundo","Usa muchos números aleatorios"]},
{q:"Un modelo estocástico se distingue porque…",o:["Incluye variables aleatorias","No tiene variables","Siempre da el mismo resultado","Solo describe sistemas sin tiempo"]},
{q:"Una limitación de la simulación es que…",o:["Sus resultados son estimaciones que dependen de la calidad del modelo y los datos","No permite comparar alternativas","Solo funciona con sistemas pequeños","No puede usar números aleatorios"]}
];

const PREG2=[
{q:"La fórmula de un generador congruencial mixto es…",o:["X(n+1) = (a·Xn + c) mod m","X(n+1) = (a·Xn) / m","X(n+1) = Xn + a + c + m","X(n+1) = (Xn mod m) − a"]},
{q:"¿En qué se diferencia el generador multiplicativo del mixto?",o:["No tiene la constante aditiva c (c = 0)","No usa el módulo m","No necesita semilla","Genera números mayores que 1"]},
{q:"Con m = 2ᵏ, un generador mixto tiene período completo si c es impar y…",o:["a − 1 es múltiplo de 4","a es par","X₀ es igual a m","a es mayor que m"]},
{q:"El período de un generador es…",o:["La cantidad de números distintos que genera antes de repetir la secuencia","El valor máximo de X","El tiempo que tarda en correr","El número de veces que se usa m"]},
{q:"¿Para qué se calcula R = X/m?",o:["Para convertir el entero X en un número entre 0 y 1","Para encontrar el período","Para elegir la semilla","Para calcular el módulo"]},
{q:"Un buen generador de números pseudoaleatorios debe tener…",o:["Período largo y números uniformes e independientes","Período corto y resultados predecibles","Solo números pares","Valores mayores que m"]},
{q:"La semilla X₀ es…",o:["El valor inicial con el que arranca el generador","El último número generado","El módulo del generador","El período de la secuencia"]},
{q:"Se les llama números pseudoaleatorios porque…",o:["Salen de una fórmula determinística pero parecen aleatorios","Se obtienen lanzando dados","Nunca se repiten","Son impredecibles aunque se conozca la fórmula"]}
];

/* ============ Nivel 3: pruebas de promedios, frecuencias y KS ============ */
const N3=(function(){
"use strict";

const RUTA_TABLAS="img/tablas/";
const f2=x=>x.toFixed(2),f3=x=>x.toFixed(3),f4=x=>x.toFixed(4);
const suma=a=>a.reduce((s,x)=>s+x,0);
const clamp=(x,a,b)=>Math.min(Math.max(x,a),b);
const genRs=(rng,n)=>Array.from({length:n},()=>Math.min(+rng.next().toFixed(4),0.9999));
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
    pasos:r.pasos,ops:r.ops,
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
    pasos:r.pasos,ops:r.ops,
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
    pasos:r.pasos,ops:r.ops,
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
    respuesta:xb,respuestaTexto:`X̄ = ${f4(xb)}`,pasos:r.pasos,ops:r.ops,
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
    respuesta:cuenta,respuestaTexto:`${cuenta}`,pasos:r.pasos,ops:r.ops,
    explicacion:`La frecuencia observada (FO) de un intervalo es la cantidad de números que caen en él.`,
    campos:[entero("fo","Cantidad de números en ese intervalo",cuenta)]
  };
}

/* ---- Nivel 4: series, póker y distancias (números de 5 decimales) ---- */
const f5=x=>x.toFixed(5);
const R5=rng=>Math.min(+rng.next().toFixed(5),0.99999);
const MANOS=["Todos diferentes","Un par","Dos pares","Tercia","Full","Póker","Quintilla"];
const PM=[0.3024,0.5040,0.1080,0.0720,0.0090,0.0045,0.0001];
const PM_SESGO=[0.15,0.40,0.20,0.15,0.06,0.03,0.01];
const FORMA=[[1,1,1,1,1],[2,1,1,1],[2,2,1],[3,1,1],[3,2],[4,1],[5]];
const strNum=d=>"0."+d.join("");
const listaD=ds=>ds.map(strNum).join(", ");
const catDe=P=>rngU=>{let s=0;for(let i=0;i<P.length;i++){s+=P[i];if(rngU<s)return i}return P.length-1};
function manoDigitos(rng,t){
  const ds=rng.shuffle([0,1,2,3,4,5,6,7,8,9]),out=[];
  FORMA[t].forEach((m,i)=>{for(let k=0;k<m;k++)out.push(ds[i])});
  return rng.shuffle(out);
}
function manoDe(d){
  const c={};d.forEach(x=>c[x]=(c[x]||0)+1);
  const clave=Object.values(c).sort((a,b)=>b-a).join("");
  return FORMA.findIndex(f=>f.join("")===clave);
}
function distanciaDe(d){ // dígitos entre los dos dígitos repetidos (exactamente un par)
  for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)if(d[i]===d[j])return j-i-1;
  return -1;
}
function numeroConDistancia(rng,dist){
  const ds=rng.shuffle([0,1,2,3,4,5,6,7,8,9]),a=rng.int(0,3-dist),out=Array(5).fill(null);
  out[a]=out[a+dist+1]=ds[0];let k=1;
  for(let i=0;i<5;i++)if(out[i]===null)out[i]=ds[k++];
  return out;
}

function tSeries(rng,N){
  const jefe=N>=9; // en el jefe también se piden FE y los grados de libertad
  const alfa=rng.pick([5,1]),Rs=Array.from({length:N},()=>R5(rng)),r=new Resolutor();
  const P=N-1,FE=P/4,FO=[0,0,0,0];
  const lab=["Uᵢ < 0.5 y Uᵢ₊₁ < 0.5","Uᵢ < 0.5 y Uᵢ₊₁ ≥ 0.5","Uᵢ ≥ 0.5 y Uᵢ₊₁ < 0.5","Uᵢ ≥ 0.5 y Uᵢ₊₁ ≥ 0.5"];
  for(let i=0;i<P;i++){
    const q=(Rs[i]>=0.5?2:0)+(Rs[i+1]>=0.5?1:0);FO[q]++;
    r.op("clasif",`Pareja ${i+1}: (${f5(Rs[i])}, ${f5(Rs[i+1])}) cae en el cuadrante ${q+1} (${lab[q]})`);
  }
  const s=suma(FO.map(o=>(o-FE)**2)),chi=4/P*s,gl=3,tabla=TABLA_CHI[alfa][gl],acepta=chi<tabla;
  r.op("arit",`FE = (N − 1) / n² = ${P} / 4 = ${FE}`,2);
  r.op("arit",`FO por cuadrante: ${FO.map((o,k)=>`${k+1}→${o}`).join(", ")}; diferencias ${FO.map(o=>`(${o} − ${FE})`).join(", ")}`,4);
  r.op("func",`Al cuadrado: ${FO.map(o=>f4((o-FE)**2)).join(", ")}`,4);
  r.op("arit",`Σ(FO − FE)² = ${f4(s)}`,3);
  r.op("arit",`χ²₀ = (n² / (N − 1))·Σ(FO − FE)² = (4 / ${P})·${f4(s)} = ${f4(chi)}`,2);
  r.op("arit",`Grados de libertad = n² − 1 = ${gl}`);
  r.op("tabla",`En la tabla χ², gl = ${gl} y α = ${alfa}%: χ² = ${f2(tabla)}`);
  r.op("comp",`χ²₀ = ${f4(chi)} ${acepta?"<":"≥"} ${f2(tabla)} → los números son ${acepta?"aceptados":"rechazados"}`);
  return{
    enunciado:`Prueba de series con α = ${alfa}%, n = 2 y N = ${N} números rectangulares: ${Rs.map(f5).join(", ")}. Forma las ${P} parejas (Uᵢ, Uᵢ₊₁) y cuéntalas en los 4 cuadrantes (cada eje se divide en 0 a 0.5 y 0.5 a 1). Calcula χ²₀ = (n²/(N − 1))·Σ(FO − FE)², el valor χ² de la tabla y decide si los números son aceptados o rechazados.`,
    respuesta:chi,respuestaTexto:`FE = ${FE}; FO = ${FO.join(", ")}; χ²₀ = ${f4(chi)}; χ² tabla = ${f2(tabla)}; ${acepta?"aceptados":"rechazados"}`,
    pasos:r.pasos,ops:r.ops,
    explicacion:`En la prueba de series se forman las N − 1 parejas (Uᵢ, Uᵢ₊₁) y se ubican en un plano dividido en n × n celdas; con n = 2 hay 4 cuadrantes y FE = (N − 1)/n². Se aceptan los números si χ²₀ es menor que el χ² de la tabla con n² − 1 grados de libertad.`,
    campos:[
      ...(jefe?[num("fe","FE (frecuencia esperada por cuadrante)",(N-1)/4,{mostrar:String((N-1)/4)})]:[]),
      ...FO.map((o,k)=>entero("fo"+k,`FO cuadrante ${k+1} (${lab[k]})`,o)),
      num("chi","χ²₀",chi,{mostrar:f4(chi)}),
      ...(jefe?[entero("gl","Grados de libertad",gl)]:[]),
      deTabla("tb","Valor χ² de la tabla",tabla,2),
      veredicto(acepta)
    ]
  };
}

function tPoker(rng,N){
  N=clamp(N,10,14);
  const alfa=rng.pick([5,1]),Pm=rng.next()<0.55?PM:PM_SESGO,sorteo=catDe(Pm),r=new Resolutor();
  let nums,FO;
  do{
    nums=Array.from({length:N},()=>manoDigitos(rng,sorteo(rng.next())));
    FO=Array(7).fill(0);nums.forEach(d=>FO[manoDe(d)]++);
  }while(FO[1]===0||FO[1]===N); // debe salir al menos un «Un par» y al menos una mano de las otras categorías
  const FE=PM.map(p=>p*N),grup=[],solas=[],omitidas=[];
  nums.forEach(d=>{
    const t=manoDe(d);
    r.op("clasif",`${strNum(d)} → dígitos ${d.join(" ")}: ${MANOS[t]}`);
  });
  // se agrupan las categorías con FE < 5 que SÍ salieron; las que no salieron (FO = 0) no se suman
  FE.forEach((e,i)=>{if(e<5){(FO[i]>0?grup:omitidas).push(i)}else solas.push(i)});
  const FOa=suma(grup.map(i=>FO[i])),FEa=suma(grup.map(i=>FE[i])),FOp=FO[1],FEp=FE[1];
  // N de 10 a 14: solo «Un par» tiene FE ≥ 5, así que siempre quedan 2 grupos (las agrupadas y «Un par»)
  const chi=(FOa-FEa)**2/FEa+(FOp-FEp)**2/FEp,gl=1,tabla=TABLA_CHI[alfa][gl],acepta=chi<tabla;
  r.op("arit",`FE = probabilidad × N: ${FE.map((e,i)=>`${MANOS[i]} ${f4(e)}`).join("; ")}`,0);
  r.op("arit",`FE de «Un par» = 0.5040 × ${N} = ${f4(FEp)}`);
  r.op("arit",`Categorías con FE menor que 5 que sí salieron: ${grup.map(i=>`${MANOS[i]} (FE ${f4(FE[i])}, FO ${FO[i]})`).join("; ")}`,grup.length);
  if(omitidas.length)r.op("arit",`No se suman las que no salieron (FO = 0): ${omitidas.map(i=>MANOS[i]).join(", ")}`,0);
  r.op("arit",`FE agrupada = ${grup.map(i=>f4(FE[i])).join(" + ")} = ${f4(FEa)}`,grup.length-1);
  r.op("arit",`FO agrupada = ${grup.map(i=>FO[i]).join(" + ")} = ${FOa}`,grup.length-1);
  r.op("arit",`Diferencias: (${FOa} − ${f4(FEa)}) y (${FOp} − ${f4(FEp)})`,2);
  r.op("func",`Al cuadrado: ${f4((FOa-FEa)**2)} y ${f4((FOp-FEp)**2)}`,2);
  r.op("arit",`χ²₀ = ${f4((FOa-FEa)**2)} / ${f4(FEa)} + ${f4((FOp-FEp)**2)} / ${f4(FEp)} = ${f4(chi)}`,3);
  r.op("arit",`Grados de libertad = 2 grupos − 1 = ${gl}`);
  r.op("tabla",`En la tabla χ², gl = ${gl} y α = ${alfa}%: χ² = ${f2(tabla)}`);
  r.op("comp",`χ²₀ = ${f4(chi)} ${acepta?"<":"≥"} ${f2(tabla)} → los números son ${acepta?"aceptados":"rechazados"}`);
  return{
    enunciado:`Prueba de póker con α = ${alfa}% y N = ${N} números rectangulares (se usan los 5 decimales como una mano de 5 dígitos): ${listaD(nums)}. Clasifica cada número (todos diferentes, un par, dos pares, tercia, full, póker o quintilla), calcula FE = probabilidad × N y agrupa las categorías con FE menor que 5 que sí salieron (las que no aparecen en los números, con FO = 0, no se suman); después calcula χ²₀, el valor χ² de la tabla y decide si los números son aceptados o rechazados.<br>Probabilidades: todos diferentes 0.3024, un par 0.5040, dos pares 0.1080, tercia 0.0720, full 0.0090, póker 0.0045, quintilla 0.0001.`,
    respuesta:chi,respuestaTexto:`FO un par = ${FOp}; FO agrupada = ${FOa}; FE agrupada = ${f4(FEa)}; χ²₀ = ${f4(chi)}; χ² tabla = ${f2(tabla)}; ${acepta?"aceptados":"rechazados"}`,
    pasos:r.pasos,ops:r.ops,
    explicacion:`En la prueba de póker cada número se clasifica por los dígitos que se repiten. Como las categorías con FE menor que 5 no sirven para la prueba por sí solas, se agrupan, pero solo las que sí salieron: las que no aparecen en los números no se suman. Aquí «Un par» queda separada, así que hay 2 grupos y 1 grado de libertad. Se aceptan los números si χ²₀ es menor que el χ² de la tabla.`,
    campos:[
      entero("fop","FO de «Un par»",FOp),
      num("fea","FE agrupada (categorías con FE < 5 que sí salieron)",FEa,{mostrar:f4(FEa)}),
      num("chi","χ²₀",chi,{mostrar:f4(chi)}),
      deTabla("tb","Valor χ² de la tabla",tabla,2),
      veredicto(acepta)
    ]
  };
}

function tDistancias(rng,N){
  N=clamp(N,10,14);
  const alfa=rng.pick([5,1]),Pd=rng.next()<0.5?[0.1,0.09,0.081,0.729]:[0.35,0.30,0.20,0.15],sorteo=catDe(Pd),r=new Resolutor();
  let nums,FO;
  do{
    nums=Array.from({length:N},()=>numeroConDistancia(rng,sorteo(rng.next())));
    FO=[0,0,0,0];nums.forEach(d=>FO[distanciaDe(d)]++);
  }while(FO[3]===0||FO[0]+FO[1]+FO[2]===0); // debe salir al menos una distancia 3 y alguna de 0, 1 o 2
  const FE=[0.1*N,0.1*0.9*N,0.1*0.81*N,0.729*N];
  nums.forEach(d=>{
    const i=distanciaDe(d);
    r.op("clasif",`${strNum(d)} → dígitos ${d.join(" ")}: distancia ${i}`);
  });
  // se agrupan las distancias 0, 1 y 2 (FE < 5) que SÍ salieron; las que no salieron (FO = 0) no se suman
  const filas=[0,1,2].filter(i=>FO[i]>0),omit=[0,1,2].filter(i=>FO[i]===0);
  const FOa=suma(filas.map(i=>FO[i])),FEa=suma(filas.map(i=>FE[i])),FO3=FO[3],FE3=FE[3];
  // N de 10 a 14: FE₀, FE₁ y FE₂ son menores que 5 y FE₃ es mayor que 5, así que siempre quedan 2 grupos
  const chi=(FOa-FEa)**2/FEa+(FO3-FE3)**2/FE3,gl=1,tabla=TABLA_CHI[alfa][gl],acepta=chi<tabla;
  r.op("arit",`FEᵢ = (0.1)(0.9)ⁱ·N para i < 3: ${[0,1,2].map(i=>f4(FE[i])).join(", ")}; FE₃ = (0.9)³·N = ${f4(FE3)}`,0);
  r.op("arit",`FE₃ = (0.9)³·N = 0.729 × ${N} = ${f4(FE3)}`);
  r.op("arit",`Distancias con FE menor que 5 que sí salieron: ${filas.map(i=>`i = ${i} (FE ${f4(FE[i])}, FO ${FO[i]})`).join("; ")}`,filas.length);
  if(omit.length)r.op("arit",`No se suman las que no salieron (FO = 0): i = ${omit.join(", ")}`,0);
  r.op("arit",`FE agrupada = ${filas.map(i=>f4(FE[i])).join(" + ")} = ${f4(FEa)}`,filas.length-1);
  r.op("arit",`FO agrupada = ${filas.map(i=>FO[i]).join(" + ")} = ${FOa}`,filas.length-1);
  r.op("arit",`Diferencias: (${FOa} − ${f4(FEa)}) y (${FO3} − ${f4(FE3)})`,2);
  r.op("func",`Al cuadrado: ${f4((FOa-FEa)**2)} y ${f4((FO3-FE3)**2)}`,2);
  r.op("arit",`χ²₀ = ${f4((FOa-FEa)**2)} / ${f4(FEa)} + ${f4((FO3-FE3)**2)} / ${f4(FE3)} = ${f4(chi)}`,3);
  r.op("arit",`Grados de libertad = 2 grupos − 1 = ${gl}`);
  r.op("tabla",`En la tabla χ², gl = ${gl} y α = ${alfa}%: χ² = ${f2(tabla)}`);
  r.op("comp",`χ²₀ = ${f4(chi)} ${acepta?"<":"≥"} ${f2(tabla)} → los números son ${acepta?"aceptados":"rechazados"}`);
  return{
    enunciado:`Prueba de distancias con α = ${alfa}% y N = ${N} números rectangulares (cada uno tiene un dígito que se repite en sus 5 decimales): ${listaD(nums)}. La distancia i es la cantidad de dígitos que hay entre los dos dígitos iguales. Cuenta la FO de cada distancia (0, 1, 2 y 3), calcula FEᵢ = (0.1)(0.9)ⁱ·N para i < 3 y FE₃ = (0.9)³·N, agrupa las FE menores que 5 de las distancias que sí salieron (las que no aparecen, con FO = 0, no se suman), calcula χ²₀, el valor χ² de la tabla y decide si los números son aceptados o rechazados.`,
    respuesta:chi,respuestaTexto:`FO = ${FO.join(", ")}; FE agrupada = ${f4(FEa)}; χ²₀ = ${f4(chi)}; χ² tabla = ${f2(tabla)}; ${acepta?"aceptados":"rechazados"}`,
    pasos:r.pasos,ops:r.ops,
    explicacion:`En la prueba de distancias se cuenta cuántos dígitos separan a los dos dígitos repetidos de cada número. Las categorías con FE menor que 5 se agrupan (las distancias 0, 1 y 2 que sí salieron; las que no aparecen no se suman) y la última (i = 3) queda sola, así que hay 2 grupos y 1 grado de libertad. Se aceptan los números si χ²₀ es menor que el χ² de la tabla.`,
    campos:[
      entero("fo0","FO de la distancia 0",FO[0]),
      entero("fo3","FO de la distancia 3",FO[3]),
      num("fea","FE agrupada (distancias 0, 1 y 2 que sí salieron)",FEa,{mostrar:f4(FEa)}),
      num("chi","χ²₀",chi,{mostrar:f4(chi)}),
      deTabla("tb","Valor χ² de la tabla",tabla,2),
      veredicto(acepta)
    ]
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
const tablasHTML=()=>`<button id="vt" type="button">${ico("libro",2)} Ver tablas</button><div id="tb" class="tablas" hidden>`+
  TABLAS.map(([t,f])=>`<details><summary>${t}</summary><a href="${RUTA_TABLAS}${f}" target="_blank" rel="noopener"><img src="${RUTA_TABLAS}${f}" alt="${t}" loading="lazy"></a></details>`).join("")+`</div>`;

function leerCampo(c){
  if(c.kind==="sel"){const b=panelEl.querySelector(`.vb.sel[data-c="${c.id}"]`);return b?b.dataset.v:""}
  const el=document.getElementById("f_"+c.id);return el?el.value.trim():"";
}

function problemaCampos(p,tipo,ok,fail){
  const titulo=tipo==="jefe"?icono("jefe",ico("monstruo",3))+" Jefe final":tipo==="monstruo"?icono("monstruo"+(G.seg+1),ico("monstruo",3))+" Monstruo "+(G.seg+1):ico("calavera",3)+" Problema para revivir";
  const campos=p.campos.map(c=>c.kind==="sel"
    ?`<div class="campo"><label>${c.label}</label><span class="vbs"><button type="button" class="vb" data-c="${c.id}" data-v="aceptados">Aceptados</button><button type="button" class="vb" data-c="${c.id}" data-v="rechazados">Rechazados</button></span></div>`
    :`<div class="campo"><label for="f_${c.id}">${c.label}</label><input id="f_${c.id}" type="number" step="any" inputmode="decimal"></div>`).join("");
  panel(`<h3>${titulo}</h3><p>${p.enunciado}</p>${p.sinTablas?"":tablasHTML()}
  <div class="barra"><i id="b"></i></div><p id="t">${p.tiempo} s</p>
  <div class="campos">${campos}</div><button id="rs" type="button">Responder</button><p id="fb"></p>`,tipo!=="revivir");
  const tb=document.getElementById("tb"),vt=document.getElementById("vt");
  if(vt)vt.onclick=()=>{tb.hidden=!tb.hidden};
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

return{tPromedios,tFrecuencias,tKS,tMonMedia,tMonFO,tSeries,tPoker,tDistancias,problemaCampos,problemaMonstruo,irANivel,calcProm,calcFrec,calcKS,revisar,ayudas:{num,entero,f4,suma,clamp}};
})();
const {tPromedios,tFrecuencias,tKS,tMonMedia,tMonFO,tSeries,tPoker,tDistancias,problemaCampos,problemaMonstruo,irANivel}=N3;

const PREG3=[
{q:"La prueba de promedios compara…",o:["El promedio de los números generados con el valor esperado 0.5","Las frecuencias observadas con las esperadas","La distribución acumulada con la uniforme","La cantidad de pares y tercias de dígitos"]},
{q:"En la prueba de promedios, los números se aceptan cuando…",o:["|Z₀| es menor que el valor Z de la tabla","Z₀ es mayor que el valor Z de la tabla","El promedio es exactamente 0.5","N es un número par"]},
{q:"La prueba de frecuencias compara…",o:["Las frecuencias observadas (FO) con las esperadas (FE) en cada intervalo","El promedio con 0.5","El mayor valor con el menor valor","Cada número con el número anterior"]},
{q:"En la prueba de frecuencias con n intervalos, los grados de libertad son…",o:["n − 1","n + 1","N − 1","n · N"]},
{q:"Con N números y n intervalos iguales, la frecuencia esperada FE es…",o:["N / n","n / N","N · n","N − n"]},
{q:"La prueba de Kolmogorov-Smirnov compara…",o:["La distribución acumulada de los números con la de una uniforme","Solo el promedio de los números","La cantidad de números repetidos","El período del generador"]},
{q:"En la prueba KS, el estadístico Dₙ es…",o:["La mayor diferencia absoluta entre F(xᵢ) y xᵢ","La suma de todas las diferencias","El menor valor de xᵢ","El promedio de los xᵢ"]},
{q:"En la prueba KS, los números se rechazan si…",o:["Dₙ es mayor o igual que el valor d de la tabla","Dₙ es menor que el valor d de la tabla","N es menor que 10","α es menor que 5%"]}
];
const PREG4=[
{q:"En la prueba de póker, cada número rectangular se clasifica según…",o:["Los dígitos que se repiten en sus 5 decimales (la mano de póker)","Su promedio","La distancia al número anterior","El cuadrante donde cae"]},
{q:"¿Cuántas categorías de mano hay en la prueba de póker con 5 dígitos?",o:["7: todos diferentes, un par, dos pares, tercia, full, póker y quintilla","5: una por cada dígito","4: una por cada palo","10: una por cada dígito del 0 al 9"]},
{q:"En póker, un «full» es…",o:["Una tercia y un par (por ejemplo, 8 8 8 5 5)","Cuatro dígitos iguales","Dos pares","Cinco dígitos diferentes"]},
{q:"En póker y distancias, ¿qué categorías se agrupan?",o:["Las que tienen una frecuencia esperada (FE) menor que 5","Las que tienen FO igual a cero","Las que tienen FE mayor que 5","Todas las categorías, siempre"]},
{q:"En la prueba de series, con N números rectangulares se forman…",o:["N − 1 parejas (Uᵢ, Uᵢ₊₁)","N parejas","N / 2 parejas","N² parejas"]},
{q:"En la prueba de series con una cuadrícula de n × n celdas, la frecuencia esperada es…",o:["FE = (N − 1) / n²","FE = N / n","FE = (N − 1) · n²","FE = n² / N"]},
{q:"En la prueba de series con n = 2, los grados de libertad son…",o:["3 (n² − 1)","2 (n)","1 (n − 1)","4 (n²)"]},
{q:"En la prueba de distancias, la distancia i es…",o:["La cantidad de dígitos que hay entre dos dígitos iguales","La diferencia entre dos números consecutivos","El valor del dígito repetido","La posición del primer dígito"]}
];
const PREG5=[
// conceptuales (la mayoría)
{q:"¿Por qué son importantes las variables aleatorias no uniformes?",o:["Son pieza fundamental de cualquier simulación; sin ellas no existiría la simulación","Solo sirven para probar generadores","Reemplazan a los números rectangulares","Se usan únicamente al final para validar el modelo"]},
{q:"¿Qué método se usa para generar variables aleatorias no uniformes en este tema?",o:["La transformada inversa","La prueba de Kolmogorov-Smirnov","La prueba de póker","El método de la burbuja"]},
{q:"Los tiempos de atención a los clientes de un cajero automático se simulan con una distribución…",o:["Exponencial","Uniforme","Poisson","Empírica"]},
{q:"Los tiempos de transmisión de mensajes de texto entre celulares del ejemplo de clase se simulan con una distribución…",o:["Empírica","Exponencial","Uniforme","Poisson"]},
{q:"En la distribución Poisson, ¿qué es λ?",o:["La media estadística de la variable aleatoria","El valor máximo de x","La cantidad de números rectangulares","El nivel de significancia"]},
{q:"En Poisson, la distribución acumulada F(x) sirve para…",o:["Armar la tabla de rangos con la que se obtiene el valor de la variable","Calcular el período del generador","Decidir si los números son uniformes","Obtener el promedio de los R"]},
{q:"¿Cuándo se deja de calcular f(x) y F(x) en Poisson?",o:["Cuando F(x) se acerca de forma considerable a 1","Cuando f(x) llega a 0.5","Cuando x es igual a λ","Cuando F(x) es negativa"]},
{q:"En la tabla de rangos de Poisson, el valor de x se obtiene…",o:["Buscando el rango de F(x) donde cae el número R","Multiplicando R por λ","Eligiendo el x con mayor f(x)","Calculando el logaritmo de R"]},
// de fórmulas (pocas)
{q:"La fórmula de la distribución uniforme entre a y b es…",o:["x = a + (b − a)·R","x = −(1/λ)·ln R","x = (a + b) / R","x = a·R + b²"]},
{q:"La probabilidad de la distribución Poisson es…",o:["f(x) = e^(−λ)·λ^x / x!","f(x) = −(1/λ)·ln R","f(x) = a + (b − a)·R","f(x) = λ·R²"]}
];

/* ============ Nivel 5: variables no uniformes y Poisson ============ */
const N5=(function(){
"use strict";
const {num,entero,f4,suma,clamp}=N3.ayudas;
const genR=(rng,n)=>Array.from({length:n},()=>Math.min(Math.max(+rng.next().toFixed(4),0.0001),0.9999)); // R nunca es 0 (ln 0 no existe)
const listaR=Rs=>Rs.map(f4).join(", ");
const fact=n=>n<2?1:n*fact(n-1);
const otra=(rng,n,j)=>{let k;do{k=rng.int(1,n)}while(k===j);return k};

const CTX_EXP=[
  {frase:"Los tiempos de atención de los clientes de un cajero",item:"cliente",items:"clientes"},
  {frase:"Los tiempos entre llegadas de monstruos al bosque",item:"monstruo",items:"monstruos"},
  {frase:"Los tiempos de reparación de las alas de las hadas",item:"hada",items:"hadas"}
];
const CTX_UNI=[
  {frase:"Los tiempos de envasado de un refresco",item:"refresco",items:"refrescos"},
  {frase:"Los tiempos de preparación de una poción",item:"poción",items:"pociones"},
  {frase:"Los tiempos de vuelo de un hada entre dos árboles",item:"vuelo",items:"vuelos"}
];

/* ---- Exponencial (transformada inversa) ---- */
function tExponencial(rng,N){
  const jefe=N>=8;N=jefe?clamp(N,8,9):clamp(N,4,6);
  const lam=rng.pick([2,3,4,5]),c=rng.pick(CTX_EXP),Rs=genR(rng,N),r=new Resolutor();
  const k=-1/lam,ln=Rs.map(R=>Math.log(R)),xs=ln.map(l=>k*l),S=suma(xs),prom=S/N;
  r.op("arit",`−1/λ = −1/${lam} = ${f4(k)}`);
  Rs.forEach((R,i)=>{
    r.op("func",`ln(${f4(R)}) = ${f4(ln[i])}`);
    r.op("arit",`x${i+1} = −(1/λ)·ln R${i+1} = ${f4(k)} × ${f4(ln[i])} = ${f4(xs[i])}`);
  });
  r.op("arit",`Tiempo total = ${xs.map(f4).join(" + ")} = ${f4(S)}`,N-1);
  r.op("arit",`Tiempo promedio = ${f4(S)} / ${N} = ${f4(prom)}`);
  const j=rng.int(1,N),campos=[num("xj",`Tiempo del ${c.item} ${j}`,xs[j-1],{mostrar:f4(xs[j-1])})];
  if(jefe){
    const j2=otra(rng,N,j),mx=Math.max(...xs);
    r.op("comp",`El mayor tiempo es ${f4(mx)} (${c.item} ${xs.indexOf(mx)+1})`,N-1);
    campos.push(num("xj2",`Tiempo del ${c.item} ${j2}`,xs[j2-1],{mostrar:f4(xs[j2-1])}));
    campos.push(num("mx","Mayor de los tiempos",mx,{mostrar:f4(mx)}));
  }
  campos.push(num("tot","Tiempo total",S,{mostrar:f4(S)}),num("prom","Tiempo promedio",prom,{mostrar:f4(prom)}));
  return{
    enunciado:`${c.frase} están exponencialmente distribuidos con λ = ${lam}, con x = −(1/λ)·ln R. Con los ${N} números rectangulares R = ${listaR(Rs)}, calcula el tiempo de ${N} ${c.items}${jefe?", el tiempo mayor":""}, el tiempo total y el tiempo promedio (4 decimales).`,
    respuesta:S,respuestaTexto:`Tiempo total = ${f4(S)}; promedio = ${f4(prom)}`,pasos:r.pasos,ops:r.ops,sinTablas:true,
    explicacion:`En la transformada inversa de la exponencial cada R se convierte en un tiempo con x = −(1/λ)·ln R. Después se suman los tiempos y el total se divide entre ${N} para el promedio.`,
    campos
  };
}

/* ---- Uniforme entre a y b ---- */
function tUniforme(rng,N){
  N=clamp(N,4,6);
  const a=rng.int(2,6),b=a+rng.int(2,6),c=rng.pick(CTX_UNI),Rs=genR(rng,N),r=new Resolutor();
  const xs=Rs.map(R=>a+(b-a)*R),S=suma(xs),prom=S/N;
  r.op("arit",`b − a = ${b} − ${a} = ${b-a}`);
  Rs.forEach((R,i)=>{
    r.op("arit",`x${i+1} = a + (b − a)·R${i+1} = ${a} + ${b-a} × ${f4(R)} = ${f4(xs[i])}`,2);
  });
  r.op("arit",`Tiempo total = ${xs.map(f4).join(" + ")} = ${f4(S)}`,N-1);
  r.op("arit",`Tiempo promedio = ${f4(S)} / ${N} = ${f4(prom)}`);
  const j=rng.int(1,N);
  return{
    enunciado:`${c.frase} están uniformemente distribuidos entre ${a} y ${b} min, con x = a + (b − a)·R. Con los ${N} números rectangulares R = ${listaR(Rs)}, calcula el tiempo de ${N} ${c.items}, el tiempo total y el tiempo promedio (4 decimales).`,
    respuesta:S,respuestaTexto:`Tiempo total = ${f4(S)}; promedio = ${f4(prom)}`,pasos:r.pasos,ops:r.ops,sinTablas:true,
    explicacion:`En la distribución uniforme cada R se acomoda entre a y b con x = a + (b − a)·R. Después se suman los tiempos y el total se divide entre ${N} para el promedio.`,
    campos:[
      num("xj",`Tiempo del ${c.item} ${j}`,xs[j-1],{mostrar:f4(xs[j-1])}),
      num("tot","Tiempo total",S,{mostrar:f4(S)}),
      num("prom","Tiempo promedio",prom,{mostrar:f4(prom)})
    ]
  };
}

/* ---- Empírica: x = √(2R) ---- */
const CTX_EMP=[
  {frase:"Los tiempos de transmisión de mensajes de texto de un celular a otro",item:"mensaje",items:"mensajes"},
  {frase:"Los tiempos que tarda un monstruo en cruzar el bosque",item:"monstruo",items:"monstruos"},
  {frase:"Los tiempos de carga de un hechizo",item:"hechizo",items:"hechizos"}
];
function tEmpirica(rng,N){
  const jefe=N>=8;N=jefe?clamp(N,8,9):clamp(N,4,6);
  const c=rng.pick(CTX_EMP),Rs=genR(rng,N),r=new Resolutor();
  const bajo=Rs.map(R=>R<=0.5),xs=Rs.map((R,i)=>bajo[i]?Math.sqrt(2*R):2*R),S=suma(xs),prom=S/N,men=bajo.filter(Boolean).length;
  Rs.forEach((R,i)=>{
    r.op("comp",`R${i+1} = ${f4(R)} ${bajo[i]?"≤":">"} 1/2`);
    if(bajo[i]){
      r.op("arit",`2R${i+1} = 2 × ${f4(R)} = ${f4(2*R)}`);
      r.op("func",`x${i+1} = √(2R${i+1}) = √${f4(2*R)} = ${f4(xs[i])}`);
    }else r.op("arit",`x${i+1} = 2R${i+1} = 2 × ${f4(R)} = ${f4(xs[i])}`);
  });
  r.op("arit",`Tiempo total = ${xs.map(f4).join(" + ")} = ${f4(S)}`,N-1);
  r.op("arit",`Tiempo promedio = ${f4(S)} / ${N} = ${f4(prom)}`);
  const j=rng.int(1,N),campos=[num("xj",`Tiempo del ${c.item} ${j}`,xs[j-1],{mostrar:f4(xs[j-1])})];
  if(jefe){const j2=otra(rng,N,j);campos.push(num("xj2",`Tiempo del ${c.item} ${j2}`,xs[j2-1],{mostrar:f4(xs[j2-1])}))}
  campos.push(entero("men","Cantidad de R menores o iguales que 1/2 (usan la raíz)",men),num("tot","Tiempo total",S,{mostrar:f4(S)}),num("prom","Tiempo promedio",prom,{mostrar:f4(prom)}));
  return{
    enunciado:`${c.frase} están empíricamente distribuidos: x = √(2R) si R ≤ 1/2 y x = 2R si R > 1/2. Con los ${N} números rectangulares R = ${listaR(Rs)}, calcula el tiempo de ${N} ${c.items}, cuántos R son menores o iguales que 1/2, el tiempo total y el tiempo promedio (4 decimales).`,
    respuesta:S,respuestaTexto:`${men} R ≤ 1/2; tiempo total = ${f4(S)}; promedio = ${f4(prom)}`,pasos:r.pasos,ops:r.ops,sinTablas:true,
    explicacion:`En la distribución empírica la fórmula depende de R: si R ≤ 1/2 se usa x = √(2R) y si R > 1/2 se usa x = 2R. Después se suman los tiempos y el total se divide entre ${N} para el promedio.`,
    campos
  };
}

/* ---- Poisson ---- */
const CTX_POI=[
  {frase:"La demanda diaria de pociones",pers:"cada uno de los N días"},
  {frase:"El número de monstruos que llegan al bosque por hora",pers:"cada una de las N horas"}
];
function tPoisson(rng,N){
  N=clamp(N,8,9);
  const lam=rng.pick([1,1.5,2]),c=rng.pick(CTX_POI),r=new Resolutor(),e=Math.exp(-lam);
  const xs=[],f=[],F=[];
  r.op("func",`e^(−λ) = e^(−${lam}) = ${f4(e)}`);
  for(let x=0,ac=0;ac<0.98;x++){
    const pot=lam**x,fx=e*pot/fact(x);ac+=fx;xs.push(x);f.push(fx);F.push(ac);
    r.op("func",`λ^${x} = ${lam}^${x} = ${f4(pot)}`);
    r.op("fact",`${x}! = ${fact(x)}`);
    r.op("arit",`f(${x}) = e^(−λ)·λ^${x} / ${x}! = ${f4(e)} × ${f4(pot)} / ${fact(x)} = ${f4(fx)}`,2);
    r.op("arit",x?`F(${x}) = ${f4(F[x-1])} + ${f4(fx)} = ${f4(ac)}`:`F(0) = f(0) = ${f4(fx)}`,x?1:0);
  }
  const L=xs.length,ult=xs[L-1],tope=F[L-1];
  r.pasos.push(`Se detiene en x = ${ult}, porque F(${ult}) = ${f4(tope)} ya es mayor o igual que 0.98.`);
  r.pasos.push(`Tabla de rangos: ${xs.map(x=>`x = ${x} → ${f4(x?F[x-1]:0)} a ${f4(F[x])}`).join("; ")}`);
  let Rs;
  do{Rs=Array.from({length:N},()=>Math.min(Math.max(+(rng.next()*tope).toFixed(4),0.0001),+(tope-0.0001).toFixed(4)))}
  while(Rs.some(R=>F.some(v=>Math.abs(R-v)<0.0003))); // ningún R pegado a un límite del rango
  const val=Rs.map(R=>F.findIndex(v=>R<v));
  Rs.forEach((R,i)=>r.op("clasif",`R${i+1} = ${f4(R)} cae en el rango de ${f4(val[i]?F[val[i]-1]:0)} a ${f4(F[val[i]])} → x = ${val[i]}`));
  const tot=suma(val);
  r.op("arit",`Suma de los valores de x = ${val.join(" + ")} = ${tot}`,N-1);
  const k1=rng.int(1,L-1),k2=rng.int(1,L-2),j=rng.int(1,N);
  return{
    enunciado:`${c.frase} tiene un comportamiento Poisson con λ = ${lam}. Calcula f(x) = e<sup>−λ</sup>·λ<sup>x</sup> / x! y la acumulada F(x) desde x = 0 hasta que F(x) sea mayor o igual que 0.98. Con ellas arma la tabla de rangos (para x = 0 el rango va de 0 a F(0) y para cada x siguiente de F(x−1) a F(x)) y, con los ${N} números rectangulares R = ${listaR(Rs)}, obtén el valor de x de ${c.pers.replace("N",N)} (4 decimales en f y F).`,
    respuesta:tot,respuestaTexto:`f(${k1}) = ${f4(f[k1])}; F(${k2}) = ${f4(F[k2])}; último x = ${ult}; x de R${j} = ${val[j-1]}; suma = ${tot}`,pasos:r.pasos,ops:r.ops,sinTablas:true,
    explicacion:`En Poisson se calculan f(x) y la acumulada F(x) hasta que F(x) se acerca a 1; con esos valores se arma la tabla de rangos. Cada R se ubica en el rango donde cae y ese rango da el valor de x.`,
    campos:[
      num("f",`f(${k1})`,f[k1],{mostrar:f4(f[k1])}),
      num("F",`F(${k2})`,F[k2],{mostrar:f4(F[k2])}),
      entero("ult","Último valor de x de la tabla (primer x con F(x) ≥ 0.98)",ult),
      entero("xj",`Valor de x que le toca a R${j}`,val[j-1]),
      entero("tot",`Suma de los ${N} valores de x`,tot)
    ]
  };
}

return{tExponencial,tUniforme,tEmpirica,tPoisson};
})();
const {tExponencial,tUniforme,tEmpirica,tPoisson}=N5;
const PREG6=[
{q:"En el sistema de la caja de un supermercado, ¿cuál es una entidad?",o:["El cliente","El tiempo promedio en el sistema","El porcentaje de tiempo desocupado","La distribución uniforme de las llegadas"]},
{q:"El tiempo promedio que un cliente permanece en el sistema es una variable…",o:["Endógena de salida","Exógena controlable","Exógena no controlable","Endógena de estado"]},
{q:"La cantidad de clientes que hay en la cola en un instante dado es una variable…",o:["Endógena de estado","Endógena de salida","Exógena controlable","Exógena no controlable"]},
{q:"La cantidad de cajas registradoras que se abren es una variable…",o:["Exógena controlable","Exógena no controlable","Endógena de estado","Endógena de salida"]},
{q:"El tiempo entre las llegadas de los clientes a la caja es una variable…",o:["Exógena no controlable","Exógena controlable","Endógena de estado","Endógena de salida"]},
{q:"En un sistema de colas de un solo canal, ¿cuántos clientes se atienden al mismo tiempo?",o:["Uno","Dos","Todos los que estén en la cola","Depende de la hora de llegada"]},
{q:"En el juego de volados, la cantidad inicial, la meta y la apuesta inicial son variables…",o:["Exógenas controlables","Exógenas no controlables","Endógenas de estado","Endógenas de salida"]},
{q:"En el juego de volados, ¿cómo se estima la probabilidad de llegar a la meta?",o:["Veces que se llegó a la meta entre los juegos terminados","Veces que se llegó a la quiebra entre las apuestas","Capital final entre capital inicial","Número de volados ganados entre la meta"]}
];

/* ============ Nivel 6: aplicaciones (colas de un canal y juego de volados) ============ */
const N6=(function(){
"use strict";
const {num,entero,f4,suma,clamp}=N3.ayudas;
const f2=x=>x.toFixed(2);
const R5=rng=>Math.min(+rng.next().toFixed(5),0.99999);

/* ---- Sistema de colas de un solo canal: caja de un supermercado ---- */
function tCola(rng,N){
  const jefe=N>=6;
  const [a1,b1]=rng.pick([[1,10],[1,8]]),[a2,b2]=rng.pick([[1,6],[2,6]]);
  const ia=Array.from({length:N},()=>rng.int(a1,b1)),sv=Array.from({length:N},()=>rng.int(a2,b2));
  const r=new Resolutor();
  let llegAnt=0,finAnt=0,sis=0,ocio=0,esperaron=0;
  const sisLista=[],ocioLista=[];
  for(let i=0;i<N;i++){
    const lleg=llegAnt+ia[i],ini=Math.max(lleg,finAnt),fin=ini+sv[i],t=fin-lleg,o=ini-finAnt;
    r.op("arit",`Cliente ${i+1}: hora de llegada = ${llegAnt} + ${ia[i]} = ${lleg}`);
    r.op("comp",`Inicio de servicio = el mayor entre su llegada (${lleg}) y el fin del cliente anterior (${finAnt}${i?"":", el cajero empieza vacío"}) = ${ini}${ini>lleg?`; espera ${ini-lleg} min en la cola`:""}`);
    r.op("arit",`Fin de servicio = ${ini} + ${sv[i]} = ${fin}`);
    r.op("arit",`Tiempo en el sistema = ${fin} − ${lleg} = ${t}`);
    r.op("arit",`Tiempo que el cajero estuvo inactivo = ${ini} − ${finAnt} = ${o}`);
    if(ini>lleg)esperaron++;
    sis+=t;ocio+=o;sisLista.push(t);ocioLista.push(o);llegAnt=lleg;finAnt=fin;
  }
  const prom=sis/N,pct=ocio/finAnt*100;
  r.op("arit",`Suma de tiempos en el sistema = ${sisLista.join(" + ")} = ${sis}`,N-1);
  r.op("arit",`Tiempo inactivo total del cajero = ${ocioLista.join(" + ")} = ${ocio}`,N-1);
  r.op("arit",`Tiempo promedio en el sistema = ${sis} / ${N} = ${f4(prom)}`);
  r.op("arit",`Porcentaje de tiempo desocupado = ${ocio} / ${finAnt} × 100 = ${f2(pct)}%`,2);
  const campos=[
    entero("fin","Hora en que termina de atenderse el último cliente (min)",finAnt),
    entero("sis","Suma de los tiempos en el sistema (min)",sis),
    entero("oc","Tiempo inactivo total del cajero (min)",ocio),
    num("prom","Tiempo promedio en el sistema (min)",prom,{mostrar:f4(prom)}),
    num("pct","Porcentaje de tiempo desocupado del cajero (%)",pct,{mostrar:f2(pct)})
  ];
  if(jefe)campos.push(entero("esp","Cantidad de clientes que tuvieron que esperar en la cola",esperaron));
  return{
    enunciado:`Sistema de colas de un solo canal (caja de un supermercado). Los tiempos entre llegadas (uniformes entre ${a1} y ${b1} min) y los tiempos de atención (uniformes entre ${a2} y ${b2} min) de ${N} clientes, ya generados, son:<br>Tiempos entre llegadas: ${ia.join(", ")}.<br>Tiempos de atención: ${sv.join(", ")}.<br>El reloj empieza en 0 y la primera llegada ocurre después de su tiempo entre llegadas; si el cajero está ocupado, el cliente espera en la cola. Calcula la hora en que termina el último cliente, la suma de los tiempos en el sistema (fin de servicio − llegada), el tiempo inactivo total del cajero, el tiempo promedio en el sistema${jefe?", cuántos clientes tuvieron que esperar":""} y el porcentaje de tiempo desocupado del cajero (tiempo inactivo ÷ hora en que termina el último cliente × 100, con 2 decimales).`,
    respuesta:prom,respuestaTexto:`Último cliente termina en ${finAnt}; en el sistema ${sis} (promedio ${f4(prom)}); cajero inactivo ${ocio} (${f2(pct)}%)${jefe?`; esperaron ${esperaron}`:""}`,
    pasos:r.pasos,ops:r.ops,sinTablas:true,
    explicacion:`En un sistema de colas de un solo canal cada cliente llega después del anterior y empieza a ser atendido cuando llega o cuando el cajero termina con el cliente anterior, lo que ocurra al final. El tiempo en el sistema es fin de servicio − llegada, y el cajero está inactivo mientras espera al siguiente cliente. El porcentaje de tiempo desocupado es el tiempo inactivo entre el tiempo total simulado.`,
    campos
  };
}
const tColaCorta=(rng,n)=>tCola(rng,n<=7?3:4);   // revivir: n va de 6 a 8 (volados); la cola usa 3 o 4 clientes
const tColaLarga=(rng,n)=>tCola(rng,n<=11?6:7);  // jefe: n va de 10 a 12 (volados); la cola usa 6 o 7 clientes

/* ---- Juego de volados con apuesta doble ---- */
function corrida(Rs,cap0,meta,ap,r){
  let cap=cap0,sig=ap,metas=0,quiebras=0,juego=1,enJuego=0,mayor=cap0;
  Rs.forEach((R,i)=>{
    const b=Math.min(sig,cap),gana=R<=0.5,antes=cap;
    enJuego++;
    r.op("comp",`Volado ${i+1} (juego ${juego}): R = ${R.toFixed(5)} ${gana?"≤":">"} 0.5 → ${gana?"gana":"pierde"}`);
    cap+=gana?b:-b;mayor=Math.max(mayor,cap);
    r.op("arit",`Apuesta $${b}: capital ${antes} ${gana?"+":"−"} ${b} = $${cap}`);
    sig=gana?ap:2*sig;
    r.op("arit",gana?`La próxima apuesta vuelve a ser $${ap}`:`La próxima apuesta se duplica a $${sig}${sig>cap&&cap>0?` (solo hay $${cap}, así que se apuesta todo el capital)`:""}`);
    if(cap>=meta){metas++;r.op("comp",`$${cap} ≥ $${meta}: llegó a la meta (juego ${juego} terminado). Empieza otro juego con $${cap0}`);cap=cap0;sig=ap;juego++;enJuego=0}
    else if(cap<=0){quiebras++;r.op("comp",`Capital $${cap}: quiebra (juego ${juego} terminado). Empieza otro juego con $${cap0}`);cap=cap0;sig=ap;juego++;enJuego=0}
    else r.op("comp",`$${cap} está entre 0 y $${meta}: el juego sigue`);
  });
  return{metas,quiebras,mayor,capFin:cap,enJuego};
}
function tVolados(rng,N){
  N=clamp(N,6,14);
  const jefe=N>=10,[cap0,meta,ap]=rng.pick([[40,90,20],[50,100,20],[30,70,10],[60,120,20]]);
  let Rs,r,s;
  do{Rs=Array.from({length:N},()=>R5(rng));r=new Resolutor();s=corrida(Rs,cap0,meta,ap,r)}
  while(s.metas+s.quiebras<(jefe?2:1)); // debe terminar al menos un juego (dos en el jefe)
  const term=s.metas+s.quiebras,prob=s.metas/term*100;
  if(s.enJuego)r.pasos.push(`Al acabarse los números, el último juego quedó sin terminar (con $${s.capFin}), así que no cuenta.`);
  r.op("arit",`Probabilidad de llegar a la meta = ${s.metas} / ${term} × 100 = ${f2(prob)}%`,2);
  if(jefe)r.op("comp",`El mayor capital que se alcanzó en un volado fue $${s.mayor}`,N-1);
  const campos=[
    entero("metas","Veces que se llegó a la meta",s.metas),
    entero("quiebras","Veces que se llegó a la quiebra",s.quiebras),
    num("prob","Probabilidad de llegar a la meta (%)",prob,{mostrar:f2(prob)})
  ];
  if(jefe)campos.push(entero("mayor","Mayor capital que se alcanzó en un volado ($, antes de reiniciar el juego)",s.mayor));
  return{
    enunciado:`Juego de volados. Cada juego empieza con $${cap0} y termina al llegar a la meta de $${meta} (capital ≥ $${meta}) o a la quiebra (capital $0). La apuesta inicial es X = $${ap}; si se pierde, la siguiente apuesta es el doble (2X, 4X…) y, si se gana, se vuelve a apostar X. Si el capital no alcanza para la apuesta que toca, se apuesta todo el capital. Se gana el volado si R ≤ 0.5 y se pierde si R > 0.5. Al terminar un juego empieza otro con $${cap0}. Con los números aleatorios R = ${Rs.map(x=>x.toFixed(5)).join(", ")} (usados en orden), calcula cuántas veces se llegó a la meta, cuántas a la quiebra y la probabilidad de llegar a la meta (veces que se llegó a la meta ÷ juegos terminados × 100, con 2 decimales; el juego que quede sin terminar no cuenta)${jefe?", y el mayor capital que se alcanzó en un volado":""}.`,
    respuesta:prob,respuestaTexto:`Meta ${s.metas} veces; quiebra ${s.quiebras} veces; probabilidad de llegar a la meta = ${f2(prob)}%${jefe?`; mayor capital $${s.mayor}`:""}`,
    pasos:r.pasos,ops:r.ops,sinTablas:true,
    explicacion:`En la simulación del juego de volados cada número aleatorio es un volado: si R ≤ 0.5 se gana y se suma la apuesta, y si no se pierde y se resta. Tras una pérdida la apuesta se duplica y tras una ganancia vuelve a X. Cada vez que se llega a la meta o a la quiebra se termina un juego y empieza otro. La probabilidad de llegar a la meta se estima con las veces que se llegó a la meta entre los juegos terminados.`,
    campos
  };
}
return{tCola,tColaCorta,tColaLarga,tVolados};
})();
const {tColaCorta,tColaLarga,tVolados}=N6;
const VELOCIDAD_TUBOS=110,LAMBDA_TUBOS=0.6;
const tSeriesCorta=(rng,n)=>tSeries(rng,n<=11?5:6); // en revivir n va de 10 a 12 (póker y distancias); series usa 5 o 6 números
const NIVELES=[
  {tema:"introducción a la simulación y factores del modelo",vel:VELOCIDAD_TUBOS,lambda:LAMBDA_TUBOS,preg:PREG1,
   plant:{revivir:[tDado,tSuma],jefe:[tDado,tSuma]},
   rango:{revivir:{n:[3,5],t:[60,90]},jefe:{n:[8,9],t:[120,150]}}},
  {tema:"generación de números rectangulares",vel:VELOCIDAD_TUBOS,lambda:LAMBDA_TUBOS,preg:PREG2,
   plant:{revivir:[tMixtoX,tMixtoR,tMulti],jefe:[tPeriodo]},
   rango:{revivir:{n:[2,4],t:[60,105]},jefe:{n:[8,9],t:[180,240]}}}, // en el jefe, n es el valor de m
  {tema:"pruebas de promedios, frecuencias y KS",vel:VELOCIDAD_TUBOS,lambda:LAMBDA_TUBOS,preg:PREG3,
   plant:{revivir:[tPromedios,tFrecuencias],jefe:[tKS,tFrecuencias],monstruo:[tMonMedia,tMonFO]},
   rango:{revivir:{n:[4,6],t:[195,315]},jefe:{n:[7,10],t:[305,440]},monstruo:{n:[4,6],t:[40,150]}}}, // tiempo = operaciones × margen + 15 s por campo extra
  {tema:"pruebas de series, póker y distancias",vel:VELOCIDAD_TUBOS,lambda:LAMBDA_TUBOS,preg:PREG4,
   plant:{revivir:[tPoker,tDistancias,tSeriesCorta],jefe:[tSeries]},
   rango:{revivir:{n:[10,12],t:[300,425]},jefe:{n:[9,12],t:[395,435]}}}, // revivir: n = N de póker y distancias (10 a 12); series usa 5 o 6. Jefe: series con 9 a 12 números
  {tema:"variables no uniformes y Poisson",vel:VELOCIDAD_TUBOS,lambda:LAMBDA_TUBOS,preg:PREG5,
   plant:{revivir:[tExponencial,tUniforme,tEmpirica],jefe:[tPoisson,tExponencial,tEmpirica]},
   rango:{revivir:{n:[4,6],t:[165,280]},jefe:{n:[8,9],t:[270,525]}}}, // revivir: uniforme, exponencial o empírica con 4 a 6 R. Jefe: Poisson, exponencial o empírica con 8 a 9 R
  {tema:"aplicaciones: sistema de colas de un canal y juego de volados",vel:VELOCIDAD_TUBOS,lambda:LAMBDA_TUBOS,preg:PREG6,
   plant:{revivir:[tVolados,tColaCorta],jefe:[tVolados,tColaLarga]},
   rango:{revivir:{n:[6,8],t:[245,315]},jefe:{n:[10,12],t:[425,495]}}} // revivir: volados con 6 a 8 R o cola con 3 o 4 clientes. Jefe: volados con 10 a 12 R o cola con 6 o 7 clientes
];
const MODO_DESARROLLADOR=new URLSearchParams(location.search).get("dev")==="1";

/* ============ Iconos pixel art (sustituyen a los emojis) ============ */
// "." y "0" = transparente; cada dígito se busca en la paleta "c" del icono
const ICONOS={
  corazon:{p:["01100110","11211121","11111111","11111111","01111110","00111100","00011000"],c:{1:"#d90020",2:"#ff5555"}},
  corazonVacio:{p:["01100110","11211121","11111111","11111111","01111110","00111100","00011000"],c:{1:"#2b2f55",2:"#3d4370"}},
  sonido:{p:["..........","....1.....","...11..1..",".1111.1.1.",".1111.1.1.",".1111.1.1.","...11..1..","....1.....","..........",".........."],c:{1:"#fff"}},
  silencio:{p:["..........","....1.....","...11.....",".1111.1.1.",".1111..1..",".1111.1.1.","...11.....","....1.....","..........",".........."],c:{1:"#fff"}},
  pantalla:{p:["111....111","1........1","1........1","..........","..........","..........","..........","1........1","1........1","111....111"],c:{1:"#fff"}},
  copa:{p:[".11111111.","1.311111.1","1.111111.1",".11111111.","..111111..","...1111...","....11....","....11....","...2222...","..222222.."],c:{1:"#ffd479",2:"#c98a2e",3:"#fff3b0"}},
  calavera:{p:["..111111..",".11111111.","1111111111","1122112211","1122112211","1111221111","..111111..","..1.11.1..","..111111..",".........."],c:{1:"#f8edcf",2:"#171a32"}},
  estrella:{p:["....11....","....11....","...1111...","1111111111",".11111111.","..111111..","..111111..",".111..111.",".11....11.",".........."],c:{1:"#ffd479"}},
  libro:{p:["..........",".11111111.",".12222221.",".12333321.",".12222221.",".12333321.",".12222221.",".11111111.","..........",".........."],c:{1:"#b77d58",2:"#f8edcf",3:"#8a8fb0"}},
  monstruo:{p:["3........3","33......33",".11111111.","1122112211","1122112211","1111111111",".11111111.",".15111151.","..111111..",".........."],c:{1:"#79b469",2:"#ffd479",3:"#c98a2e",5:"#fff"}}
};
const ICO_CACHE={};
function icoUrl(n,e){
  const k=n+"@"+e;if(ICO_CACHE[k])return ICO_CACHE[k];
  const d=ICONOS[n],c=document.createElement("canvas");
  c.width=d.p[0].length*e;c.height=d.p.length*e;
  const x=c.getContext("2d");
  d.p.forEach((fila,y)=>[...fila].forEach((ch,i)=>{const col=d.c[ch];if(col){x.fillStyle=col;x.fillRect(i*e,y*e,e,e)}}));
  return ICO_CACHE[k]=c.toDataURL();
}
const ico=(n,e=2,alt="")=>`<img class="ico" src="${icoUrl(n,e)}" alt="${alt}">`;
function icoEl(n,e=2,alt=""){const i=new Image();i.className="ico";i.src=icoUrl(n,e);i.alt=alt;return i}

/* ============ Juego ============ */
const W=480,H=270,GRAV=600,FLAP=-190,GAP=84,PW=32,FX=90,RAD=8;
const NV=()=>NIVELES[G.nivel-1];
const cv=document.getElementById("c"),g=cv.getContext("2d"),panelEl=document.getElementById("panel");
const G={};let tm=null;
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const AudioContexto=window.AudioContext||window.webkitAudioContext||null;
const botonSonido=document.getElementById("audioToggle");
const wrapEl=document.getElementById("wrap"),botonPantalla=document.getElementById("fullscreenToggle");
const sonidos={
  inicio:[{f:390,d:.07},{f:520,d:.07,t:.07},{f:660,d:.12,t:.14}],
  seleccion:[{f:520,d:.06},{f:780,d:.08,t:.05}],
  aleteo:[{f:520,d:.06,e:740}],
  golpe:[{f:190,d:.15,e:65,w:"sawtooth"}],
  curacion:[{f:660,d:.07},{f:880,d:.07,t:.07},{f:1040,d:.12,t:.14}],
  correcto:[{f:660,d:.08},{f:880,d:.12,t:.08}],
  incorrecto:[{f:280,d:.12,e:190},{f:180,d:.16,e:120,t:.12}],
  derrota:[{f:392,d:.14,e:270},{f:260,d:.2,e:140,t:.14}],
  victoria:[{f:523,d:.1},{f:659,d:.1,t:.1},{f:784,d:.18,t:.2}]
};
let audioContext=null,sonidoActivado=true;
function emitirSonido(tipo){
  if(!AudioContexto||!sonidoActivado)return;
  if(!audioContext){
    try{audioContext=new AudioContexto()}
    catch(error){console.error("No se pudo inicializar el audio:",error);return}
  }
  if(audioContext.state==="suspended")audioContext.resume().catch(error=>console.error("No se pudo activar el audio:",error));
  const ahora=audioContext.currentTime;
  sonidos[tipo].forEach(n=>{
    const inicio=ahora+(n.t||0),duracion=n.d;
    const oscilador=audioContext.createOscillator(),volumen=audioContext.createGain();
    oscilador.type=n.w||"square";
    oscilador.frequency.setValueAtTime(n.f,inicio);
    if(n.e)oscilador.frequency.exponentialRampToValueAtTime(n.e,inicio+duracion);
    volumen.gain.setValueAtTime(.0001,inicio);
    volumen.gain.exponentialRampToValueAtTime(.045,inicio+.01);
    volumen.gain.exponentialRampToValueAtTime(.0001,inicio+duracion);
    oscilador.connect(volumen);volumen.connect(audioContext.destination);
    oscilador.start(inicio);oscilador.stop(inicio+duracion+.01);
  });
}
botonSonido.innerHTML=ico("sonido",2);
document.getElementById("fullscreenToggle").innerHTML=ico("pantalla",2);
if(AudioContexto){
  botonSonido.onclick=()=>{
    sonidoActivado=!sonidoActivado;
    botonSonido.innerHTML=ico(sonidoActivado?"sonido":"silencio",2);
    botonSonido.setAttribute("aria-label",sonidoActivado?"Silenciar sonido":"Activar sonido");
    botonSonido.setAttribute("aria-pressed",String(!sonidoActivado));
    if(sonidoActivado)emitirSonido("inicio");
  };
}else botonSonido.hidden=true;
let pantallaCompletaElectron=false;
const estaEnPantallaCompleta=()=>pantallaCompletaElectron||document.fullscreenElement===wrapEl;
const actualizarBotonPantalla=()=>{
  const activa=estaEnPantallaCompleta();
  wrapEl.toggleAttribute("data-fullscreen",activa);
  document.documentElement.toggleAttribute("data-fullscreen",activa);
  botonPantalla.setAttribute("aria-label",activa?"Salir de pantalla completa":"Activar pantalla completa");
  botonPantalla.setAttribute("aria-pressed",String(activa));
  botonPantalla.title=activa?"Salir de pantalla completa":"Activar pantalla completa";
  setTimeout(()=>{ajustarEscala();ajustarPortada()},60);
};
if(window.electronAPI){
  window.electronAPI.isFullscreen().then(activa=>{
    pantallaCompletaElectron=activa;
    actualizarBotonPantalla();
  }).catch(error=>console.error("No se pudo consultar el modo de pantalla completa:",error));
  window.electronAPI.onFullscreenChange(activa=>{
    pantallaCompletaElectron=activa;
    actualizarBotonPantalla();
  });
  botonPantalla.onclick=()=>window.electronAPI.toggleFullscreen();
}else if(document.fullscreenEnabled&&wrapEl.requestFullscreen){
  botonPantalla.onclick=async()=>{
    try{
      if(document.fullscreenElement===wrapEl)await document.exitFullscreen();
      else await wrapEl.requestFullscreen();
    }catch(error){
      console.error("No se pudo cambiar el modo de pantalla completa:",error);
      alert("No se pudo cambiar el modo de pantalla completa en este navegador.");
    }
  };
  document.addEventListener("fullscreenchange",actualizarBotonPantalla);
}else botonPantalla.hidden=true;

/* ===== Escala entera: cada píxel lógico del canvas = k×k píxeles de pantalla ===== */
const hudEl=document.getElementById("hud");
function ajustarEscala(){
  const borde=cv.offsetWidth-cv.clientWidth;
  const pantallaCompleta=estaEnPantallaCompleta();
  let k;
  if(pantallaCompleta){
    const kw=Math.floor((innerWidth*.96-borde)/W);
    const kh=Math.floor((innerHeight-hudEl.offsetHeight-32-borde)/H);
    k=Math.min(kw,kh);
  }else{ // en ventana solo manda el ancho; si no cabe a alto completo, la página hace scroll
    const cs=getComputedStyle(wrapEl);
    const libre=wrapEl.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
    k=Math.floor((libre-borde)/W);
  }
  if(k>=1){
    cv.style.width=(W*k+borde)+"px";cv.style.height=(H*k+borde)+"px";
    hudEl.style.width=pantallaCompleta?cv.style.width:"";
  }else{ // pantallas muy angostas: no hay escala entera posible, ajuste fluido
    cv.style.width="";cv.style.height="";hudEl.style.width="";
  }
  ajustarPortada();
}
addEventListener("resize",ajustarEscala);
addEventListener("load",ajustarEscala);
document.addEventListener("fullscreenchange",()=>setTimeout(ajustarEscala,60));

/* ===== Pixel art: resolución lógica 480×270, se escala sin suavizado ===== */
const ASSETS={fondo:"img/fondo.jpeg",rama:"img/rama.png",monstruo1:"img/monstruo1.png",monstruo2:"img/monstruo2.png",jefe:"img/jefe.png"};
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
  g.fillStyle="#80502d";g.fillRect(x,y,w,h);
  g.fillStyle="#bd8148";g.fillRect(x+3,y,5,h);
  g.fillStyle="#57351f";g.fillRect(x+w-4,y,4,h);
  if(RAMA_PAT){
    g.save();g.beginPath();g.rect(x+1,y,w-2,h);g.clip();
    g.translate(x,y);g.fillStyle=RAMA_PAT;g.fillRect(0,0,w,h);g.restore();
  }
  const tapaY=arriba?y+h-8:y;
  g.fillStyle="#9a6539";g.fillRect(x-4,tapaY,w+8,8);
  g.fillStyle="#d49a5e";g.fillRect(x-3,tapaY+1,w+6,2);
  g.strokeStyle="#4a2d1b";g.lineWidth=2;g.strokeRect(x-4,tapaY,w+8,8);
}

function nuevo(){
  Object.assign(G,{estado:"inicio",nivel:1,puntos:0,y:H/2,vy:0,hearts:3,seg:0,spawned:0,pipes:[],corazones:[],enfrentamiento:null,next:1,cd:0,inv:0,preg:rng.shuffle(NIVELES[0].preg)});
  hud();
}
function hud(){
  if(G.estado==="inicio"){
    document.getElementById("h1").textContent="MODELADO Y SIMULACIÓN DE SISTEMAS DINÁMICOS";
    document.getElementById("h2").textContent="Equipo 4 · FIME UANL";
    return;
  }
  const h1=document.getElementById("h1"),vidas=Math.max(G.hearts,0);
  h1.textContent=(NOMBRE?NOMBRE+" · ":"")+"Nivel "+G.nivel+" · ";
  for(let i=0;i<3;i++)h1.appendChild(icoEl(i<vidas?"corazon":"corazonVacio",2,i<vidas?"Corazón":"Corazón vacío"));
  document.getElementById("h2").textContent=`Puntos ${G.puntos} · Récord ${leerRecord().puntos} · `+(G.seg<2?`Monstruo ${G.seg+1} de 3`:"Jefe final");
}
function panel(html,encuentro=false){
  clearInterval(tm);
  panelEl.classList.toggle("encuentro",encuentro);
  panelEl.classList.remove("inicio");
  panelEl.removeAttribute("style");
  panelEl.innerHTML=html;
  panelEl.scrollTop=0;
  panelEl.style.display="block";
}
function ocultar(){panelEl.style.display="none"}
function timer(seg,onTick,onEnd){
  clearInterval(tm);const t0=performance.now();
  tm=setInterval(()=>{
    const left=seg-(performance.now()-t0)/1000;onTick(Math.max(left,0));
    if(left<=0){clearInterval(tm);onEnd()}
  },100);
}
function retomar(){G.spawned=0;G.pipes=[];G.corazones=[];G.enfrentamiento=null;G.enemigoX=W;G.next=1;G.cd=3;G.y=H/2;G.vy=0;G.estado="cuenta";ocultar();hud()}

/* ===== Jugador, hadas y récord ===== */
const maxPts=()=>NIVELES.length*25+30; // por nivel: 2 preguntas × 5 + jefe 15; al final, 3 corazones × 10, me quiero matar
let NOMBRE="",SEL=0,recMem={nombre:"—",puntos:0};
const HADA_RUTAS=Array.from({length:6},(_,i)=>`img/hada${i+1}.png`);
const HADAS=[];
const cargarHadas=Promise.all(HADA_RUTAS.map(ruta=>new Promise((resolve,reject)=>{
  const imagen=new Image();
  imagen.onload=()=>resolve(imagen);
  imagen.onerror=()=>reject(new Error(`No se pudo cargar ${ruta}`));
  imagen.src=ruta;
}))).then(hadas=>HADAS.push(...hadas));
function leerRecord(){try{const r=JSON.parse(localStorage.getItem("hvm_record"));if(r)return r}catch(e){}return recMem}
function guardarRecord(){
  const r=leerRecord();if(G.puntos<=r.puntos)return false;
  recMem={nombre:NOMBRE,puntos:G.puntos};
  try{localStorage.setItem("hvm_record",JSON.stringify(recMem))}catch(e){}
  return true;
}
function inicio(){
  const r=leerRecord();
  panel(`<div class="portada">
    <h1 class="titulo" aria-label="Hadas vs Monstruos">
      <span class="t-hadas">Hadas</span>
      <span class="t-vs"><i>✦</i> vs <i>✦</i></span>
      <span class="t-monstruos">Monstruos</span>
    </h1>
    <div class="fila">
      <label class="nombre-campo"><span>Tu nombre</span><input id="nom" maxlength="12" placeholder="Escríbelo aquí" autocomplete="off"></label>
      <p class="record">${ico("copa",2)} <span id="rp"></span></p>
    </div>
    <div class="elige">Elige a tu hada</div>
    <div id="hs" role="group" aria-label="Elige a tu hada"></div>
    ${MODO_DESARROLLADOR?`<div class="dev-tools" aria-label="Herramientas de prueba">
      <div class="dev-control"><label for="nivelPrueba">Nivel</label><select id="nivelPrueba">${NIVELES.map((nivel,i)=>`<option value="${i+1}">Nivel ${i+1}</option>`).join("")}</select></div>
      <div class="dev-control"><label for="tipoProblema">Problema</label><select id="tipoProblema"></select></div>
      <button id="probarProblema" type="button" class="probar">Probar problema</button>
    </div>`:""}
    <button id="jugar" class="jugar" type="button">Jugar</button>
    <p class="pista">Espacio o clic = aletear</p>
    <details class="como"><summary>¿Cómo se juega?</summary>
      <p>Cada 10 ramas aparece un monstruo: dos con pregunta (20 s) y el jefe con un problema. Chocar quita un corazón; recoge los corazones que aparezcan para recuperarlos (máximo 3). Si fallas una pregunta, resuelve un problema para revivir.</p>
    </details>
  </div>`);
  panelEl.classList.add("inicio");
  ajustarPortada();
  document.getElementById("rp").textContent=r.puntos>0?`Récord ${r.puntos} · ${r.nombre}`:"Aún sin récord";
  const nom=document.getElementById("nom");nom.value=NOMBRE;nom.oninput=()=>{NOMBRE=nom.value};
  if(MODO_DESARROLLADOR){
    const nivelPrueba=document.getElementById("nivelPrueba");
    const tipoProblema=document.getElementById("tipoProblema");
    const actualizarTipos=()=>{
      const nivel=Number(nivelPrueba.value);
      const plant=NIVELES[nivel-1].plant;
      const tipos=["revivir","jefe"];
      if(plant.monstruo)tipos.push("monstruo");
      tipoProblema.innerHTML=tipos.map(tipo=>`<option value="${tipo}">${tipo==="revivir"?"Revivir":tipo==="jefe"?"Jefe final":"Monstruo"}</option>`).join("");
    };
    nivelPrueba.onchange=actualizarTipos;
    actualizarTipos();
    document.getElementById("probarProblema").onclick=()=>{
      NOMBRE=nom.value.trim()||"Jugador";
      nuevo();
      G.nivel=Number(nivelPrueba.value);
      G.seg=0;
      G.preg=rng.shuffle(NV().preg);
      probarProblema(tipoProblema.value);
    };
  }
  const hs=document.getElementById("hs");
  const elegir=i=>{SEL=i;emitirSonido("seleccion");hs.querySelectorAll(".card").forEach((e,j)=>{e.classList.toggle("sel",j===i);e.setAttribute("aria-pressed",j===i)})};
  HADAS.forEach((h,i)=>{
    const d=document.createElement("button"),imagen=document.createElement("img");
    d.type="button";d.className="card"+(i===SEL?" sel":"");d.setAttribute("aria-pressed",i===SEL);d.setAttribute("aria-label",`Hada ${i+1}`);
    imagen.className="fairy-option";imagen.src=HADA_RUTAS[i];imagen.alt="";
    d.appendChild(imagen);
    d.onclick=()=>elegir(i);
    hs.appendChild(d);
  });
  // flechas ← → para cambiar de hada con el teclado
  hs.onkeydown=e=>{
    if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;
    e.preventDefault();
    const i=(SEL+(e.key==="ArrowRight"?1:HADAS.length-1))%HADAS.length;
    elegir(i);hs.children[i].focus();
  };
  const jg=document.getElementById("jugar");
  jg.onclick=()=>{
    emitirSonido("inicio");NOMBRE=nom.value.trim()||"Jugador";nuevo();
    if(MODO_DESARROLLADOR){G.nivel=Number(document.getElementById("nivelPrueba").value);G.preg=rng.shuffle(NV().preg)}
    retomar();
  };
  nom.onkeydown=e=>{if(e.key==="Enter")jg.click()};
  nom.focus({preventScroll:true});
}

// la portada cubre exactamente el canvas (los demás paneles dejan margen para el HUD)
function ajustarPortada(){
  if(!panelEl.classList.contains("inicio"))return;
  Object.assign(panelEl.style,{
    display:"block",top:cv.offsetTop+cv.clientTop+"px",left:cv.offsetLeft+cv.clientLeft+"px",
    width:cv.clientWidth+"px",height:cv.clientHeight+"px",right:"auto",bottom:"auto"
  });
  // la unidad de la portada sigue al canvas (no al contenedor), para que encaje con cualquier escala
  panelEl.style.setProperty("--u",Math.min(20,Math.max(8,cv.offsetWidth*.0104))+"px");
}
addEventListener("resize",ajustarPortada);
document.addEventListener("fullscreenchange",()=>setTimeout(ajustarPortada,60));

/* ===== Escena de fondo de la portada (se dibuja en el canvas) ===== */
const LUCES=Array.from({length:28},()=>({x:Math.random()*W,y:30+Math.random()*(H-60),v:4+Math.random()*9,f:Math.random()*6.28,c:Math.random()<.35?"#ff9bb0":"#ffe08a",s:Math.random()<.2?3:2}));
const SOMBRAS={};
function sombra(k,alto){ // versión oscurecida del sprite: los monstruos acechan entre las sombras
  if(SOMBRAS[k])return SOMBRAS[k];
  const i=IMG[k];if(!i)return null;
  const esc=alto*2/i.height,c=document.createElement("canvas");
  c.width=Math.round(i.width*esc);c.height=Math.round(i.height*esc);
  const x=c.getContext("2d");x.drawImage(i,0,0,c.width,c.height);
  x.globalCompositeOperation="source-atop";x.fillStyle="rgba(14,12,38,.5)";x.fillRect(0,0,c.width,c.height);
  return SOMBRAS[k]=c;
}
function dibujarInicio(){
  const t=performance.now()/1000;
  if(IMG.fondo)g.drawImage(IMG.fondo,0,0,W,H);else{g.fillStyle=css("--sky");g.fillRect(0,0,W,H)}
  g.fillStyle="rgba(14,17,40,.52)";g.fillRect(0,0,W,H);
  // resplandor rosa detrás del título
  let gr=g.createRadialGradient(W/2,70,5,W/2,70,190);
  gr.addColorStop(0,"rgba(241,138,154,.24)");gr.addColorStop(1,"rgba(241,138,154,0)");
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  // monstruos al acecho en las esquinas
  [["monstruo1",150,-14,0],["jefe",175,null,1.2]].forEach(([k,alto,x0,fase])=>{
    const s=sombra(k,alto);if(!s)return;
    const w=s.width/2,x=x0===null?W-w+12:x0,y=Math.round(Math.sin(t*1.5+fase)*2);
    g.drawImage(s,Math.round(x),Math.round(H-alto+y+6),Math.round(w),alto);
  });
  // viñeta
  gr=g.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,W*.62);
  gr.addColorStop(0,"rgba(8,10,28,0)");gr.addColorStop(1,"rgba(8,10,28,.6)");
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  // luciérnagas
  LUCES.forEach(l=>{
    const x=(l.x+Math.sin(t*.7+l.f)*14+t*l.v*.4)%W,y=l.y+Math.sin(t*1.1+l.f*1.7)*9;
    g.globalAlpha=.3+.7*(.5+.5*Math.sin(t*2+l.f));
    g.fillStyle=l.c;g.fillRect(Math.round(x),Math.round(y),l.s,l.s);
  });
  g.globalAlpha=1;
}
function cerrar(titulo,msg,gano){
  G.estado="fin";
  if(gano)G.puntos+=G.hearts*10;
  const esNuevo=guardarRecord(),r=leerRecord();
  panel(`<h3>${titulo}</h3><p>${msg}</p>
  <p>Puntaje de <span id="pn"></span>: <b>${G.puntos}</b> de ${maxPts()} ${esNuevo?'<span class="ok">¡Nuevo récord!</span>':''}</p>
  <p>Récord: <b>${r.puntos}</b> (<span id="rn"></span>)</p><button id="rei">Jugar otra vez</button><button id="cj">Cambiar jugador</button>`);
  document.getElementById("pn").textContent=NOMBRE;document.getElementById("rn").textContent=r.nombre;
  document.getElementById("rei").onclick=()=>{nuevo();retomar()};
  document.getElementById("cj").onclick=()=>{nuevo();inicio()};
  hud();
}
function fin(msg){emitirSonido("derrota");cerrar("Fin de la partida",msg,false)}
function nivelCompleto(){
  emitirSonido("victoria");
  if(G.nivel>=NIVELES.length)return cerrar(ico("estrella",3)+" ¡Juego completado!",`Corazones restantes: ${G.hearts} (10 puntos cada uno).`,true);
  G.estado="pausa";
  panel(`<h3>${ico("estrella",3)} ¡Nivel ${G.nivel} completado!</h3><p>Puntos: <b>${G.puntos}</b> · Corazones: ${G.hearts}</p>
  <p>Siguiente: <b>Nivel ${G.nivel+1}</b>, ${NIVELES[G.nivel].tema}. La velocidad de los tubos se mantiene; los problemas son más grandes.</p><button id="sn">Siguiente nivel</button>`);
  document.getElementById("sn").onclick=()=>{G.nivel++;G.seg=0;G.preg=rng.shuffle(NV().preg);retomar()};
}

function golpe(piso){
  if(G.inv>0)return;
  emitirSonido("golpe");
  G.hearts--;hud();
  if(piso){G.y=H/2;G.vy=0}
  if(G.hearts<=0)return fin("Te quedaste sin corazones.");
  G.inv=2;
}
function dibujarEnemigo(clave,x){
  const imagen=IMG[clave];
  if(!imagen)return;
  const esJefe=clave==="jefe";
  const altoMax=esJefe?260:235,anchoMax=esJefe?250:180;
  const escala=Math.min(anchoMax/imagen.width,altoMax/imagen.height);
  const ancho=imagen.width*escala,alto=imagen.height*escala;
  g.drawImage(imagen,Math.round(x),Math.round(H-alto),Math.round(ancho),Math.round(alto));
}
function monstruo(){
  G.estado="llegada";
  G.enfrentamiento=G.seg<2?`monstruo${G.seg+1}`:"jefe";
  G.enemigoX=W;G.pipes=[];G.corazones=[];G.y=H/2;G.vy=0;
}
function enfrentarMonstruo(){
  G.estado="pausa";
  if(G.seg<2){NV().sinTeoria?problemaMonstruo():pregunta()}else problema("jefe",()=>{G.puntos+=15;G.enfrentamiento=null;nivelCompleto()},p=>{
    G.enfrentamiento=null;
    G.hearts--;hud();
    solucion(p,()=>G.hearts<=0?fin("Fallaste al jefe y no quedan corazones."):revivir());
  });
}
function pregunta(){
  const q=G.preg[G.seg],ops=rng.shuffle(q.o.map((t,i)=>({t,ok:i===0})));
  panel(`<h3>${icono("monstruo"+(G.seg+1),ico("monstruo",3))} Monstruo ${G.seg+1}</h3><p class="pregunta">${q.q}</p><div class="barra"><i id="b"></i></div><p id="t">20 s</p>`+
    ops.map((o,i)=>`<button class="op" data-i="${i}">${o.t}</button>`).join("")+`<p id="fb"></p>`,true);
  let listo=false;
  const resolver=ok=>{
    if(listo)return;listo=true;clearInterval(tm);
    const fb=document.getElementById("fb");
    emitirSonido(ok?"correcto":"incorrecto");
    if(ok){G.puntos+=5;hud();fb.innerHTML='<span class="ok">¡Correcto! Monstruo derrotado.</span>';setTimeout(()=>{G.seg++;retomar()},1000)}
    else{fb.innerHTML='<span class="mal">Fallaste. Pierdes un corazón.</span>';setTimeout(()=>{G.hearts--;hud();G.hearts<=0?fin("Fallaste la pregunta y no quedan corazones."):revivir()},1200)}
  };
  panelEl.querySelectorAll(".op").forEach(b=>b.onclick=()=>resolver(ops[b.dataset.i].ok));
  timer(20,l=>{document.getElementById("b").style.width=(l/20*100)+"%";document.getElementById("t").textContent=Math.ceil(l)+" s"},()=>resolver(false));
}
function revivir(){
  G.enfrentamiento=null;
  problema("revivir",()=>{G.inv=2;retomar()},p=>solucion(p,()=>fin("No resolviste el problema para revivir.")));
}
function problema(tipo,ok,fail){
  const p=generarProblema(tipo);
  if(p.campos)return problemaCampos(p,tipo,ok,fail);
  panel(`<h3>${tipo==="jefe"?icono("jefe",ico("monstruo",3))+" Jefe final":ico("calavera",3)+" Problema para revivir"}</h3><p>${p.enunciado}</p>
  <div class="barra"><i id="b"></i></div><p id="t">${p.tiempo} s</p>
  <input id="in" type="number" step="any" inputmode="decimal" placeholder="Tu respuesta"> <button id="rs">Responder</button><p id="fb"></p>`,tipo==="jefe");
  const inp=document.getElementById("in");let listo=false;
  const fin_=bien=>{
    if(listo)return;listo=true;clearInterval(tm);
    const fb=document.getElementById("fb");
    emitirSonido(bien?"correcto":"incorrecto");
    if(bien){fb.innerHTML='<span class="ok">¡Correcto!</span>';setTimeout(ok,900)}
    else{fb.innerHTML='<span class="mal">Incorrecto o se acabó el tiempo.</span>';setTimeout(()=>fail(p),900)}
  };
  document.getElementById("rs").onclick=()=>{const v=parseFloat(inp.value);if(!isNaN(v))fin_(acierta(v,p))};
  inp.onkeydown=e=>{if(e.key==="Enter")document.getElementById("rs").click()};
  if(tipo==="jefe")inp.focus({preventScroll:true});else inp.focus();
  timer(p.tiempo,l=>{document.getElementById("b").style.width=(l/p.tiempo*100)+"%";document.getElementById("t").textContent=Math.ceil(l)+" s"},()=>fin_(false));
}
function solucion(p,sig){
  panel(`<h3>Solución</h3><p>${p.enunciado}</p><p class="ok">Respuesta correcta: ${p.respuestaTexto}</p>
  <p>${p.explicacion}</p><ol id="ps"></ol><button id="sg">Continuar</button>`);
  p.pasos.forEach((t,i)=>setTimeout(()=>{const li=document.createElement("li");li.textContent=t;const o=document.getElementById("ps");if(o)o.appendChild(li)},i*500));
  document.getElementById("sg").onclick=sig;
}
function probarProblema(tipo){
  G.estado="pausa";
  const p=generarProblema(tipo);
  const mostrarSolucion=()=>solucion(p,()=>inicio());
  if(p.campos)return problemaCampos(p,tipo,mostrarSolucion,()=>mostrarSolucion());
  panel(`<h3>${tipo==="jefe"?ico("monstruo",3)+" Jefe final":tipo==="monstruo"?ico("monstruo",3)+" Monstruo":ico("calavera",3)+" Problema para revivir"}</h3><p>${p.enunciado}</p>
  <div class="barra"><i id="b"></i></div><p id="t">${p.tiempo} s</p>
  <input id="in" type="number" step="any" inputmode="decimal" placeholder="Tu respuesta"> <button id="rs">Responder</button><p id="fb"></p>`,tipo==="jefe");
  const inp=document.getElementById("in");
  let listo=false;
  const terminar=bien=>{
    if(listo)return;
    listo=true;
    clearInterval(tm);
    emitirSonido(bien?"correcto":"incorrecto");
    document.getElementById("fb").innerHTML=bien?'<span class="ok">¡Correcto!</span>':'<span class="mal">Incorrecto o se acabó el tiempo.</span>';
    setTimeout(mostrarSolucion,900);
  };
  document.getElementById("rs").onclick=()=>{
    const v=parseFloat(inp.value);
    if(!isNaN(v))terminar(acierta(v,p));
  };
  inp.onkeydown=e=>{if(e.key==="Enter")document.getElementById("rs").click()};
  inp.focus({preventScroll:true});
  timer(p.tiempo,l=>{
    document.getElementById("b").style.width=(l/p.tiempo*100)+"%";
    document.getElementById("t").textContent=Math.ceil(l)+" s";
  },()=>terminar(false));
}
function aletear(){if(G.estado==="vuelo"){G.vy=FLAP;emitirSonido("aleteo")}}
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
        const pipe={x:W,gy:rng.int(GAP/2+25,H-GAP/2-25)};
        G.pipes.push(pipe);G.spawned++;
        if(G.hearts<3&&G.corazones.length===0&&rng.next()<0.25)G.corazones.push({x:W+PW/2,y:pipe.gy});
        const x=-(1/NV().lambda)*Math.log(rng.next()||0.0001);G.next=Math.min(4,Math.max(1,x));
      }
    }
    G.pipes.forEach(p=>p.x-=NV().vel*dt);
    G.pipes=G.pipes.filter(p=>p.x>-PW);
    G.corazones.forEach(c=>c.x-=NV().vel*dt);
    G.corazones=G.corazones.filter(c=>c.x>-12);
    for(const p of G.pipes){
      if(FX+RAD>p.x+6&&FX-RAD<p.x+PW-6&&(G.y-RAD<p.gy-GAP/2||G.y+RAD>p.gy+GAP/2)){golpe(false);break}
    }
    if(G.y>H-RAD||G.y<RAD)golpe(true);
    if(G.estado==="vuelo"&&G.hearts<3){
      const i=G.corazones.findIndex(c=>Math.abs(FX-c.x)<RAD+12&&Math.abs(G.y-c.y)<RAD+11);
      if(i!==-1){G.corazones.splice(i,1);G.hearts=Math.min(3,G.hearts+1);hud();emitirSonido("curacion")}
    }
    if(G.estado==="vuelo"&&G.spawned===10&&G.pipes.every(p=>p.x+PW<FX-RAD))monstruo();
  }
  if(G.estado==="llegada"){
    G.enemigoX-=NV().vel*dt;
    if(G.enemigoX<=FX+50){G.enemigoX=FX+50;enfrentarMonstruo()}
  }
  dibujar();requestAnimationFrame(loop);
}
/* ===== Ambiente nocturno y brillo del hada ===== */
let NOCHE=null,HALO=null;
const HADAS_PX=[],ESTELA=[];let ultEstela=0;
function noche(){ // oscurecimiento + viñeta, prerrenderizados una sola vez
  if(NOCHE)return NOCHE;
  const c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d");
  x.fillStyle="rgba(14,17,40,.62)";x.fillRect(0,0,W,H);
  const gr=x.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,W*.62);
  gr.addColorStop(0,"rgba(8,10,28,0)");gr.addColorStop(1,"rgba(8,10,28,.65)");
  x.fillStyle=gr;x.fillRect(0,0,W,H);
  return NOCHE=c;
}
function halo(){ // 24×24 que se amplía sin suavizado: el resplandor sale "pixelado"
  if(HALO)return HALO;
  const c=document.createElement("canvas");c.width=c.height=24;
  const x=c.getContext("2d"),gr=x.createRadialGradient(12,12,1,12,12,12);
  gr.addColorStop(0,"rgba(255,236,160,.85)");gr.addColorStop(.45,"rgba(255,190,120,.35)");gr.addColorStop(1,"rgba(255,160,150,0)");
  x.fillStyle=gr;x.fillRect(0,0,24,24);
  return HALO=c;
}
function hadaPx(i){ // el sprite es una cuadrícula de 29×29 px: se reduce exacto y se dibuja sin deformar píxeles
  if(HADAS_PX[i])return HADAS_PX[i];
  const c=document.createElement("canvas");c.width=c.height=29;
  const x=c.getContext("2d");x.imageSmoothingEnabled=false;x.drawImage(HADAS[i],0,0,29,29);
  return HADAS_PX[i]=c;
}
function dibujarHada(t){
  const px=Math.round(FX),py=Math.round(G.y),parpadeo=G.inv>0&&Math.floor(G.inv*8)%2;
  // estela de chispas
  if(G.estado==="vuelo"&&t-ultEstela>.06){
    ultEstela=t;
    ESTELA.push({t,x:FX-8,y:G.y+Math.random()*10-5,c:Math.random()<.35?"#ff9bb0":"#ffe08a"});
  }
  for(let i=ESTELA.length-1;i>=0;i--){
    const p=ESTELA[i],edad=t-p.t;
    if(edad>.7){ESTELA.splice(i,1);continue}
    g.globalAlpha=1-edad/.7;g.fillStyle=p.c;
    const s=edad<.25?3:2;
    g.fillRect(Math.round(p.x-edad*40),Math.round(p.y+edad*6),s,s);
  }
  // halo: parpadea por pasos para que se sienta pixel art
  g.save();
  g.globalCompositeOperation="lighter";
  g.globalAlpha=(parpadeo?.35:1)*(Math.sin(t*6)>0?.9:.7);
  g.drawImage(halo(),px-48,py-48,96,96);
  g.restore();
  g.globalAlpha=parpadeo?.35:1;
  g.drawImage(hadaPx(SEL),px-14,py-14);
  g.globalAlpha=1;
}
function dibujar(){
  g.imageSmoothingEnabled=false;
  if(G.estado==="inicio")return dibujarInicio();
  if(IMG.fondo){
    g.drawImage(IMG.fondo,0,0,W,H);
    g.drawImage(noche(),0,0);
  }else{g.fillStyle=css("--sky");g.fillRect(0,0,W,H)}
  if(G.enfrentamiento&&(G.estado==="llegada"||G.estado==="pausa"))dibujarEnemigo(G.enfrentamiento,G.enemigoX);
  G.pipes.forEach(p=>{const x=Math.round(p.x),a=Math.round(p.gy-GAP/2),b=Math.round(p.gy+GAP/2);rama(x,0,PW,a,true);rama(x,b,PW,H-b,false)});
  G.corazones.forEach(dibujarCorazon);
  dibujarHada(performance.now()/1000);
  // texto claro con sombra dura: se lee sobre el fondo oscuro
  const texto=(s,x,y)=>{g.fillStyle="#090d20";g.fillText(s,x+1,y+1);g.fillStyle="#f8edcf";g.fillText(s,x,y)};
  g.textAlign="center";g.textBaseline="middle";
  if(G.estado==="cuenta"){g.font='bold 32px "VT323", monospace';texto(String(Math.ceil(G.cd)),W/2,H/2-50)}
  g.font='16px "VT323", monospace';g.textAlign="left";texto(`Ramas del tramo: ${G.spawned}/10`,6,H-8);
}
const CORAZON_PIXEL=["01100110","11211121","11111111","11111111","01111110","00111100","00011000"];
function dibujarCorazon(c){
  const escala=2,x0=Math.round(c.x-8),y0=Math.round(c.y-7);
  CORAZON_PIXEL.forEach((fila,y)=>[...fila].forEach((px,x)=>{
    if(px!=="0"){g.fillStyle=px==="2"?"#ff5555":"#d90020";g.fillRect(x0+x*escala,y0+y*escala,escala,escala)}
  }));
}

cargarHadas.then(()=>{ajustarEscala();nuevo();inicio();requestAnimationFrame(loop)}).catch(error=>{
  console.error(error);
  panel("<p>No se pudieron cargar las hadas. Verifica que las imágenes de la carpeta img estén disponibles.</p>");
});