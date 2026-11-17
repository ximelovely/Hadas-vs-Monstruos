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
  const N=NIVELES[nivel-1],{n,t}=N.rango[tipo],mg=N.margen??(nivel>=3?1.6:1.2);let p;
  for(let k=0;k<30;k++){
    p=rng.pick(N.plant[tipo])(rng,rng.int(n[0],n[1]));
    // margen de tiempo: 1.2 en los niveles 1 y 2, 1.6 del nivel 3 en adelante (o el que ponga el nivel en `margen`)
    // problemas con varios campos: tiempo de las operaciones + 10 s por cada campo extra que hay que escribir
    if(p.campos){p.tiempo=calcularTiempo(p.ops,mg)+10*(p.campos.length-1);p.fuera=p.tiempo<t[0]||p.tiempo>t[1];return p}
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

return{tPromedios,tFrecuencias,tKS,tMonMedia,tMonFO,problemaCampos,problemaMonstruo,irANivel,calcProm,calcFrec,calcKS,revisar};
})();
const {tPromedios,tFrecuencias,tKS,tMonMedia,tMonFO,problemaCampos,problemaMonstruo,irANivel}=N3;

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
const VELOCIDAD_TUBOS=110,LAMBDA_TUBOS=0.6;
const NIVELES=[
  {tema:"introducción a la simulación y factores del modelo",vel:VELOCIDAD_TUBOS,lambda:LAMBDA_TUBOS,preg:PREG1,
   plant:{revivir:[tDado,tSuma],jefe:[tDado,tSuma]},
   rango:{revivir:{n:[3,5],t:[60,90]},jefe:{n:[8,9],t:[120,150]}}},
  {tema:"generación de números rectangulares",vel:VELOCIDAD_TUBOS,lambda:LAMBDA_TUBOS,preg:PREG2,
   plant:{revivir:[tMixtoX,tMixtoR,tMulti],jefe:[tPeriodo]},
   rango:{revivir:{n:[2,4],t:[60,105]},jefe:{n:[8,9],t:[180,240]}}}, // en el jefe, n es el valor de m
  {tema:"pruebas de promedios, frecuencias y KS",vel:VELOCIDAD_TUBOS,lambda:LAMBDA_TUBOS,preg:PREG3,
   plant:{revivir:[tPromedios,tFrecuencias],jefe:[tKS,tFrecuencias],monstruo:[tMonMedia,tMonFO]},
   rango:{revivir:{n:[4,6],t:[150,240]},jefe:{n:[7,10],t:[235,335]},monstruo:{n:[4,6],t:[40,100]}}} // tiempo = operaciones × margen + 10 s por campo extra
];
const MODO_DESARROLLADOR=new URLSearchParams(location.search).get("dev")==="1";

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
if(AudioContexto){
  botonSonido.onclick=()=>{
    sonidoActivado=!sonidoActivado;
    botonSonido.textContent=sonidoActivado?"🔊":"🔇";
    botonSonido.setAttribute("aria-label",sonidoActivado?"Silenciar sonido":"Activar sonido");
    botonSonido.setAttribute("aria-pressed",String(!sonidoActivado));
    if(sonidoActivado)emitirSonido("inicio");
  };
}else botonSonido.hidden=true;
if(document.fullscreenEnabled&&wrapEl.requestFullscreen){
  const actualizarBotonPantalla=()=>{
    const activa=document.fullscreenElement===wrapEl;
    botonPantalla.setAttribute("aria-label",activa?"Salir de pantalla completa":"Activar pantalla completa");
    botonPantalla.setAttribute("aria-pressed",String(activa));
    botonPantalla.title=activa?"Salir de pantalla completa":"Activar pantalla completa";
  };
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
    document.getElementById("h1").textContent="Modelado y Simulación";
    document.getElementById("h2").textContent="Equipo 4 · FIME UANL";
    return;
  }
  document.getElementById("h1").textContent=(NOMBRE?NOMBRE+" · ":"")+"Nivel "+G.nivel+" · "+"❤".repeat(Math.max(G.hearts,0))+"🖤".repeat(3-Math.max(G.hearts,0));
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
      <p class="record">🏆 <span id="rp"></span></p>
    </div>
    <div class="elige">Elige a tu hada</div>
    <div id="hs" role="group" aria-label="Elige a tu hada"></div>
    ${MODO_DESARROLLADOR?`<div class="dev-tools"><label for="nivelPrueba">Nivel de prueba</label><select id="nivelPrueba">${NIVELES.map((nivel,i)=>`<option value="${i+1}">Nivel ${i+1}</option>`).join("")}</select></div>`:""}
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
  if(G.nivel>=NIVELES.length)return cerrar("🎉 ¡Juego completado!",`Corazones restantes: ${G.hearts} (10 puntos cada uno).`,true);
  G.estado="pausa";
  panel(`<h3>🎉 ¡Nivel ${G.nivel} completado!</h3><p>Puntos: <b>${G.puntos}</b> · Corazones: ${G.hearts}</p>
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
  panel(`<h3>${icono("monstruo"+(G.seg+1),"👹")} Monstruo ${G.seg+1}</h3><p>${q.q}</p><div class="barra"><i id="b"></i></div><p id="t">20 s</p>`+
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
  panel(`<h3>${tipo==="jefe"?icono("jefe","👹")+" Jefe final":"💀 Problema para revivir"}</h3><p>${p.enunciado}</p>
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
function dibujar(){
  g.imageSmoothingEnabled=false;
  if(G.estado==="inicio")return dibujarInicio();
  if(IMG.fondo){
    g.drawImage(IMG.fondo,0,0,W,H);
    g.fillStyle="rgba(255,255,255,.2)";g.fillRect(0,0,W,H);
  }else{g.fillStyle=css("--sky");g.fillRect(0,0,W,H)}
  if(G.enfrentamiento&&(G.estado==="llegada"||G.estado==="pausa"))dibujarEnemigo(G.enfrentamiento,G.enemigoX);
  G.pipes.forEach(p=>{const x=Math.round(p.x),a=Math.round(p.gy-GAP/2),b=Math.round(p.gy+GAP/2);rama(x,0,PW,a,true);rama(x,b,PW,H-b,false)});
  G.corazones.forEach(dibujarCorazon);
  g.globalAlpha=G.inv>0&&Math.floor(G.inv*8)%2?0.35:1;
  const h=HADAS[SEL];g.drawImage(h,Math.round(FX-16),Math.round(G.y-16),32,32);g.globalAlpha=1;
  g.textAlign="center";g.textBaseline="middle";g.fillStyle=css("--fg");
  if(G.estado==="cuenta"){g.font='bold 32px "VT323", monospace';g.fillText(Math.ceil(G.cd),W/2,H/2-50)}
  g.font='16px "VT323", monospace';g.textAlign="left";g.fillText(`Ramas del tramo: ${G.spawned}/10`,6,H-8);
}
const CORAZON_PIXEL=["01100110","11211121","11111111","11111111","01111110","00111100","00011000"];
function dibujarCorazon(c){
  const escala=2,x0=Math.round(c.x-8),y0=Math.round(c.y-7);
  CORAZON_PIXEL.forEach((fila,y)=>[...fila].forEach((px,x)=>{
    if(px!=="0"){g.fillStyle=px==="2"?"#ff5555":"#d90020";g.fillRect(x0+x*escala,y0+y*escala,escala,escala)}
  }));
}

cargarHadas.then(()=>{nuevo();inicio();requestAnimationFrame(loop)}).catch(error=>{
  console.error(error);
  panel("<p>No se pudieron cargar las hadas. Verifica que las imágenes de la carpeta img estén disponibles.</p>");
});