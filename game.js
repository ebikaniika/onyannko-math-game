"use strict";

// All art is drawn locally. No images, libraries or network requests are needed.
const canvas = document.getElementById("battle");
const ctx = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);
const cards = [...document.querySelectorAll(".unit-card")];
let state;
let quizQuestion = null, quizAnswered = false, quizReturnMode = "ready";
let quizCount = 0, quizCorrect = 0, soundEnabled = true, audioContext = null;
let needsRender = true;
let selectedTeam = ALLY_KEYS.slice(0,5), unlockedStage = 0;
let controlsSignature = "";
const rosterButtons = [], stageOptions = [];
const spriteCache = new Map();

function reset(stageIndex = 0) {
  const learning = $("game-mode").value !== "normal";
  const stage = STAGES[stageIndex];
  state = { mode: "ready", stageIndex, learning, time: 0, money: learning ? 0 : 180, allyHP: 1200, enemyHP: stage.enemyHP,
    units: [], effects: [], cooldowns: Object.fromEntries(ALLY_KEYS.map(key=>[key,0])), nextEnemy: 3, wave: 0, id: 0 };
  quizCount = 0; quizCorrect = 0; needsRender = true; buildScenery(); updateHUD();
}
function start() {
  if (state.mode === "paused") { resume(); return; }
  if(selectedTeam.length !== 5) { $("status").textContent="出撃メンバーを5種類選んでね。"; return; }
  if (state.mode === "won") reset((state.stageIndex + 1) % STAGES.length);
  else if (state.mode === "lost") reset(state.stageIndex);
  else if (state.mode !== "ready") return;
  state.mode = "playing"; $("overlay").hidden = true;
  $("status").textContent = state.learning ? "算数チャレンジでお金をためて、猫を呼ぼう！" : "ボタンを押して、猫たちを出撃させよう！";
  updateHUD();
}
function summon(kind) {
  const type = TYPES[kind];
  if (!type || !selectedTeam.includes(kind) || state.mode !== "playing" || state.money < type.cost || state.cooldowns[kind] > 0) return false;
  if(countSide("ally") >= SIDE_LIMIT) { $("status").textContent="味方は15体まで。前線の仲間を応援しよう！"; return false; }
  if(!addUnit(kind,"ally")) return false;
  state.money -= type.cost; state.cooldowns[kind] = type.cooldown;

  $("status").textContent = type.name + "、しゅつげき！";
  updateHUD(); return true;
}
function countSide(side) { return state.units.filter(unit=>unit.side===side && unit.hp>0).length; }
function addUnit(kind, side) {
  if(!TYPES[kind] || !["ally","enemy"].includes(side) || countSide(side)>=SIDE_LIMIT || state.units.filter(u=>u.hp>0).length>=FIELD_LIMIT) return false;
  state.units=state.units.filter(unit=>unit.hp>0);
  const type = { ...TYPES[kind] };
  if(side === "enemy") {
    const stage = STAGES[state.stageIndex];
    type.hp = Math.round(type.hp * stage.hpScale);
    type.damage = Math.round(type.damage * stage.damageScale);
  }
  state.units.push({ ...type, kind, side, x: side === "ally" ? 158 : 1042, hp: type.hp,
    maxHP: type.hp, attackWait: .3, attackFlash: 0, id: state.id++, walking: true });
  return true;
}
function finish(won) {
  const finalStage = state.stageIndex === STAGES.length - 1;
  needsRender = true;
  if(won) unlockedStage=Math.min(STAGES.length-1,Math.max(unlockedStage,state.stageIndex+1));
  state.mode = won ? "won" : "lost";
  $("result-icon").textContent = won ? "✦" : "☁";
  $("dialog-label").textContent = won ? (finalStage ? "ALL STAGES CLEAR!" : "STAGE CLEAR!") : "TRY AGAIN!";
  $("dialog-title").textContent = won ? (finalStage ? "全30ステージ、大勝利！" : `ステージ${state.stageIndex + 1}、クリア！`) : "お城が落ちちゃった…";
  $("dialog-description").innerHTML = won ? (finalStage ? "猫たちの力で、草原に平和が戻ったよ。<br>算数もバトルも、よくがんばったね！" : `次は「${STAGES[state.stageIndex + 1].name}」。<br>お金とHPはリセット。もっと強い敵に挑もう！`) : "同じステージに、もう一度挑戦できるよ。<br>たてねこと、きしねこで前線を守ろう！";
  $("start").textContent = won ? (finalStage ? "ステージ1からもう一度 →" : `ステージ${state.stageIndex + 2}へ →`) : "このステージに再挑戦 →";
  $("status").textContent = won ? (finalStage ? "全30ステージクリア！ 猫たちと算数の力で大勝利！" : "勝利！ 次のステージへの道が開いたよ。") : "敗北… このステージにもう一度チャレンジしよう！";
  $("overlay").hidden = false; updateHUD();
}
function pause() {
  if (state.mode !== "playing") return;
  state.mode = "paused";
  $("dialog-label").textContent = "TAKE A LITTLE BREAK";
  $("result-icon").textContent = "☕";
  $("dialog-title").textContent = "ちょっと、ひとやすみ。";
  $("dialog-description").innerHTML = "猫たちも休憩中。<br>準備ができたら続きをどうぞ。";
  $("start").textContent = "つづける →"; $("overlay").hidden = false; updateHUD();
}
function resume() { state.mode = "playing"; lastTime = null; $("overlay").hidden = true; updateHUD(); }

