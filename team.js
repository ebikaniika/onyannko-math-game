"use strict";

function buildControls() {
  for(const key of ALLY_KEYS) {
    const type=TYPES[key],button=document.createElement("button");button.type="button";button.className="roster-button";
    button.innerHTML=`<strong>${type.name}</strong><span>${type.cost}円 · HP ${type.hp} · 攻撃 ${type.damage}</span><small>${type.description}</small>`;
    button.setAttribute("aria-pressed",String(selectedTeam.includes(key)));
    button.addEventListener("click",()=>toggleTeam(key));
    $("roster-list").appendChild(button);rosterButtons.push({key,button});
  }
  STAGES.forEach((stage,index)=>{
    const option=document.createElement("option");option.value=String(index);option.textContent=`${index+1}. ${stage.name}`;
    $("stage-select").appendChild(option);stageOptions.push(option);
  });
  $("stage-select").addEventListener("change",()=>{
    const index=Number($("stage-select").value);
    if(!["ready","won","lost"].includes(state.mode) || !Number.isInteger(index) || index<0 || index>unlockedStage || index>=STAGES.length) return;
    reset(index);$("overlay").hidden=false;
    $("result-icon").textContent="ฅ";$("dialog-label").textContent=`STAGE ${index+1} / 30`;
    $("dialog-title").textContent=STAGES[index].name;
    $("dialog-description").innerHTML="ステージで決まった5種類で、挑戦しよう！<br>学習チャレンジで、お金をためられます。";
    $("start").textContent="このステージであそぶ →";$("status").textContent="高難易度：不正解は所持金0円。決まった5種類で挑戦しよう！";
  });
}
function toggleTeam() { /* Hard mode uses the prescribed five-unit team. */ }
function renderLoadout() {
  cards.forEach((card,index)=>{
    const key=selectedTeam[index],type=TYPES[key];card.dataset.kind=key||"";
    if(!type) {card.innerHTML='<span class="unit-info"><strong>仲間を選ぼう</strong><span>上のメンバー一覧から選んでね。</span></span>';card.disabled=true;return;}
    card.innerHTML=`<span class="unit-portrait ${key}"><canvas width="110" height="100" aria-hidden="true"></canvas><kbd>${index+1}</kbd></span><span class="unit-info"><strong>${type.name}</strong><span>${type.description}</span><span class="unit-tags">HP ${type.hp} · 攻撃 ${type.damage} · 待ち ${type.cooldown}秒</span></span><span class="unit-price">${type.cost}<small> 円</small><span class="availability">出撃する →</span></span><span class="cooldown"></span>`;
    const c=card.querySelector("canvas").getContext("2d");c.translate(51,68);c.scale(.9,.9);drawCat(c,key);
  });
}
function updateControls() {
  const signature=`${state.mode}:${state.stageIndex}:${unlockedStage}:${selectedTeam.join(",")}`;
  if(signature===controlsSignature) return;controlsSignature=signature;
  const editable=["ready","won","lost"].includes(state.mode);
  $("stage-select").disabled=!editable;$("stage-select").value=String(state.stageIndex);
  stageOptions.forEach((option,index)=>{option.disabled=index>unlockedStage;});
  $("team-count").textContent="自動入替・5種類";
  $("roster-message").textContent=hardChangeText(state.stageIndex);
  $("start").disabled=selectedTeam.length!==5;
  rosterButtons.forEach(({key,button})=>{button.disabled=true;button.setAttribute("aria-pressed",String(selectedTeam.includes(key)));});
  const start=Math.min(Math.max(0,state.stageIndex-1),STAGES.length-3);
  document.querySelectorAll("[data-stage]").forEach((item,slot)=>{
    const index=start+slot;item.dataset.stage=String(index);item.textContent=`${index+1} ${STAGES[index].name}`;
    item.className=index===state.stageIndex?(state.mode==="won"?"stage-cleared":"stage-current"):index<unlockedStage?"stage-cleared":"stage-locked";
    if(index===state.stageIndex) item.setAttribute("aria-current","step");else item.removeAttribute("aria-current");
  });
}
// Draw each simple pose once, then reuse the bitmap in battle.
// Four small poses per encountered kind; no more than 30 units on the field.
function getSprite(kind,side,pose) {
  const key=`${kind}:${side}:${pose}`;
  if(spriteCache.has(key)) return spriteCache.get(key);
  const sprite=document.createElement("canvas");sprite.width=120;sprite.height=140;
  const c=sprite.getContext("2d");c.translate(60,105);
  const time=pose===1?.13:.39;
  if(side==="ally")drawCat(c,kind,time,pose===1||pose===2,pose===3);
  else drawMonster(c,kind,time,pose===1||pose===2,pose===3);
  spriteCache.set(key,sprite);return sprite;
}
function drawAccessory(c,kind,ink) {
  if(["basic","tank","mage","ninja","knight"].includes(kind)) return;
  const metal="#b5bec1",wood="#ac8b60",gold="#e0bd65";
  if(kind==="archer") {line(c,[[26,-28],[39,-12],[39,5],[26,23]],wood,4);line(c,[[26,-28],[26,23]],ink,1.5);line(c,[[14,-2],[47,-2]],metal,2);path(c,[[47,-2],[40,-6],[40,2]],metal,null);}
  if(kind==="box") {path(c,[[-26,-1],[26,-1],[26,26],[-26,26]],"#c5a976",ink,2);line(c,[[0,0],[0,25]],"#e7ce9f",8);}
  if(kind==="runner") {path(c,[[-27,-29],[27,-29],[27,-22],[-27,-22]],"#df9470",null);path(c,[[-24,-26],[-44,-21],[-39,-32]],"#df9470",null);ellipse(c,-13,23,11,5,"#d18a6a",ink,2);ellipse(c,14,23,11,5,"#d18a6a",ink,2);}
  if(kind==="hammer") {line(c,[[29,24],[29,-30]],wood,5);path(c,[[12,-41],[46,-41],[46,-21],[12,-21]],metal,ink,2);}
  if(kind==="samurai") {path(c,[[-29,-31],[0,-52],[29,-31]],"#718f93",ink,2);path(c,[[0,-48],[-10,-60],[0,-55],[10,-60]],gold,null);line(c,[[25,20],[41,-32]],metal,4);}
  if(kind==="pirate") {path(c,[[-34,-30],[-20,-48],[22,-48],[34,-30]],"#66777c",ink);line(c,[[-4,-20],[12,-20]],ink,7);line(c,[[24,19],[35,-3],[44,-6]],metal,4);}
  if(kind==="viking") {path(c,[[-27,-30],[-20,-45],[21,-45],[27,-30]],metal,ink);path(c,[[-22,-39],[-39,-55],[-34,-34]],"#e9d6a8",ink,2);path(c,[[22,-39],[39,-55],[34,-34]],"#e9d6a8",ink,2);line(c,[[32,23],[32,-16]],wood,4);path(c,[[31,-22],[48,-29],[48,-8],[31,-13]],metal,ink,2);}
  if(kind==="robot") {path(c,[[-23,-2],[24,-2],[24,24],[-23,24]],metal,ink,2);ellipse(c,0,10,6,6,"#9db9a8",ink,1.5);line(c,[[0,-39],[0,-53]],ink,2);ellipse(c,0,-56,4,4,"#dda07b");}
  if(kind==="lion") {for(const [x,y] of [[-29,-25],[-31,-12],[-25,0],[25,0],[31,-12],[29,-25],[0,-41]])ellipse(c,x,y,7,7,"#c49a57",ink,1.5);}
  if(kind==="witch") {path(c,[[-32,-31],[-7,-69],[19,-31]],"#9285ad",ink);line(c,[[-35,-29],[25,-29]],"#b29ac4",7);line(c,[[30,25],[37,-24]],wood,4);ellipse(c,37,-28,6,6,"#b9a2cb",ink,1.5);}
  if(kind==="angel") {path(c,[[-20,2],[-44,-16],[-38,11],[-22,18]],"#fffaf0",ink,2);path(c,[[20,2],[44,-16],[38,11],[22,18]],"#fffaf0",ink,2);ellipse(c,0,-51,20,5,"#f5e7b0",gold,2);}
  if(kind==="dragon") {path(c,[[-20,0],[-46,-23],[-42,15],[-22,20]],"#a3bb8e",ink,2);path(c,[[20,0],[46,-23],[42,15],[22,20]],"#a3bb8e",ink,2);path(c,[[-14,-37],[-16,-56],[-3,-39]],gold,ink,1.5);path(c,[[14,-37],[16,-56],[3,-39]],gold,ink,1.5);}
  if(kind==="chef") {path(c,[[-22,-33],[-22,-49],[22,-49],[22,-33]],"#fffdf5",ink,2);for(const x of [-17,0,17])ellipse(c,x,-52,13,11,"#fffdf5",ink,2);line(c,[[25,21],[34,-5]],wood,4);ellipse(c,36,-10,10,13,metal,ink,2);}
  if(kind==="farmer") {ellipse(c,0,-34,34,6,"#dbbe7b",ink,2);path(c,[[-17,-35],[-11,-53],[11,-53],[17,-35]],"#dbbe7b",ink,2);line(c,[[30,24],[30,-32]],wood,4);line(c,[[24,-33],[46,-33]],metal,5);}
  if(kind==="king") {path(c,[[-24,-34],[-25,-55],[-13,-47],[0,-62],[13,-47],[25,-55],[24,-34]],gold,ink,2);ellipse(c,0,-44,3,4,"#ce947e");path(c,[[-22,0],[-32,27],[27,27],[22,0]],"#c9a0a0",ink,2);line(c,[[32,24],[32,-22]],gold,4);ellipse(c,32,-27,6,6,"#e7c66e",ink,1.5);}
}
