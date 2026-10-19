"use strict";
// Integer-only arithmetic. No network, stored records, or external dependencies.
const FractionQuiz = (() => {
 const gcd=(a,b)=>b?gcd(b,a%b):a,lcm=(a,b)=>a/gcd(a,b)*b;
 const divisors=n=>Array.from({length:n},(_,i)=>i+1).filter(d=>n%d===0);
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const shuffle=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const topics={
  1:{name:"約分",reward:100},2:{name:"通分",reward:200},3:{name:"暗算の割り算",reward:300},
  4:{name:"公倍数",reward:200},5:{name:"公約数",reward:200},6:{name:"最小公倍数",reward:300},7:{name:"最大公約数",reward:300},8:{name:"約数",reward:100}
 };
 const banks=Object.fromEntries(Object.keys(topics).map(k=>[k,[]]));
 function add(topic,kind,prompt,correct,wrongs,meta={},source=null){
  const wrong=[];for(const x of wrongs)if(!equal(x,correct)&&!wrong.some(y=>equal(x,y)))wrong.push(x);
  if(wrong.length<3)throw Error('Not enough choices: '+prompt);
  banks[topic].push({id:`${kind}-${banks[topic].length}`,level:topic,topic,kind,prompt,instruction:prompt,correct,wrong:wrong.slice(0,3),reward:topics[topic].reward,...meta,source});
 }
 const spread=(a,limit)=>a.length<=limit?a:Array.from({length:limit},(_,i)=>a[Math.floor(i*a.length/limit)]);
 let candidates=[];
 for(let d=4;d<=20;d++)for(let n=2;n<d;n++)if(gcd(n,d)>1)candidates.push([n,d]);
 for(const [n,d] of spread(candidates,50)){
  const g=gcd(n,d),a=n/g,b=d/g;
  add(1,'reduction','約分して、これ以上約分できない分数を選ぼう。',[[a,b]],[[[a*2,b*2]],[[a+1,b]],[[a,b+1]]],{n,d,divisor:g},[[n,d]]);
 }
 candidates=[];
 for(let a=2;a<=6;a++)for(let b=a+1;b<=6;b++)for(let n=1;n<a;n++)for(let m=1;m<b;m++)if(gcd(n,a)===1&&gcd(m,b)===1&&lcm(a,b)<=12){
  candidates.push([[n,a],[m,b]]);
 }
 for(const source of spread(candidates,24)){
  const common=lcm(source[0][1],source[1][1]);
  const correct=source.map(([n,d])=>[n*(common/d),common]);
  add(2,'denominator',`2つの分数の分母を、どちらも ${common} にそろえよう。`,correct,
   [[[correct[0][0]+1,common],correct[1]],[correct[0],[correct[1][0]+1,common]],correct.map(([n,d])=>[n*2,d*2])],{common},source);
 }
 for(let d=2;d<=9;d++)for(let quotient=2;quotient<=10;quotient++){
  const n=d*quotient;if(n<10||n>50)continue;
  const wrongs=[quotient+1,quotient-1,quotient+2,quotient-2,1,2,3,4,5].filter(x=>x>=1&&x<=10&&d*x<=50);
  add(3,'division',`${n} ÷ ${d} ＝ □　あまりのない答えを選ぼう。`,quotient,wrongs,{n,d,quotient});
 }
 for(let n=10;n<=50;n++){
  const possible=Array.from({length:8},(_,i)=>i+2),yes=possible.filter(d=>n%d===0&&n/d<=10),no=possible.filter(d=>n%d!==0);
  if(!yes.length||no.length<3)continue;
  const d=yes[n%yes.length];
  add(3,'divisible',`${n} を割り切れる数は、次のうちどれ？`,d,no,{n,d,quotient:n/d});
 }
 candidates=[];
 for(let a=2;a<=10;a++)for(let b=a+1;b<=12;b++)if(lcm(a,b)<=12)candidates.push([a,b]);
 for(const [a,b] of spread(candidates,100)){
  const x=lcm(a,b);
  for(const count of [2,3]){
   const correct=Array.from({length:count},(_,i)=>x*(i+1));
   const wrongs=count===2?[[x,x*3],[x*2,x*3],[x+1,x*2+1]]:[[x,x*2,x*4],[x,x*3,x*4],[x+1,x*2+1,x*3+1]];
   add(4,'multiples',`${a} と ${b} の公倍数を、小さい順に${count}個ならべたものを選ぼう。（0は入れません）`,correct,wrongs,{a,b,count});
  }
 }
 candidates=[];
 for(let a=2;a<=12;a++)for(let b=a+1;b<=24;b++)if(gcd(a,b)>1)candidates.push([a,b]);
 for(const [a,b] of spread(candidates,30)){
  const correct=divisors(gcd(a,b)),extra=Array.from({length:10},(_,i)=>i+2).find(x=>!correct.includes(x));
  add(5,'commonDivisors',`${a} と ${b} の公約数を、すべてならべたものを選ぼう。`,correct,[correct.slice(1),correct.slice(0,-1),[...correct,extra].sort((x,y)=>x-y)],{a,b});
 }
 candidates=[];
 for(let a=2;a<=9;a++)for(let b=a+1;b<=10;b++)if(lcm(a,b)<=20)candidates.push([a,b]);
 for(const [a,b] of spread(candidates,30)){
  const x=lcm(a,b);
  add(6,'lcm',`${a} と ${b} の最小公倍数は？`,x,[x*2,x+1,x-1,a*b,a+b],{a,b});
 }
 candidates=[];
 for(let a=2;a<=12;a++)for(let b=a+1;b<=24;b++)if(gcd(a,b)>1)candidates.push([a,b]);
 for(const [a,b] of spread(candidates,30)){
  const x=gcd(a,b);
  add(7,'gcd',`${a} と ${b} の最大公約数は？`,x,[1,x+1,x*2,x+2],{a,b});
 }
 for(let n=4;n<=24;n++){
  const correct=divisors(n),extra=Array.from({length:n+1},(_,i)=>i+2).find(x=>n%x!==0);
  add(8,'divisors',`${n} の約数を、すべてならべたものを選ぼう。`,correct,[correct.slice(1),correct.slice(0,-1),[...correct,extra].sort((x,y)=>x-y)],{n});
 }
 const all=Object.values(banks).flat(),seen=new Set(),review=Object.fromEntries([0,...Object.keys(topics)].map(k=>[k,new Set()]));
 const cycles=Object.fromEntries([0,...Object.keys(topics)].map(k=>[k,1]));let previous=null;
 const pools={0:all,...banks};
 // Small-number foundations, with no question repeats within a mixed cycle.
 function next(topic){
  topic=Number(topic);if(!pools[topic])throw Error('Unknown topic');
  let candidates=pools[topic].filter(q=>!seen.has(q.id));
  if(!candidates.length){
   if(topic===0){seen.clear();for(const r of Object.values(review))r.clear();cycles[0]++;candidates=[...all];}
   else {candidates=pools[topic].filter(q=>!review[topic].has(q.id));if(!candidates.length){review[topic].clear();cycles[topic]++;candidates=[...pools[topic]];}}
  }
  const distinct=candidates.filter(q=>q.id!==previous);if(distinct.length)candidates=distinct;
  const q=candidates[Math.floor(Math.random()*candidates.length)];seen.add(q.id);review[q.topic].add(q.id);previous=q.id;
  return {...q,options:shuffle([q.correct,...q.wrong])};
 }
 const isFraction=value=>Array.isArray(value)&&Array.isArray(value[0]);
 const text=value=>isFraction(value)?value.map(([n,d])=>`${n}/${d}`).join(' と '):Array.isArray(value)?value.join('、'):String(value);
 const accessible=value=>isFraction(value)?value.map(([n,d])=>`${d}分の${n}`).join(' と '):text(value);
 const html=value=>isFraction(value)?value.map(([n,d])=>`<span class="fraction" role="img" aria-label="${d}分の${n}"><span aria-hidden="true">${n}</span><span aria-hidden="true">${d}</span></span>`).join('<span class="fraction-and">と</span>'):`<span class="number-answer${Array.isArray(value)?' number-list':''}">${text(value)}</span>`;
 const paired=n=>divisors(n).filter(d=>d*d<=n).map(d=>`${d}×${n/d}＝${n}`).join('、');
 function explain(q,selected){
  const wrong=!equal(selected,q.correct);let reason='',detail='';
  switch(q.kind){
   case 'reduction':{
    const [n,d]=wrong?selected[0]:q.correct[0];
    reason=wrong?(n*q.d===q.n*d?'分数の大きさは同じですが、まだ約分できます。':'分子と分母を同じ数で割らないと、分数の大きさが変わります。'):'';
    detail=`${q.n}と${q.d}の最大公約数は${q.divisor}。${q.n}÷${q.divisor}＝${q.correct[0][0]}、${q.d}÷${q.divisor}＝${q.correct[0][1]}。これ以上約分できません。`;break;
   }
   case 'denominator':
    reason=wrong?(selected.some(p=>p[1]!==q.common)?`今回は分母を${q.common}にそろえる指定です。`:'分母を何倍したか考え、分子も同じ数でかけます。'):'';
    detail=q.source.map(([n,d],i)=>`${n}/${d}は、${n}×${q.common/d}＝${q.correct[i][0]}、${d}×${q.common/d}＝${q.common}。`).join(' ');break;
   case 'division':
    reason=wrong?`${q.d}×${selected}＝${q.d*selected}なので、${q.n}にもどりません。`:'';
    detail=`${q.n}÷${q.d}＝${q.quotient}。${q.d}×${q.quotient}＝${q.n}でたしかめられます。あまりなく割れるので、${q.d}は${q.n}の約数です。`;break;
   case 'divisible':
    reason=wrong?`${q.n}÷${selected}は、商${Math.floor(q.n/selected)}・あまり${q.n%selected}で、割り切れません。`:'';
    detail=`${q.n}÷${q.d}＝${q.quotient}、${q.d}×${q.quotient}＝${q.n}。あまり0なので、${q.d}は${q.n}の約数です。`;break;
   case 'multiples':
    reason=wrong?`両方の数の倍数を、小さい順に、ぬかさず${q.count}個ならべます。0は入れません。`:'';
    detail=`最小公倍数は${q.correct[0]}。${q.correct[0]}÷${q.a}＝${q.correct[0]/q.a}、${q.correct[0]}÷${q.b}＝${q.correct[0]/q.b}。公倍数はその倍数なので、${text(q.correct)}です。`;break;
   case 'commonDivisors':
    reason=wrong?'片方だけの約数は公約数ではありません。1も入れて、共通する数をすべて選びます。':'';
    detail=`${q.a}の約数は${text(divisors(q.a))}。${q.b}の約数は${text(divisors(q.b))}。両方にある数が${text(q.correct)}です。`;break;
   case 'lcm':
    reason=wrong?'両方の倍数であることに加えて、その中でいちばん小さい数を選びます。':'';
    detail=`${q.a}の倍数は${Array.from({length:q.correct/q.a},(_,i)=>q.a*(i+1)).join('、')}。${q.b}の倍数は${Array.from({length:q.correct/q.b},(_,i)=>q.b*(i+1)).join('、')}。はじめて共通する数が${q.correct}です。`;break;
   case 'gcd':
    reason=wrong?'両方を割り切れる数の中で、いちばん大きい数を選びます。':'';
    detail=`${q.a}の約数は${text(divisors(q.a))}。${q.b}の約数は${text(divisors(q.b))}。公約数${text(divisors(q.correct))}のうち最大は${q.correct}。${q.a}÷${q.correct}＝${q.a/q.correct}、${q.b}÷${q.correct}＝${q.b/q.correct}。`;break;
   case 'divisors':
    reason=wrong?'1とその数自身も約数です。割り切れる数を、もれなく集めます。':'';
    detail=`かけ算の組は${paired(q.n)}。それぞれの組の数を小さい順に集めると${text(q.correct)}です。`;break;
  }
  return `${reason} ${detail} 答えは${text(q.correct)}です。`;
 }
 function stats(topic=0){const pool=pools[Number(topic)];return {total:all.length,pool:pool.length,seen:pool.filter(q=>seen.has(q.id)).length,cycle:cycles[Number(topic)]};}
 return {banks,all,topics,next,equal,html,text,accessible,explain,stats};
})();
