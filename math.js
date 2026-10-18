"use strict";

// Exact integer arithmetic; every level contains 24 different questions.
const FractionQuiz = (() => {
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const shuffle = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const easy = [[2,4],[2,6],[2,8],[2,10],[2,12],[4,6],[4,8],[4,10],
    [4,12],[6,8],[6,10],[6,12],[3,6],[3,9],[3,12],[6,9],
    [9,12],[4,16],[8,12],[8,16],[5,10],[5,15],[10,15],[10,20]];
  const hard = [[18,24],[24,36],[30,42],[36,48],[42,56],[48,72],
    [54,72],[60,84],[66,88],[72,96],[78,104],[84,108],
    [90,126],[96,144],[102,136],[108,144],[114,152],[120,168],
    [126,162],[132,180],[144,168],[150,180],[84,132],[72,120]];
  const pairs = [[[1,2],[1,3]],[[2,3],[1,4]],[[3,4],[1,6]],[[1,3],[2,5]],
    [[2,5],[3,10]],[[1,4],[2,3]],[[3,5],[1,2]],[[5,6],[1,4]],
    [[2,7],[1,3]],[[3,8],[1,4]],[[4,9],[1,6]],[[5,12],[3,8]],
    [[1,5],[2,3]],[[3,7],[1,2]],[[5,8],[2,3]],[[1,6],[2,9]],
    [[4,5],[5,6]],[[2,9],[1,3]],[[3,10],[1,4]],[[5,9],[1,2]],
    [[1,8],[3,4]],[[2,7],[3,14]],[[7,12],[2,3]],[[3,4],[2,5]]];
  function reduction(source, level, i) {
    const [n,d] = source, divisor = gcd(n,d), answer = [n/divisor,d/divisor];
    return { id: `${level}-${i}`, level, source: [source], divisor,
      correct: [answer], reward: level * 100,
      wrong: [[[answer[0]*2,answer[1]*2]],[[answer[0]+1,answer[1]]],[[answer[0],answer[1]+1]]] };
  }
  const banks = {
    1: easy.map((p,i) => reduction(p,1,i)),
    2: hard.map((p,i) => reduction(p,2,i)),
    3: pairs.map((source,i) => {
      const [a,b] = source, common = a[1]/gcd(a[1],b[1])*b[1]*(i%4===0?2:1);
      const correct = source.map(([n,d]) => [n*(common/d),common]);
      return { id:`3-${i}`, level:3, source, common, reward:300, correct,
        wrong: [ [[correct[0][0]+1,common],correct[1]],
          [correct[0],[correct[1][0]+1,common]], correct.map(([n,d])=>[n*2,d*2]) ] };
    })
  };
  const decks = {1:[],2:[],3:[]}, previous = {};
  function next(level) {
    if (!decks[level].length) {
      decks[level] = shuffle(banks[level]);
      if (decks[level][decks[level].length-1].id === previous[level]) decks[level].reverse();
    }
    const question = decks[level].pop(); previous[level] = question.id;
    return { ...question, options:shuffle([question.correct,...question.wrong]) };
  }
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const text = fractions => fractions.map(([n,d])=>`${n}/${d}`).join(" と ");
  const html = fractions => fractions.map(([n,d])=>`<span class="fraction" role="img" aria-label="${d}分の${n}"><span aria-hidden="true">${n}</span><span aria-hidden="true">${d}</span></span>`).join('<span class="fraction-and">と</span>');
  function explain(q, selected) {
    let reason = "";
    if (!equal(selected,q.correct)) {
      if(q.level < 3) {
        const [n,d] = selected[0], [sn,sd] = q.source[0];
        reason = n*sd === sn*d ? "分数の大きさは同じだけど、まだ約分できるよ。これ以上約分できない分数を選ぼう。" : "分数の大きさが変わっているよ。分子と分母を、同じ数で割ろう。";
      } else {
        reason = selected.some(p=>p[1]!==q.common) ? `今回は、分母を問題で指定した${q.common}にそろえよう。` : "分母を何倍したか考えて、分子も同じ数でかけよう。";
      }
    }
    if(q.level < 3) {
      const [n,d]=q.source[0], [an,ad]=q.correct[0];
      return `${reason} ${n}と${d}の最大公約数は${q.divisor}。${n}÷${q.divisor}＝${an}、${d}÷${q.divisor}＝${ad}。答えは${an}/${ad}（これ以上約分できない分数）だよ。`;
    }
    return reason + " " + q.source.map(([n,d],i)=>{
      const factor=q.common/d;
      return `${n}/${d}は分母・分子を${factor}倍するので、${n}×${factor}＝${q.correct[i][0]}、${d}×${factor}＝${q.common}。`;
    }).join(" ") + `答えは${text(q.correct)}だよ。`;
  }
  return { banks, next, equal, html, explain };
})();
