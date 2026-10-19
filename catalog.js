"use strict";

// Small local data tables shared by the two editions. No downloads or saved user data.
const SIDE_LIMIT = 15;
const FIELD_LIMIT = SIDE_LIMIT * 2;
const TYPES = {
  basic:{name:"しろねこ",cost:60,hp:115,damage:23,speed:53,range:43,interval:.85,cooldown:1,description:"手軽に呼べる、前線の主役。",color:"#fffdf1"},
  tank:{name:"たてねこ",cost:140,hp:420,damage:17,speed:30,range:47,interval:1.15,cooldown:3,description:"体力たっぷり。なかまを守る。",color:"#fffdf1"},
  mage:{name:"まほうねこ",cost:220,hp:95,damage:62,speed:39,range:165,interval:1.5,cooldown:4,description:"遠くから、きらりと強い攻撃。",color:"#fffdf1"},
  ninja:{name:"にんじゃねこ",cost:90,hp:80,damage:16,speed:100,range:43,interval:.55,cooldown:1.8,description:"足が速い！ 体力はひかえめ。",color:"#fffdf1"},
  knight:{name:"きしねこ",cost:300,hp:320,damage:85,speed:38,range:58,interval:1.2,cooldown:5,description:"じょうぶなよろいと、強い一撃。",color:"#fffdf1"},
  archer:{name:"ゆみねこ",cost:160,hp:80,damage:29,speed:43,range:195,interval:1.15,cooldown:2.8,description:"長い射程で、後ろから応援。",color:"#eee6d2"},
  box:{name:"はこねこ",cost:110,hp:310,damage:12,speed:28,range:44,interval:1.1,cooldown:2.5,description:"箱をまとった、お手軽な守り役。",color:"#f4e7d2"},
  runner:{name:"ダッシュねこ",cost:80,hp:75,damage:20,speed:120,range:42,interval:.7,cooldown:1.7,description:"いちばんの俊足で、すぐ前線へ。",color:"#f7e8d9"},
  hammer:{name:"ハンマーねこ",cost:280,hp:280,damage:110,speed:32,range:57,interval:1.8,cooldown:5,description:"ゆっくり構えて、重い一撃。",color:"#e9dfd2"},
  samurai:{name:"さむらいねこ",cost:240,hp:190,damage:57,speed:61,range:54,interval:.85,cooldown:3.8,description:"すばやい刀さばきで攻める。",color:"#f0e4dc"},
  pirate:{name:"かいぞくねこ",cost:200,hp:160,damage:42,speed:47,range:110,interval:1.05,cooldown:3.2,description:"少し離れて戦う、海の冒険家。",color:"#f5e6cd"},
  viking:{name:"バイキングねこ",cost:320,hp:460,damage:64,speed:33,range:55,interval:1.3,cooldown:5.2,description:"体力と力をそなえた戦士。",color:"#e7dccb"},
  robot:{name:"ロボねこ",cost:440,hp:620,damage:83,speed:24,range:100,interval:1.5,cooldown:7,description:"足は遅いけど、体力は自慢。",color:"#dce5e6"},
  lion:{name:"ライオンねこ",cost:260,hp:250,damage:45,speed:82,range:49,interval:.8,cooldown:4,description:"元気なたてがみで、前へ進む。",color:"#f6dfac"},
  witch:{name:"まじょねこ",cost:340,hp:120,damage:95,speed:35,range:200,interval:1.7,cooldown:5.8,description:"長い射程と大きな攻撃力。",color:"#e8ddf0"},
  angel:{name:"てんしねこ",cost:190,hp:130,damage:32,speed:66,range:140,interval:1.1,cooldown:3,description:"羽をゆらして、中距離で攻撃。",color:"#fffbed"},
  dragon:{name:"ドラゴンねこ",cost:520,hp:400,damage:145,speed:30,range:175,interval:1.9,cooldown:8,description:"高いお金で呼べる、強い仲間。",color:"#dce9d1"},
  chef:{name:"コックねこ",cost:130,hp:170,damage:27,speed:45,range:53,interval:.9,cooldown:2.2,description:"フライパンで、こつこつ攻撃。",color:"#fff5de"},
  farmer:{name:"のうふねこ",cost:150,hp:220,damage:31,speed:36,range:85,interval:1.1,cooldown:2.8,description:"長いくわで、少し遠くまで届く。",color:"#eee4c4"},
  king:{name:"おうさまねこ",cost:600,hp:750,damage:120,speed:22,range:70,interval:1.5,cooldown:9,description:"たくさん学んで呼ぶ、頼もしい王。",color:"#f9eac8"},
  slime:{hp:92,damage:13,speed:36,range:43,interval:1.15},
  horn:{hp:235,damage:29,speed:29,range:50,interval:1.3}
};
const ALLY_KEYS = Object.keys(TYPES).filter(key => TYPES[key].cost !== undefined);
const STAGE_NAMES = ["はじまりの草原","こもれびの草原","夕やけの決戦","たんぽぽの道","そよ風の丘","ひだまりの森","青空の見晴らし台","クローバーの野原","せせらぎの岸辺","月見の草原", "若葉の小道","朝つゆの丘","木いちごの森","虹のふもと","雲の展望台","秋風の草原","黄金の麦畑","夕映えの坂道","星あかりの森","三日月のとりで", "春待ちの野原","花びらの回廊","新緑の見張り台","遠い山のふもと","光の大平原","きらめきの谷","夜明けのとりで","勇気の草原","希望の丘","おにゃんこ最終決戦"];
const PALETTES = [
  ["#e9f2e4","#d6e4c8","#c4d7ad","#b5cd99"],
  ["#e3efdf","#c5dbbd","#adcba2","#9fbd88"],
  ["#f5e4d4","#e1c6aa","#cbbb94","#b9bf8b"],
  ["#e2edf0","#ccdfd6","#b7d2bb","#aac79c"],
  ["#ece5f1","#d7cedf","#c1c4bd","#acbf9d"]
];
const STAGES = STAGE_NAMES.map((name,i) => {
  const p=PALETTES[i % PALETTES.length];
  return {name,enemyHP:i<3?[1600,2400,3400][i]:3400+(i-2)*180,
    hpScale:i<3?[1,1.25,1.55][i]:1.55+(i-2)*.022,
    damageScale:i<3?[1,1.2,1.4][i]:1.4+(i-2)*.018,
    spawn:i<3?[4.6,3.7,3][i]:Math.max(1.85,3-(i-2)*.04),
    minSpawn:i<3?[2.3,1.9,1.55][i]:Math.max(1.1,1.55-(i-2)*.012),
    hornAfter:i===0?25:i===1?12:0,hornEvery:i<2?3:2,
    hint:i===29?"最後の城！ 学んだ力と、選んだ仲間で大勝利を目指そう。":`全30ステージの${i+1}番目。敵味方それぞれ15体まで。仲間の組み合わせを工夫しよう！`,
    sky:p[0],hill:p[1],nearHill:p[2],grass:p[3]};
});

// 2026-10-19: spawn frequency is 80% of the previous version.
const ENEMY_SPAWN_RATE = 0.8;
function enemySpawnInterval(stage,time) {
  return Math.max(stage.minSpawn,stage.spawn-time/100)/ENEMY_SPAWN_RATE;
}
