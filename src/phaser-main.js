import Phaser from "phaser";
import "./phaser-style.css";

const W=960,H=600;
const names=["You","Sarah","David","Moishe"];
const initials=["Y","S","D","M"];
const colors=["#ffd780","#f4a6bd","#8dc8ef","#9dd7a3"];
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
  gameScene=this;this.drawRoom();this.drawTable();this.drawMenorah();this.drawPlayers();this.drawCoins();this.drawDreidel();
  this.drawSparkles();this.cameras.main.setBackgroundColor("#b9d5f2");
  this.scale.on("resize",()=>{});
  this.fireGlow=this.add.circle(155,350,145,0xffa64d,.12).setBlendMode(Phaser.BlendModes.ADD);
  this.tweens.add({targets:this.fireGlow,alpha:.22,scale:1.12,duration:680,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
 }
 drawRoom(){
  const g=this.add.graphics();
  g.fillGradientStyle(0x9abbe7,0x9abbe7,0xd3e5f5,0xd3e5f5,1);g.fillRect(0,0,W,350);
  g.fillStyle(0xf0c99e,1);g.fillRect(0,350,W,250);
  g.fillStyle(0xffffff,.17);g.fillRect(0,0,W,350);
  // simple painted wall panels and soft corner shading
  g.lineStyle(4,0x7899c9,.35);for(let x=55;x<W;x+=170){g.strokeLineShape(new Phaser.Geom.Line(x,0,x,350))}
  g.fillStyle(0xfff0d2,1);g.fillRoundedRect(35,72,180,152,22);g.fillStyle(0x8bb9df,1);g.fillRoundedRect(48,85,154,126,14);
  g.fillStyle(0xffd889,1);g.fillCircle(174,111,19);g.fillStyle(0x4f718e,1);
  g.fillTriangle(52,195,96,145,137,195);g.fillTriangle(100,195,155,133,198,195);
  // fireplace, cozy left-side feature
  g.fillStyle(0xe9b87f,1);g.fillRoundedRect(34,228,184,170,22);
  g.fillStyle(0xffe3b4,1);g.fillRoundedRect(22,220,208,27,12);
  g.fillStyle(0x57415c,1);g.fillRoundedRect(58,266,137,111,19);
  g.fillStyle(0x9b6c56,1);g.fillRoundedRect(45,374,162,18,9);
  g.fillStyle(0x65465b,1);g.fillRoundedRect(51,257,151,15,7);
  for(let i=0;i<5;i++){let x=76+i*24;g.fillStyle(i%2?0xff9c3d:0xffc35a,1);g.fillEllipse(x,348-(i%3)*12,17,47+(i%3)*12);g.fillStyle(0xffed9a,1;g.fillEllipse(x,354-(i%3)*12,7,28)}
  // floorboards in perspective
  g.lineStyle(3,0xb27f61,.32);for(let y=385;y<600;y+=38)g.strokeLineShape(new Phaser.Geom.Line(0,y,W,y));
  for(let x=-200;x<W+200;x+=160)g.strokeLineShape(new Phaser.Geom.Line(x,350,x-190,600));
  // warm base trim
  g.fillStyle(0xffe8c6,1);g.fillRect(0,346,W,12);
  // wall garland dots
  g.lineStyle(3,0x658b85,.8);g.beginPath();g.moveTo(330,75);g.lineTo(480,110);g.lineTo(640,75);g.strokePath();
  for(let i=0;i<9;i++){g.fillStyle([0xffd36a,0xf39db2,0x8bd1b2][i%3],1);g.fillCircle(340+i*36,78+Math.sin(i/8*Math.PI)*31,5)}
 }
 drawTable(){
  const g=this.add.graphics();
  // soft ground shadow
  g.fillStyle(0x4a5d7b,.16);g.fillEllipse(492,510,690,105);
  // thick round game table, tilted into a fixed perspective
  g.fillStyle(0x986444,1);g.fillEllipse(480,426,730,258);
  g.fillStyle(0xd6a174,1);g.fillEllipse(480,405,730,258);
  g.fillStyle(0xf2c38e,1);g.fillEllipse(480,390,730,258);
  g.fillStyle(0xb97d52,1);g.fillEllipse(480,387,698,236);
  g.fillStyle(0x7c4b39,1);g.fillEllipse(480,378,676,220);
  g.fillStyle(0x367d83,1);g.fillEllipse(480,382,450,166);
  g.fillStyle(0x4ba0a0,1);g.fillEllipse(480,374,432,154);
  g.lineStyle(6,0xffd57c,.9);g.strokeEllipse(480,374,432,154);
  g.lineStyle(2,0xffffff,.35);g.strokeEllipse(480,374,656,205);
  // stylized stitched rim
  g.lineStyle(2,0xf5d7a7,.6);g.strokeEllipse(480,395,710,246);
  // central medallion
  g.fillStyle(0x286a73,1);g.fillCircle(480,373,43);g.lineStyle(3,0xffd77c,.9);g.strokeCircle(480,373,43);
  g.fillStyle(0xffe3a1,1);g.fillCircle(480,373,5);
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
  const positions=[[150,414],[810,414],[260,474],[700,474]];
  positions.forEach(([x,y],i)=>{
   const shadow=this.add.ellipse(x+3,y+11,80,26,0x2d4662,.18);
   const badge=this.add.container(x,y);
   const plate=this.add.graphics();plate.fillStyle(0xfff7e6,1);plate.fillRoundedRect(-38,-35,76,72,24);plate.lineStyle(3,0xffffff,1);plate.strokeRoundedRect(-38,-35,76,72,24);
   const avatar=this.add.circle(0,-7,23,Phaser.Display.Color.HexStringToColor(colors[i]).color,1);
   const letter=this.add.text(0,-8,initials[i],{fontFamily:"Fredoka",fontSize:"22px",fontStyle:"600",color:"#4b5471"}).setOrigin(.5);
   const name=this.add.text(0,25,names[i],{fontFamily:"DM Sans",fontSize:"12px",fontStyle:"bold",color:"#435374"}).setOrigin(.5);
   badge.add([plate,avatar,letter,name]);this.playerTokens.push({badge,shadow,x,y});
   this.tweens.add({targets:badge,y:y-4,duration:1200+i*150,yoyo:true,repeat:-1,ease:"Sine.easeInOut",delay:i*140});
  });
 }
 drawCoins(){
  this.coins=[];const spots=[[330,340],[630,340],[380,426],[580,426],[480,444],[420,330],[540,330]];
  spots.forEach(([x,y],i)=>{const c=this.makeCoin(x,y,i%3===0?1.08:1);this.coins.push(c)});
 }
 makeCoin(x,y,scale=1){
  const coin=this.add.container(x,y).setScale(scale);
  const shadow=this.add.ellipse(3,7,40,18,0x3b526d,.2);
  const outer=this.add.ellipse(0,0,38,30,0xd99139,1);
  const face=this.add.ellipse(-1,-2,31,24,0xffd879,1);
  const shine=this.add.ellipse(-7,-7,9,4,0xffffff,.55);
  const star=this.add.text(0,0,"✦",{fontFamily:"Arial",fontSize:"13px",color:"#a96d2d"}).setOrigin(.5);
  coin.add([shadow,outer,face,shine,star]);return coin;
 }
 drawDreidel(){
  this.dreidel=this.add.container(480,302);
  this.dreidelShadow=this.add.ellipse(485,374,135,38,0x1e455b,.25);
  const g=this.add.graphics();
  // bevelled, softly cartoon body with gold trim
  g.fillStyle(0x72473b,1);g.fillRoundedRect(-62,-70,124,132,23);
  g.fillStyle(0xc98454,1);g.fillRoundedRect(-58,-76,116,128,22);
  g.fillStyle(0xf2c58d,1);g.fillRoundedRect(-49,-69,98,112,17);
  g.fillStyle(0xd99b63,1);g.fillRoundedRect(-40,-62,80,98,14);
  g.fillStyle(0x8c5741,1);g.fillRoundedRect(-31,-53,62,80,10);
  g.lineStyle(3,0xffd77c,1);g.strokeRoundedRect(-35,-57,70,88,12);
  // top and rounded handle
  g.fillStyle(0x805344,1);g.fillRoundedRect(-23,-96,46,30,14);
  g.fillStyle(0xc9895c,1);g.fillRoundedRect(-20,-101,40,30,13);
  g.fillStyle(0x6d493d,1);g.fillRoundedRect(-14,-123,28,29,12);
  g.fillStyle(0xd99b67,1);g.fillRoundedRect(-11,-126,22,27,10);
  g.fillStyle(0xffe4b2,.5);g.fillRoundedRect(-43,-55,9,77,4);
  const letter=this.add.text(0,-6,"ג",{fontFamily:"Arial",fontSize:"58px",color:"#ffd36a",stroke:"#8e5b3d",strokeThickness:1}).setOrigin(.5);
  this.dreidel.add([g,letter]);this.dreidelLetter=letter;
  this.dreidel.setDepth(10);
 }
 drawSparkles(){
  this.sparkles=[];
  for(let i=0;i<22;i++){let x=Phaser.Math.Between(30,930),y=Phaser.Math.Between(30,560);let s=this.add.star(x,y,4,2,5,0xffd779,.7);s.setScale(Phaser.Math.FloatBetween(.35,.85));this.sparkles.push(s);this.tweens.add({targets:s,alpha:0,scale:.12,duration:Phaser.Math.Between(700,1700),yoyo:true,repeat:-1,delay:i*80,ease:"Sine.easeInOut"})}
 }
 spin(letter,done){
  this.dreidelLetter.setText(letter);this.dreidel.rotation=0;this.dreidel.setScale(1);
  this.tweens.add({targets:this.dreidel,rotation:Math.PI*2*Phaser.Math.Between(5,8)+(Math.random()*Math.PI*2),duration:2100,ease:"Cubic.easeOut",onComplete:()=>{
   this.dreidel.rotation=Math.round(this.dreidel.rotation/(Math.PI/2))*(Math.PI/2);
   this.tweens.add({targets:this.dreidel,scaleX:1.13,scaleY:.88,duration:130,ease:"Back.easeOut",yoyo:true,onComplete:()=>{this.tweens.add({targets:this.dreidel,scaleX:1,scaleY:1,duration:180,ease:"Back.easeOut"});done(letter)}})
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