function openQuiz() {
  if (!["ready", "playing", "paused"].includes(state.mode)) return;
  quizReturnMode = state.mode; state.mode = "quiz";
  $("math-modal").hidden = false; $("game-content").inert = true;
  nextQuestion(); updateHUD(); $("math-level").focus();
}
function closeQuiz() {
  if (state.mode !== "quiz") return;
  $("math-modal").hidden = true; $("game-content").inert = false;
  state.mode = quizReturnMode; lastTime = null;
  if(document.hidden && state.mode === "playing") pause();
  updateHUD(); $("challenge").focus();
}
function nextQuestion() {
  $("math-scroll").scrollTop = 0;
  quizQuestion = FractionQuiz.next(Number($("math-level").value)); quizAnswered = false;
  const q = quizQuestion;
  $("question-instruction").textContent = q.level < 3 ? "約分して、これ以上約分できない分数を選ぼう。" : `2つの分数の分母を、どちらも ${q.common} にそろえよう。`;
  $("question-fractions").innerHTML = FractionQuiz.html(q.source);
  $("math-options").replaceChildren();
  q.options.forEach((option,index) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "answer-button";
    button.innerHTML = `<span class="answer-number">${index+1}</span>${FractionQuiz.html(option)}`;
    button.setAttribute("aria-label", `答え${index+1}：` + option.map(([n,d])=>`${d}分の${n}`).join(" と "));
    button.addEventListener("click", () => answerQuestion(index));
    $("math-options").appendChild(button);
  });
  $("math-feedback").hidden = true; $("math-next").hidden = true;
  $("math-progress").textContent = `各レベル24問 ／ 正解 ${quizCorrect} ・回答 ${quizCount}`;
}
function answerQuestion(index) {
  if (state.mode !== "quiz" || quizAnswered || !quizQuestion.options[index]) return;
  quizAnswered = true; quizCount++;
  const q = quizQuestion, selected = q.options[index], correct = FractionQuiz.equal(selected,q.correct);
  if (correct) { state.money += q.reward; quizCorrect++; playRewardSound(); }
  const buttons = [...$("math-options").children];
  buttons.forEach((button,i)=>{
    button.disabled = true;
    if(FractionQuiz.equal(q.options[i],q.correct)) button.classList.add("answer-correct");
    else if(i===index) button.classList.add("answer-wrong");
  });
  const feedback = $("math-feedback"); feedback.hidden = false;
  feedback.className = "math-feedback " + (correct ? "is-correct" : "is-wrong");
  const title=document.createElement("strong"); title.textContent=correct ? `正解！ ＋${q.reward}円をゲット！` : "おしい！ 今回の報酬は0円。解き方を見てみよう。";
  const explanation=document.createElement("p");
  // Text is generated exclusively from the fixed integer question bank.
  explanation.innerHTML=FractionQuiz.explain(q,selected).replace(/(\d+)\/(\d+)/g,(_,n,d)=>FractionQuiz.html([[Number(n),Number(d)]]));
  const result=document.createElement("div"); result.className="feedback-answer"; result.innerHTML="正しい答え：" + FractionQuiz.html(q.correct);
  feedback.replaceChildren(title,explanation,result);
  $("math-progress").textContent = `正解 ${quizCorrect} ・回答 ${quizCount} ／ おさいふ ${Math.floor(state.money)}円`;
  $("math-next").hidden = false; updateHUD();
  $("status").textContent = correct ? `算数に正解！ ${q.reward}円ふえたよ。猫を呼んでみよう！` : "算数にチャレンジ！ 解説を読んで、また挑戦しよう。";
}
function playRewardSound() {
  if(!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if(!Audio) return;
    if(!audioContext) audioContext = new Audio();
    if(audioContext.state === "suspended") audioContext.resume().catch(()=>{});
    [523.25,659.25,783.99].forEach((frequency,i)=>{
      const oscillator=audioContext.createOscillator(), gain=audioContext.createGain();
      const when=audioContext.currentTime+i*.11;
      oscillator.type="sine"; oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,when); gain.gain.linearRampToValueAtTime(.12,when+.015); gain.gain.exponentialRampToValueAtTime(.001,when+.23);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(when); oscillator.stop(when+.24);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    });
  } catch (_) { /* A muted/unsupported audio device never blocks the reward. */ }
}

