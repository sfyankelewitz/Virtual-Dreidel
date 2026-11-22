import Phaser from "phaser";
import "./phaser-style.css";

const W=960,H=600;
const names=["You","Sarah","David","Moishe"];
const initials=["Y","S","D","M"];
const colors=["#ffbf3f","#ff5b91","#35c9ed","#62d66f"];
let balances=[100,100,100,100],pot=12,bet=5,turn=0,spinning=false,soundOn=false,gameScene=null;
const $=id=>document.getElementById(id);
const ui={balance:$("balance"),pot:$("pot"),turn:$("turnName"),wager:$("wagerLabel"),status:$("statusMessage"),spin:$("spinButton"),betGrid:$("betGrid")};
function refresh(){
 ui.balance.innerHTML=balances[0]+" <span>✦</span>";ui.pot.textContent=pot;ui.turn.textContent=names[turn];
 ui.wager.textContent=bet+" coin"+(bet===1?"":"s");
 balances.forEach((v,i)=>{const row=$("player"+i);row.classList.toggle("active",i===turn);row.querySelector("strong").textContent=v;row.querySelector("small").textContent=i===turn?(i===0?"Your turn":"Spinning…"):"Ready to play";});
 ui.spin.disabled=spinning||turn!==0||balances[0]<=0;
}
function message(t){ui.status.textContent=t}
class DreidelScene extends Phaser.Scene{
 constructor(){super("DreidelScene")}
 create(){
  gameScene=this;this.drawRoom();this.drawRoomDecor();this.drawTable();this.drawMenorah();this.drawPlayers();this.drawCoins();this.drawDreidel();
  this.drawSparkles();this.cameras.main.setBackgroundColor("#55cbe9");
  this.scale.on("resize",()=>{});
  this.fireGlow=this.add.circle(155,350,145,0xffa64d,.12).setBlendMode(Phaser.BlendModes.ADD);
  this.tweens.add({targets:this.fireGlow,alpha:.22,scale:1.12,duration:680,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
 }
 drawRoom(){
  const g=this.add.graphics();
  // A vivid, layered toy-game backdrop: teal sky, candy-colored panels and chunky trim.
  g.fillGradientStyle(0x36c4e9,0x36c4e9,0x9cecf0,0x9cecf0,1);g.fillRect(0,0,W,360);
  g.fillStyle(0x25a9cb,1);g.fillRect(0,330,W,30);
  g.fillStyle(0xffd56b,1);g.fillRect(0,360,W,240);
  g.fillStyle(0xf8b95c,1);g.fillRect(0,360,W,15);
  // Graphic wall scallops and large soft shapes.
  g.fillStyle(0xffffff,.13);g.fillCircle(760,65,170);g.fillCircle(320,45,130);
  g.fillStyle(0x1e9bbd,.22);g.fillRoundedRect(250,40,460,255,42);
  g.lineStyle(8,0x168db3,1);g.strokeRoundedRect(250,40,460,255,42);
  // Bold framed window with cheerful night sky.
  g.fillStyle(0x236b9e,1);g.fillRoundedRect(40,58,192,164,25);
  g.fillStyle(0xfff1bd,1);g.fillRoundedRect(50,68,172,144,18);
  g.fillGradientStyle(0x4e93d2,0x4e93d2,0x91d9ee,0x91d9ee,1);g.fillRoundedRect(58,76,156,128,13);
  g.fillStyle(0xffe16b,1);g.fillCircle(178,104,18);
  g.fillStyle(0x286c9b,1);g.fillTriangle(58,195,105,139,151,195);g.fillTriangle(105,195,163,129,214,195);
  g.lineStyle(7,0xffffff,1);g.strokeRoundedRect(40,58,192,164,25);
  // Fireplace: strong coral surround, dark plum hearth, animated layered fire.
  g.fillStyle(0x1b5d7a,.22);g.fillRoundedRect(35,240,198,170,28);
  g.fillStyle(0xff6c65,1);g.fillRoundedRect(28,225,205,177,28);
  g.lineStyle(7,0xfff1c8,1);g.strokeRoundedRect(28,225,205,177,28);
  g.fillStyle(0x9d4569,1);g.fillRoundedRect(53,266,155,119,20);
  g.fillStyle(0x583b68,1);g.fillRoundedRect(62,278,137,101,14);
  g.fillStyle(0xffc45d,1);g.fillRoundedRect(40,213,181,27,12);
  g.lineStyle(4,0xfff1c8,1);g.strokeRoundedRect(40,213,181,27,12);
  this.fireBits=[];
  for(let i=0;i<5;i++){
   const x=82+i*23,y=354-(i%3)*13;
   const flame=this.add.ellipse(x,y,23,53+(i%3)*10,i%2?0xff6c49:0xffa82e,1);
   flame.setStrokeStyle(3,0xffe77a,1);this.fireBits.push(flame);
   this.tweens.add({targets:flame,scaleY:1.25,scaleX:.8,y:y-8,duration:230+i*35,yoyo:true,repeat:-1,ease:"Sine.easeInOut",delay:i*35});
   this.add.ellipse(x,y+10,10,27,0xfff5a4,1);
  }
  // Graphic rug-like floor with colorful plank stripes.
  g.fillStyle(0xf28b45,1);g.fillRoundedRect(0,374,W,226,0);
  g.lineStyle(3,0xffe3a2,.65);for(let y=410;y<600;y+=45)g.strokeLineShape(new Phaser.Geom.Line(0,y,W,y));
  for(let x=30;x<W;x+=150)g.fillStyle(0xffd56b,.15),g.fillRect(x,380,5,220);
  // Hanukkah garland and oversized colorful bulbs.
  g.lineStyle(5,0x157e9c,1);g.beginPath();g.moveTo(300,55);g.lineTo(480,108);g.lineTo(660,55);g.strokePath();
  const bulbs=[0xffe05e,0xff668e,0x7c75ff,0x5de0b0,0xff8c52,0x67d8ff,0xffd56b];
  for(let i=0;i<7;i++){let x=330+i*50,y=65+Math.sin(i/6*Math.PI)*40;g.fillStyle(0x155d7d,.25);g.fillCircle(x+3,y+5,12);g.fillStyle(bulbs[i],1);g.fillCircle(x,y,12);g.lineStyle(3,0xffffff,.8);g.strokeCircle(x,y,12)}
 }

 drawRoomDecor(){
  const g=this.add.graphics();
  // Colorful shelf and Hanukkah props fill the room behind the game.
  g.fillStyle(0x1e789b,1);g.fillRoundedRect(735,128,190,145,20);
  g.lineStyle(7,0xffe7a0,1);g.strokeRoundedRect(735,128,190,145,20);
  g.fillStyle(0xffd86b,1);g.fillRoundedRect(750,144,160,26,9);g.fillRoundedRect(750,207,160,26,9);
  const bookColors=[0xff6c65,0x6c77e8,0x56c9a8,0xffb64f,0xe88bb4,0x45b7d9];
  for(let i=0;i<6;i++){g.fillStyle(bookColors[i],1);g.fillRoundedRect(758+i*24,151,17,51,4);g.fillStyle(0xffffff,.55);g.fillRect(762+i*24,157,3,39);}
  g.fillStyle(0xfff4ce,1);g.fillRoundedRect(286,150,116,112,18);
  g.lineStyle(6,0xffc95c,1);g.strokeRoundedRect(286,150,116,112,18);
  this.add.star(344,192,6,12,28,0xff6b8f,1);
  const mini=this.add.graphics();mini.fillStyle(0x2b9fc6,1);mini.fillRoundedRect(319,218,50,28,8);mini.fillStyle(0xffcf4f,1);mini.fillRoundedRect(335,208,18,15,7);
  g.fillStyle(0x9a5b49,1);g.fillRoundedRect(840,303,68,56,13);g.fillStyle(0xffc47a,1);g.fillRoundedRect(834,297,80,16,8);
  for(let i=0;i<7;i++){let x=874+Math.cos(i*1.2)*38,y=296-Math.sin(i*1.1)*43;g.fillStyle(i%2?0x3bbf8b:0x69d66f,1);g.fillEllipse(x,y,19,38);g.lineStyle(2,0x278e6b,.7);g.lineBetween(874,312,x,y);}
  g.fillStyle(0x7c55bd,1);g.fillEllipse(480,492,840,142);g.fillStyle(0xff9b77,1);g.fillEllipse(480,487,810,122);g.fillStyle(0x5dcbd0,1);g.fillEllipse(480,485,770,98);g.lineStyle(5,0xffe16b,1);g.strokeEllipse(480,485,770,98);
  for(let i=0;i<36;i++){const a=i*Math.PI*2/36,x=480+382*Math.cos(a),y=485+47*Math.sin(a);g.fillStyle(0xfff3b0,1);g.fillCircle(x,y,3);}
  g.lineStyle(6,0x287d9e,1);g.lineBetween(480,0,480,35);g.fillStyle(0xffd56b,1);g.fillCircle(480,50,22);g.lineStyle(4,0xfff1b9,1);g.strokeCircle(480,50,22);
  for(let i=0;i<5;i++){let x=370+i*55;g.lineStyle(3,0x237c9a,1);g.lineBetween(x,8,x,35);g.fillStyle([0xff6c65,0xffd56b,0x7c75ff,0x5de0b0,0xff8c52][i],1);g.fillCircle(x,47,15);g.lineStyle(3,0xffffff,.7);g.strokeCircle(x,47,15);}
 }
 drawTable(){
  const g=this.add.graphics();
  // Big toy-like tabletop: saturated teal felt, thick honey-gold edge and dark shadow.
  g.fillStyle(0x173d65,.26);g.fillEllipse(492,514,750,116);
  g.fillStyle(0x8a3e65,1);g.fillEllipse(480,435,760,270);
  g.fillStyle(0xffb94f,1);g.fillEllipse(480,412,760,270);
  g.fillStyle(0xffd875,1);g.fillEllipse(480,397,746,258);
  g.lineStyle(8,0xfff0b5,1);g.strokeEllipse(480,397,746,258);
  g.fillStyle(0xf06d61,1);g.fillEllipse(480,386,710,230);
  g.fillStyle(0xff9b5e,1);g.fillEllipse(480,380,694,218);
  g.fillStyle(0x168f9f,1);g.fillEllipse(480,382,480,176);
  g.fillStyle(0x25bdc2,1);g.fillEllipse(480,374,462,164);
  g.lineStyle(8,0xffe16b,1);g.strokeEllipse(480,374,462,164);
  g.lineStyle(3,0xffffff,.8);g.strokeEllipse(480,374,438,145);
  // dotted decorative ring
  for(let i=0;i<28;i++){const a=i*Math.PI*2/28,x=480+223*Math.cos(a),y=374+78*Math.sin(a);g.fillStyle(0xfff2b0,1);g.fillCircle(x,y,3.5)}
  g.fillStyle(0x167b92,1);g.fillCircle(480,373,48);
  g.lineStyle(6,0xffe16b,1);g.strokeCircle(480,373,48);
  g.fillStyle(0x46d6d0,1);g.fillCircle(480,373,34);
  g.lineStyle(3,0xffffff,.85);g.strokeCircle(480,373,34);
  g.fillStyle(0xfff0a4,1);this.add.star(480,373,6,8,17,0xfff0a4,1).setDepth(4);
 }
 drawMenorah(){
  const g=this.add.graphics();g.lineStyle(8,0xe8b957,1);g.beginPath();g.moveTo(480,183);g.lineTo(480,130);g.moveTo(448,181);g.lineTo(448,153);g.lineTo(480,153);g.moveTo(512,181);g.lineTo(512,153);g.lineTo(480,153);
  for(let i=1;i<=3;i++){g.moveTo(480-i*24,182);g.lineTo(480-i*24,145-i*4);g.lineTo(480-(i-1)*24,145-i*4);g.moveTo(480+i*24,182);g.lineTo(480+i*24,145-i*4);g.lineTo(480+(i-1)*24,145-i*4)}
  g.strokePath();g.fillStyle(0xd99d46,1);g.fillRoundedRect(445,183,70,9,5);g.fillRoundedRect(470,188,20,13,5);
  this.candleFlames=[];
  for(let i=-3;i<=3;i++){let x=480+i*24,y=125+Math.abs(i)*5;g.fillStyle(0xfff0c9,1);g.fillRoundedRect(x-4,y,8,24,4);let flame=this.add.ellipse(x,y-5,9,15,0xffb34e,1);this.candleFlames.push(flame);this.tweens.add({targets:flame,scaleY:1.35,scaleX:.8,duration:300+Math.abs(i)*37,yoyo:true,repeat:-1,ease:"Sine.easeInOut",delay:(i+3)*45})}
  this.add.ellipse(480,210,110,25,0x4a5d7b,.12);
 }

 drawPlayers(){
  this.playerTokens=[];
  const positions=[[148,414],[812,414],[270,492],[690,492]];
  positions.forEach(([x,y],i)=>{
   const badge=this.add.container(x,y);
   const skin=[0xffd4a5,0xf3bd91,0xd99b72,0xffd7b0][i];
   const shirt=[0xffc43d,0xff5b91,0x3bc7e8,0x6bd46e][i];
   const g=this.add.graphics();
   g.fillStyle(0x26486a,.22);g.fillEllipse(4,102,112,28);
   g.fillStyle(0x485a8b,1);g.fillRoundedRect(-27,49,20,28,8);g.fillRoundedRect(7,49,20,28,8);
   g.fillStyle(0xfff4dc,1);g.fillRoundedRect(-33,70,31,15,7);g.fillRoundedRect(3,70,31,15,7);
   g.fillStyle(shirt,1);g.fillRoundedRect(-52,5,24,53,12);g.fillRoundedRect(28,5,24,53,12);
   g.fillStyle(skin,1);g.fillCircle(-40,59,11);g.fillCircle(40,59,11);
   g.fillStyle(0xffffff,1);g.fillRoundedRect(-43,-3,86,65,23);g.lineStyle(5,0x344d78,1);g.strokeRoundedRect(-43,-3,86,65,23);
   g.fillStyle(shirt,1);g.fillRoundedRect(-38,2,76,52,19);g.fillStyle(0xffffff,.75);g.fillRoundedRect(-8,5,16,44,7);
   g.fillStyle(skin,1);g.fillCircle(0,-31,42);g.lineStyle(5,0x344d78,1);g.strokeCircle(0,-31,42);g.fillCircle(-39,-30,10);g.fillCircle(39,-30,10);
   g.fillStyle(0x573d4b,1);
   if(i===0){g.fillRoundedRect(-38,-67,76,19,10);g.fillRoundedRect(-31,-77,62,20,10);}
   else if(i===1){g.fillCircle(-22,-57,17);g.fillCircle(0,-66,18);g.fillCircle(23,-56,17);g.fillRoundedRect(-37,-59,74,15,7);}
   else if(i===2){g.fillRoundedRect(-40,-64,80,23,11);}
   else{g.fillRoundedRect(-40,-65,80,26,12);g.fillRoundedRect(-27,-76,54,16,8);}
   g.fillStyle(0xffffff,1);g.fillEllipse(-15,-32,17,22);g.fillEllipse(15,-32,17,22);g.fillStyle(0x2e3e63,1);g.fillCircle(-13,-30,7);g.fillCircle(17,-30,7);g.fillStyle(0xffffff,1);g.fillCircle(-15,-33,3);g.fillCircle(15,-33,3);
   g.fillStyle(0xff8a9b,.55);g.fillCircle(-26,-17,9);g.fillCircle(26,-17,9);g.lineStyle(4,0x75465a,1);g.beginPath();g.arc(0,-16,14,.15,Math.PI-.15,false);g.strokePath();
   const plate=this.add.graphics();plate.fillStyle(0xfff4d8,1);plate.fillRoundedRect(-43,82,86,28,12);plate.lineStyle(3,0xffffff,1);plate.strokeRoundedRect(-43,82,86,28,12);
   const label=this.add.text(0,95,names[i],{fontFamily:"Fredoka",fontSize:"17px",fontStyle:"bold",color:"#344568",stroke:"#fff4d7",strokeThickness:5}).setOrigin(.5);
   badge.add([g,plate,label]);badge.setScale(1.05);this.playerTokens.push({badge,x,y});
   this.tweens.add({targets:badge,y:y-7,duration:950+i*140,yoyo:true,repeat:-1,ease:"Sine.easeInOut",delay:i*110});
   this.tweens.add({targets:g,rotation:i%2?.025:-.025,duration:1200+i*130,yoyo:true,repeat:-1,ease:"Sine.easeInOut",delay:i*100});
  });
 }
 drawCoins(){
  this.coins=[];const spots=[[330,340],[630,340],[380,426],[580,426],[480,444],[420,330],[540,330]];
  spots.forEach(([x,y],i)=>{const c=this.makeCoin(x,y,i%3===0?1.08:1);this.coins.push(c)});
 }
 makeCoin(x,y,scale=1){
  const coin=this.add.container(x,y).setScale(scale);
  const shadow=this.add.ellipse(3,9,44,23,0x24476b,.24);
  const outer=this.add.ellipse(0,0,42,34,0x9e5b24,1);
  outer.setStrokeStyle(3,0x7c471e,1);
  const face=this.add.ellipse(-1,-3,36,28,0xffd54f,1);face.setStrokeStyle(3,0xfff0a0,1);
  const shine=this.add.ellipse(-8,-9,13,5,0xffffff,.8);
  const star=this.add.text(0,0,"✦",{fontFamily:"Arial",fontSize:"17px",color:"#bd7625",stroke:"#fff0a0",strokeThickness:1}).setOrigin(.5);
  coin.add([shadow,outer,face,shine,star]);
  this.tweens.add({targets:coin,y:y-3,duration:900+Math.random()*300,yoyo:true,repeat:-1,ease:"Sine.easeInOut",delay:Math.random()*500});
  return coin;
 }
 drawDreidel(){
  this.dreidel=this.add.container(480,296);
  this.dreidelShadow=this.add.ellipse(485,374,155,45,0x104c63,.3);
  const g=this.add.graphics();
  // Bright enamel body, thick ink-like outline and layered bevels.
  g.fillStyle(0x1c5d87,1);g.fillRoundedRect(-70,-72,140,142,30);g.lineStyle(8,0x174b70,1);g.strokeRoundedRect(-70,-72,140,142,30);
  g.fillStyle(0x2a9fcb,1);g.fillRoundedRect(-63,-78,126,134,26);g.lineStyle(4,0x8de8f4,1);g.strokeRoundedRect(-63,-78,126,134,26);
  g.fillStyle(0xff6b77,1);g.fillRoundedRect(-50,-64,100,108,19);g.lineStyle(4,0xffb6b2,1);g.strokeRoundedRect(-50,-64,100,108,19);
  g.fillStyle(0xffcf4f,1);g.fillRoundedRect(-38,-52,76,86,15);g.lineStyle(4,0xfff0a0,1);g.strokeRoundedRect(-38,-52,76,86,15);
  // large inset letter plate
  g.fillStyle(0x8c4a85,1);g.fillRoundedRect(-30,-43,60,68,13);g.lineStyle(3,0xffa9dd,1);g.strokeRoundedRect(-30,-43,60,68,13);
  // glossy side highlight
  g.fillStyle(0xffffff,.6);g.fillRoundedRect(-54,-60,9,75,4);
  // handle: golden stem and oversized plum cap
  g.fillStyle(0xffb83e,1);g.fillRoundedRect(-25,-101,50,33,15);g.lineStyle(4,0xffed9a,1);g.strokeRoundedRect(-25,-101,50,33,15);
  g.fillStyle(0x8c4a85,1);g.fillRoundedRect(-19,-126,38,31,14);g.lineStyle(4,0xdca6ed,1);g.strokeRoundedRect(-19,-126,38,31,14);
  g.fillStyle(0xffe16b,1);g.fillCircle(0,-125,8);
  const letter=this.add.text(0,-8,"ג",{fontFamily:"Arial",fontSize:"58px",color:"#fff0a0",stroke:"#69376f",strokeThickness:3}).setOrigin(.5);
  this.dreidel.add([g,letter]);this.dreidelLetter=letter;this.dreidel.setDepth(10);this.dreidel.setScale(1.32);
  // idle anticipation: lively little bob and tilt.
  this.tweens.add({targets:this.dreidel,y:292,rotation:.035,duration:760,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
 }
 drawSparkles(){
  this.sparkles=[];
  for(let i=0;i<22;i++){let x=Phaser.Math.Between(30,930),y=Phaser.Math.Between(30,560);let s=this.add.star(x,y,4,2,5,0xffd779,.7);s.setScale(Phaser.Math.FloatBetween(.35,.85));this.sparkles.push(s);this.tweens.add({targets:s,alpha:0,scale:.12,duration:Phaser.Math.Between(700,1700),yoyo:true,repeat:-1,delay:i*80,ease:"Sine.easeInOut"})}
 }
 spin(letter,done){
  this.tweens.killTweensOf(this.dreidel);this.dreidelLetter.setText(letter);this.dreidel.rotation=0;this.dreidel.setScale(1.32);
  this.tweens.add({targets:this.dreidel,rotation:Math.PI*2*Phaser.Math.Between(5,8)+(Math.random()*Math.PI*2),duration:2100,ease:"Cubic.easeOut",onComplete:()=>{
   this.dreidel.rotation=Math.round(this.dreidel.rotation/(Math.PI/2))*(Math.PI/2);
   this.tweens.add({targets:this.dreidel,scaleX:1.48,scaleY:1.16,duration:130,ease:"Back.easeOut",yoyo:true,onComplete:()=>{this.tweens.add({targets:this.dreidel,scaleX:1.32,scaleY:1.32,duration:180,ease:"Back.easeOut",onComplete:()=>{this.tweens.add({targets:this.dreidel,y:292,rotation:.035,duration:760,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});done(letter)}})}})
  }});
 }
 celebrate(){
  for(let i=0;i<18;i++){let p=this.add.circle(480,300,Phaser.Math.Between(3,7),Phaser.Utils.Array.GetRandom([0xffd36a,0xf29eb8,0x8bcfe8,0x9bd8a6]));this.tweens.add({targets:p,x:p.x+Phaser.Math.Between(-250,250),y:p.y+Phaser.Math.Between(-160,170),alpha:0,scale:.2,duration:900,onComplete:()=>p.destroy()})}
 }
}
const config={type:Phaser.AUTO,parent:"game-canvas",width:W,height:H,backgroundColor:"#b9d5f2",transparent:false,scene:[DreidelScene],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true,roundPixels:false},physics:{default:"arcade",arcade:{debug:false}}};
new Phaser.Game(config);
function setBet(v){bet=v==="all"?Math.max(1,balances[0]):Number(v);document.querySelectorAll("[data-bet]").forEach(b=>b.classList.toggle("selected",b.dataset.bet===String(v)));refresh()}
ui.betGrid.addEventListener("click",e=>{const b=e.target.closest("[data-bet]");if(b)setBet(b.dataset.bet)});
function spinCurrent(){
 if(spinning||turn!==0||balances[0]<=0)return;
 const wager=Math.min(bet,balances[0]);balances[0]-=wager;pot+=wager;spinning=true;refresh();message("Here we go… the dreidel is spinning!");
 const outcomes=["נ","ג","ה","ש"],letter=Phaser.Utils.Array.GetRandom(outcomes);
 gameScene.spin(letter,()=>resolve(letter,0));
}
function resolve(letter,player){
 let text="";
 if(letter==="נ"){text="Nun — nothing this time."}
 else if(letter==="ג"){balances[player]+=pot;text=names[player]+" took the whole pot!";pot=0;gameScene.celebrate()}
 else if(letter==="ה"){let half=Math.ceil(pot/2);balances[player]+=half;pot-=half;text=names[player]+" took half the pot."}
 else{pot+=1;text="Shin — one coin goes into the pot."}
 if(player===0)message(text);refresh();
 turn=(player+1)%4;
 if(turn===0){spinning=false;refresh();if(pot===0){pot=4;balances.forEach((v,i)=>{if(v>0){balances[i]--;pot++}});refresh()}message(text+" Your turn!");return}
 spinning=true;refresh();message(names[turn]+" is taking a turn…");
 gameScene.time.delayedCall(850,()=>{
  let aiBet=Math.min(2,balances[turn]);balances[turn]-=aiBet;pot+=aiBet;refresh();
  const aiLetter=Phaser.Utils.Array.GetRandom(["נ","ג","ה","ש"]);
  gameScene.spin(aiLetter,()=>{resolve(aiLetter,turn)});
 });
}
function resetGame(){balances=[100,100,100,100];pot=12;bet=5;turn=0;spinning=false;setBet(5);refresh();message("New game! Place your wager and spin.");}
ui.spin.addEventListener("click",spinCurrent);$("newGame").addEventListener("click",resetGame);
$("soundButton").addEventListener("click",e=>{soundOn=!soundOn;e.currentTarget.classList.toggle("active",soundOn);message(soundOn?"Sound enabled (audio cues coming in the next pass).":"Sound off.")});
window.addEventListener("keydown",e=>{if(e.code==="Space"&&document.activeElement.tagName!=="BUTTON"){e.preventDefault();spinCurrent()}});
refresh();