function update(dt) {
  if (state.mode !== "playing") return;
  state.time += dt;
  if (!state.learning && state.money < 999) state.money = Math.min(999, state.money + 30 * dt);
  for (const key of Object.keys(state.cooldowns)) state.cooldowns[key] = Math.max(0, state.cooldowns[key] - dt);
  state.nextEnemy -= dt;
  if (state.nextEnemy <= 0) {
    const stage = STAGES[state.stageIndex];
    if(addUnit(state.time > stage.hornAfter && (state.wave+1) % stage.hornEvery === 0 ? "horn" : "slime", "enemy")) {
      state.wave++;state.nextEnemy += Math.max(stage.minSpawn, stage.spawn - state.time / 100);
    } else state.nextEnemy=.5;
  }
  const sides={ally:state.units.filter(u=>u.side==="ally"),enemy:state.units.filter(u=>u.side==="enemy")};
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    const direction = unit.side === "ally" ? 1 : -1;
    unit.attackWait -= dt; unit.attackFlash = Math.max(0, unit.attackFlash - dt);
    // Choose the closest living opponent ahead, including slightly overlapping units.
    let target = null, distance = Infinity;
    for (const other of sides[unit.side === "ally" ? "enemy" : "ally"]) {
      if (other.side === unit.side || other.hp <= 0) continue;
      const ahead = (other.x - unit.x) * direction;
      if (ahead >= -24 && Math.abs(ahead) < distance) { target = other; distance = Math.abs(ahead); }
    }
    const castleX = unit.side === "ally" ? 1062 : 138;
    const castleDistance = Math.abs(castleX - unit.x);
    const inReach = target && distance <= unit.range;
    const atCastle = !inReach && castleDistance <= unit.range;
    unit.walking = !inReach && !atCastle;
    if (unit.walking) {
      let step = unit.speed * dt;
      if (target) step = Math.min(step, Math.max(0, distance - unit.range));
      step = Math.min(step, Math.max(0, castleDistance - unit.range));
      unit.x += direction * step;
    } else if (unit.attackWait <= 0) {
      unit.attackWait = unit.interval; unit.attackFlash = .22;
      let hitX;
      if (inReach) { target.hp -= unit.damage; hitX = target.x; }
      else {
        const hpKey = unit.side === "ally" ? "enemyHP" : "allyHP";
        state[hpKey] = Math.max(0, state[hpKey] - unit.damage); hitX = castleX;
      }
      state.effects.push({ x: hitX, y: 315, life: .55, maxLife: .55, damage: unit.damage, magic: unit.kind === "mage" });
      if (state.allyHP <= 0 || state.enemyHP <= 0) { finish(state.enemyHP <= 0); break; }
    }
  }
  state.units = state.units.filter(unit => unit.hp > 0);
  state.effects.forEach(effect => { effect.life -= dt; effect.y -= dt * 34; });
  state.effects = state.effects.filter(effect => effect.life > 0).slice(-40);
}
function updateHUD() {
  const stage = STAGES[state.stageIndex];
  $("stage-number").textContent = `STAGE ${String(state.stageIndex+1).padStart(2,"0")} / 30`;
  $("stage-name").textContent=stage.name;$("stage-hint").textContent=stage.hint;
  updateControls();
  const full=countSide("ally")>=SIDE_LIMIT;
  $("field-count").textContent=`味方 ${countSide("ally")}/15 ・ 敵 ${countSide("enemy")}/15`;
  $("game-mode").disabled = !["ready", "won", "lost"].includes(state.mode);
  $("challenge").disabled = ["won", "lost"].includes(state.mode);
  $("income-label").textContent = state.learning ? "正解で増える！" : "＋30 / 秒（999円まで）";
  $("mode-help").textContent = state.learning ? "学習モード：最初は0円。正解したときだけお金が増えるよ。" : "通常モード：最初は180円。時間と算数の正解でお金が増えるよ。";
  $("money").textContent = Math.floor(state.money);
  $("ally-hp").textContent = state.allyHP.toLocaleString() + " / 1,200";
  $("enemy-hp").textContent = state.enemyHP.toLocaleString() + " / " + stage.enemyHP.toLocaleString();
  $("ally-bar").style.width = state.allyHP / 12 + "%";
  $("enemy-bar").style.width = state.enemyHP / stage.enemyHP * 100 + "%";
  $("timer").textContent = String(Math.floor(state.time / 60)).padStart(2, "0") + ":" + String(Math.floor(state.time % 60)).padStart(2, "0");
  $("pause").disabled = !["playing", "paused"].includes(state.mode);
  $("pause").textContent = state.mode === "paused" ? "つづける" : "一時停止";
  for (const card of cards) {
    const key = card.dataset.kind, wait = state.cooldowns[key], type = TYPES[key];
    if(!type) {card.disabled=true;continue;}
    card.disabled = state.mode !== "playing" || state.money < type.cost || wait > 0 || full;
    card.querySelector(".availability").textContent = state.mode === "ready" ? "スタートで出撃" : full ? "味方15体まで" : wait > 0 ? "あと " + wait.toFixed(1) + " 秒" : state.money < type.cost ? "お金をためよう" : "出撃する →";
    card.querySelector(".cooldown").style.width = wait / type.cooldown * 100 + "%";
  }
}

function ellipse(c, x, y, rx, ry, fill, stroke = null, width = 2.5) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function path(c, points, fill, stroke = "#565c4f", width = 2.5) {
  c.beginPath(); points.forEach((p,i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); } if(stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.lineJoin = "round"; c.stroke(); }
}
function line(c, points, color = "#565c4f", width = 2.5) {
  c.beginPath(); points.forEach((p,i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.strokeStyle = color; c.lineWidth = width; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
}
function drawCat(c, kind, time = 0, walking = false, attacking = false) {
  const coat=TYPES[kind].color || "#fffdf1";
  const ink = "#53594e", bob = walking ? Math.sin(time * 12) * 2 : 0;
  c.save(); c.translate(attacking ? 5 : 0, bob);
  const size = kind === "tank" ? 1.18 : kind === "knight" ? 1.12 : 1; c.scale(size,size);
  line(c, [[-23,1],[-35,-8],[-37,-18],[-31,-23]], ink, 5);
  const leg = walking ? Math.sin(time * 12) * 5 : 0;
  ellipse(c,-12+leg,22,8,5,coat,ink); ellipse(c,13-leg,22,8,5,coat,ink);
  ellipse(c,0,3,24,21,coat,ink);
  path(c,[[-25,-18],[-24,-43],[-8,-31],[11,-31],[25,-43],[27,-17]],coat,ink);
  ellipse(c,1,-17,27,22,coat,ink);
  path(c,[[-20,-31],[-20,-37],[-14,-32]],"#eec1b2",null); path(c,[[16,-32],[21,-37],[21,-30]],"#eec1b2",null);
  ellipse(c,-9,-18,2.2,3.3,ink); ellipse(c,11,-18,2.2,3.3,ink);
  ellipse(c,-17,-9,5,2.6,"#f2c7b5"); ellipse(c,19,-9,5,2.6,"#f2c7b5");
  path(c,[[0,-12],[4,-12],[2,-9]],"#b98575",null);
  line(c,[[-5,-6],[-1,-4],[2,-7],[5,-4],[9,-6]],ink,1.8);
  line(c,[[-22,-14],[-32,-17]],ink,1.4); line(c,[[24,-14],[33,-17]],ink,1.4);
  if (kind === "basic") { path(c,[[-17,0],[0,7],[18,0],[12,10],[-9,10]],"#e6a86e",null); ellipse(c,2,8,3,3,"#eed395"); }
  if (kind === "tank") { path(c,[[8,0],[29,-4],[34,1],[31,23],[21,32],[10,22]],"#b5c9ad",ink); line(c,[[21,3],[22,23]],"#eef2d6",3); line(c,[[14,11],[28,10]],"#eef2d6",3); }
  if (kind === "mage") { path(c,[[-30,-32],[-5,-71],[19,-32]],"#a69cbe",ink); path(c,[[-33,-32],[24,-32],[27,-27],[-34,-27]],"#c3b5d1",ink); line(c,[[29,21],[36,-22]],"#967d60",4); star(c,37,-26,9,"#ebca76"); }
  if (kind === "ninja") {
    path(c,[[-25,-28],[25,-28],[27,-19],[-26,-19]],"#6c8691",null);
    path(c,[[-23,-25],[-47,-35],[-42,-20],[-23,-19]],"#6c8691",ink,1.5);
    path(c,[[-19,-1],[0,7],[23,-1],[16,11],[-12,11]],"#6c8691",null);
    star(c,31,5,12,"#a5b2b3"); ellipse(c,31,5,2,2,ink);
  }
  if (kind === "knight") {
    path(c,[[-24,-28],[-22,-43],[0,-51],[23,-43],[26,-28]],"#b5bdc7",ink);
    line(c,[[1,-49],[1,-33]],"#e9edf0",3);
    path(c,[[1,-51],[-4,-61],[9,-65],[14,-57],[10,-50]],"#d69c81",null);
    path(c,[[-21,1],[18,1],[21,21],[-17,21]],"#b5bdc7",ink,2);
    line(c,[[30,22],[30,-7]],"#8d7d64",4);
    path(c,[[27,-6],[27,-38],[31,-45],[35,-38],[35,-6]],"#e4e9e9",ink,2);
    line(c,[[22,-5],[40,-5]],"#c6ac6a",4);
  }
  drawAccessory(c,kind,ink);
  c.restore();
}
function star(c,x,y,r,color) { const p=[]; for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2;const d=i%2?r*.43:r;p.push([x+Math.cos(a)*d,y+Math.sin(a)*d]);}path(c,p,color,null); }
function drawMonster(c, kind, time, walking, attacking) {
  c.save(); c.translate(attacking ? -5 : 0,walking ? Math.abs(Math.sin(time*9))*-4 : 0);
  const horn = kind === "horn", fill = horn ? "#b69ebf" : "#a7bda7";
  if(horn) { path(c,[[-22,-22],[-30,-46],[-10,-31]],"#efddb0"); path(c,[[10,-31],[30,-46],[24,-20]],"#efddb0"); }
  c.beginPath(); c.moveTo(-31,20); c.bezierCurveTo(-38,5,-24,-34,0,-34); c.bezierCurveTo(24,-34,38,5,31,20); c.bezierCurveTo(15,28,13,18,0,25); c.bezierCurveTo(-12,18,-18,29,-31,20); c.fillStyle=fill; c.fill(); c.strokeStyle="#586654"; c.lineWidth=2.5;c.stroke();
  ellipse(c,-10,-7,5,7,"#fff9df"); ellipse(c,10,-7,5,7,"#fff9df");ellipse(c,-12,-6,2,3,"#465143");ellipse(c,8,-6,2,3,"#465143");
  line(c,[[-9,8],[0,12],[10,8]],"#586654",2); if(horn)path(c,[[-7,9],[-4,16],[-1,11]],"#fff9df",null);
  c.restore();
}
function drawCastle(c, enemy) {
  c.save(); c.translate(enemy ? 1090 : 110,350);
  ellipse(c,0,9,75,12,"#637e4c22");
  const fill=enemy?"#b6adb4":"#f4ebd2",edge=enemy?"#797580":"#9e957b";
  path(c,[[-51,0],[-51,-90],[-61,-90],[-61,-116],[-45,-116],[-45,-104],[-29,-104],[-29,-116],[-13,-116],[-13,-90],[13,-90],[13,-116],[29,-116],[29,-104],[45,-104],[45,-116],[61,-116],[61,-90],[51,-90],[51,0]],fill,edge,3);
  path(c,[[-31,-48],[-31,-134],[31,-134],[31,-48]],fill,edge,3);
  if(!enemy) {path(c,[[-40,-133],[-30,-163],[-12,-144],[12,-144],[30,-163],[40,-133]],"#ece0bd",edge,3);ellipse(c,-12,-124,3,4,edge);ellipse(c,12,-124,3,4,edge);line(c,[[-6,-113],[0,-109],[6,-113]],edge,2);}
  else {path(c,[[-36,-134],[-23,-164],[0,-145],[23,-164],[36,-134]],"#8d8594",edge,3);ellipse(c,-12,-123,4,5,"#f9df9b");ellipse(c,12,-123,4,5,"#f9df9b");}
  c.beginPath();c.moveTo(-17,0);c.lineTo(-17,-34);c.arc(0,-34,17,Math.PI,0);c.lineTo(17,0);c.closePath();c.fillStyle=enemy?"#6f6977":"#b6ab89";c.fill();
  line(c,[[0,-162],[0,-201]],edge,3);path(c,[[2,-201],[35,-193],[2,-182]],enemy?"#b48d91":"#dd9a6e",null);
  for(const x of [-40,40]){path(c,[[x-4,-75],[x+4,-75],[x+4,-59],[x-4,-59]],enemy?"#807989":"#c0b38d",null);}
  line(c,[[-50,-33],[-31,-33]],edge,1);line(c,[[31,-20],[50,-20]],edge,1);
  c.restore();
}
// The scenery is rendered once into a small offscreen canvas.
const scenery = document.createElement("canvas"); scenery.width=1200;scenery.height=450;
function buildScenery() {
  const stage=STAGES[state.stageIndex];
  const c=scenery.getContext("2d");c.fillStyle=stage.sky;c.fillRect(0,0,1200,450);
  ellipse(c,887,100,39,39,"#f5edc9");
  for(const [x,y,s] of [[205,104,1],[560,65,.8],[1010,91,.7],[738,135,.6]]){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,0,0,42,10,"#fafbf1");ellipse(c,-15,-6,18,16,"#fafbf1");ellipse(c,12,-9,21,19,"#fafbf1");c.restore();}
  c.fillStyle=stage.hill;c.beginPath();c.moveTo(0,266);c.bezierCurveTo(150,161,294,180,460,260);c.bezierCurveTo(670,115,854,223,960,254);c.bezierCurveTo(1090,180,1170,222,1200,241);c.lineTo(1200,450);c.lineTo(0,450);c.fill();
  c.fillStyle=stage.nearHill;c.beginPath();c.moveTo(0,294);c.bezierCurveTo(210,218,409,300,610,271);c.bezierCurveTo(900,205,1010,288,1200,262);c.lineTo(1200,450);c.lineTo(0,450);c.fill();
  c.fillStyle=stage.grass;c.fillRect(0,331,1200,119);
  c.fillStyle="#e4d9b7";c.beginPath();c.moveTo(0,352);c.bezierCurveTo(400,363,700,345,1200,355);c.lineTo(1200,391);c.bezierCurveTo(760,384,360,403,0,387);c.fill();
  for(let i=0;i<70;i++){const x=(i*179+31)%1200,y=402+(i*31)%45;line(c,[[x-3,y],[x,y-5],[x+3,y]],"#93b179",1.7);}
  for(const [x,y] of [[270,328],[441,419],[806,408],[960,321],[178,411],[702,331]]){line(c,[[x,y],[x,y-10]],"#8aa66f",1.5);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ellipse(c,x+Math.cos(a)*3,y-12+Math.sin(a)*3,2.5,2.5,"#fbf3d8");}ellipse(c,x,y-12,2,2,"#ddb868");}
  drawCastle(c,false);drawCastle(c,true);
}
function render() {
  ctx.clearRect(0,0,1200,450);ctx.drawImage(scenery,0,0);
  for(const unit of state.units){
    ctx.save();ctx.translate(unit.x,345);ellipse(ctx,0,9,26,7,"#536d4022");
    const pose=unit.attackFlash>0?3:unit.walking?1+(Math.floor((state.time+unit.id)*6)%2):0;
    ctx.drawImage(getSprite(unit.kind,unit.side,pose),-60,-105);
    if(unit.hp<unit.maxHP){ctx.fillStyle="#69745d55";ctx.fillRect(-22,-83,44,4);ctx.fillStyle=unit.side==="ally"?"#769a62":"#bb8487";ctx.fillRect(-22,-83,44*Math.max(0,unit.hp/unit.maxHP),4);}
    ctx.restore();
  }
  for(const e of state.effects){ctx.save();ctx.globalAlpha=e.life/e.maxLife;star(ctx,e.x,e.y+13,e.magic?16:10,e.magic?"#fff2ae":"#fff7d4");ctx.font="bold 14px sans-serif";ctx.textAlign="center";ctx.fillStyle=e.magic?"#847099":"#8c7753";ctx.fillText(e.damage,e.x,e.y-6);ctx.restore();}
}
$("start").addEventListener("click",start);
$("challenge").addEventListener("click",openQuiz);
$("math-close").addEventListener("click",closeQuiz);
$("math-next").addEventListener("click",()=>{nextQuestion();$("math-options").children[0].focus();});
$("math-level").addEventListener("change",nextQuestion);
$("game-mode").addEventListener("change",()=>{
  if(["ready","won","lost"].includes(state.mode)) {
    state.learning = $("game-mode").value === "learning";
    state.money = state.learning ? 0 : 180; updateHUD();
  }
});
$("sound").addEventListener("click",()=>{
  soundEnabled=!soundEnabled; $("sound").textContent=soundEnabled?"音：オン":"音：オフ";
  $("sound").setAttribute("aria-pressed",String(soundEnabled));
});
$("pause").addEventListener("click",()=>state.mode==="paused"?resume():pause());
for(const card of cards) card.addEventListener("click",()=>summon(card.dataset.kind));
document.addEventListener("keydown",event=>{
  if(state.mode === "quiz") {
    if(event.key === "Escape") {event.preventDefault();closeQuiz();}
    if(event.key === "Tab") {
      const focusable=[...$("math-modal").querySelectorAll("button:not(:disabled):not([hidden]), select")];
      const first=focusable[0], last=focusable[focusable.length-1];
      if(event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();}
    }
    return;
  }
  if(event.repeat || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
  const kind=selectedTeam[Number(event.key)-1];
  if(kind){event.preventDefault();summon(kind);}
  if(event.key==="Escape"){if(state.mode==="playing")pause();else if(state.mode==="paused")resume();}
});
document.addEventListener("visibilitychange",()=>{if(document.hidden)pause();});
buildControls();renderLoadout();
reset();
let lastTime = null, lastPaint = -Infinity, lastHUD = -Infinity;
function frame(now) {
  const dt=lastTime===null?0:Math.min((now-lastTime)/1000,.05);lastTime=now;
  update(dt);
  if(now-lastPaint >= 1000/30 && (needsRender || state.mode === "playing")) {render();needsRender=false;lastPaint=now;}
  if(state.mode === "playing" && now-lastHUD >= 100) {updateHUD();lastHUD=now;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
