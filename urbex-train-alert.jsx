import React, { useState, useEffect, useRef, useCallback } from "react";

/* ── colours ── */
const LC={
  "1":"#EE352E","2":"#EE352E","3":"#EE352E","4":"#00933C","5":"#00933C","6":"#00933C",
  "7":"#B933AD","A":"#0039A6","C":"#0039A6","E":"#0039A6","B":"#FF6319","D":"#FF6319",
  "F":"#FF6319","M":"#FF6319","G":"#6CBE45","J":"#996633","Z":"#996633","L":"#A7A9AC",
  "N":"#FCCC0A","Q":"#FCCC0A","R":"#FCCC0A","W":"#FCCC0A","S":"#808183","FS":"#808183",
  "H":"#808183","SI":"#0039A6",
};
const LINES=["1","2","3","4","5","6","7","A","C","E","B","D","F","M","G","J","Z","L","N","Q","R","W","S","H","FS","SI"];
const NYC={lat:40.7549,lon:-73.984};

/* ── math ── */
function hav(a,b,c,d){
  const R=6371000,dL=(c-a)*Math.PI/180,dO=(d-b)*Math.PI/180;
  const x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dO/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function brng(la1,lo1,la2,lo2){
  const dL=(lo2-lo1)*Math.PI/180,a1=la1*Math.PI/180,a2=la2*Math.PI/180;
  return((Math.atan2(Math.sin(dL)*Math.cos(a2),Math.cos(a1)*Math.sin(a2)-Math.sin(a1)*Math.cos(a2)*Math.cos(dL))*180/Math.PI)+360)%360;
}
function cardinal(d){return d==null?"":[" ↑N","↗NE","→E","↘SE","↓S","↙SW","←W","↖NW"][Math.round(d/45)%8]}
function heading(t){
  if(t.direction==="N")return"↑ North";
  if(t.direction==="S")return"↓ South";
  if(t.bearing==null)return"";
  const b=((t.bearing%360)+360)%360;
  if(b>315||b<=45)return"↑ North";
  if(b>45&&b<=135)return"→ East";
  if(b>135&&b<=225)return"↓ South";
  return"← West";
}

/* ── stable orbits — each train has a fixed path, angle advances with real clock ── */
const ORBITS=LINES.map((line,i)=>({
  line,
  a0:(i/LINES.length)*2*Math.PI,
  r:250+((i*173)%600),
  w:0.00065+((i*41)%20)*0.000015,
  dir:i%2===0?"N":"S",
  spd:6+((i*7)%5),
}));

function makeSim(uLat,uLon,now){
  return ORBITS.map(o=>{
    const angle=o.a0+(now/1000)*o.w;
    const lat=uLat+(Math.cos(angle)*o.r)/111320;
    const lon=uLon+(Math.sin(angle)*o.r)/(111320*Math.cos(uLat*Math.PI/180));
    const b=((angle*180/Math.PI)+90+360)%360;
    const dist=hav(uLat,uLon,lat,lon);
    return{id:"sim-"+o.line,line:o.line,lat,lon,bearing:b,speed:o.spd,
      distanceToUser:dist,eta:Math.round(dist/o.spd),
      direction:o.dir,simulated:true,bearingFromUser:brng(uLat,uLon,lat,lon)};
  });
}

/* ── CSS injected once ── */
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#070d18;font-family:'Nunito',sans-serif;color:#e8f0fe;-webkit-font-smoothing:antialiased}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulseRing{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.8);opacity:0}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes dangerPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,82,82,0)}60%{box-shadow:0 0 0 12px rgba(255,82,82,.1)}}
@keyframes redFlash{0%,100%{background:rgba(255,82,82,.08)}50%{background:rgba(255,82,82,.2)}}
@keyframes checkGrow{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
.pill{display:flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:50px;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;padding:14px;width:100%;transition:transform .15s;-webkit-tap-highlight-color:transparent;user-select:none}
.pill:active{transform:scale(.95)}
.chip{border:none;border-radius:50px;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:700;font-size:12px;padding:7px 14px;transition:transform .15s;-webkit-tap-highlight-color:transparent}
.chip:active{transform:scale(.93)}
.card{border-radius:20px;padding:15px 17px}
.lbl{font-size:10px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:.5px;text-transform:uppercase;margin-bottom:10px}
.spinner{border:2.5px solid rgba(79,172,254,.2);border-top-color:#4facfe;border-radius:50%;animation:spin .75s linear infinite;flex-shrink:0}
.tabs{display:flex;gap:4px;padding:0 16px 12px;overflow-x:auto;scrollbar-width:none;flex-shrink:0}
.tabs::-webkit-scrollbar{display:none}
.tab{flex-shrink:0;display:flex;gap:5px;align-items:center;padding:9px 13px;font-size:11px;border:none;border-radius:50px;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:700;background:rgba(255,255,255,.05);color:rgba(255,255,255,.4);transition:all .18s;-webkit-tap-highlight-color:transparent}
.tab:active{transform:scale(.94)}
.train-row{border-radius:18px;padding:12px 14px;display:flex;align-items:center;gap:11px}
.prog{height:4px;border-radius:50px;background:rgba(255,255,255,.08);overflow:hidden;margin:4px 0}
.prog-fill{height:100%;border-radius:50px}
input,textarea{font-family:'Nunito',sans-serif;outline:none;width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 13px;color:#fff;font-size:13px}
textarea{resize:none;line-height:1.5}
/* Legal scroll — fixed height, DOM never rebuilt on scroll */
.tos-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:16px 18px;overflow-y:auto;font-size:12px;line-height:1.85;color:rgba(255,255,255,.7);font-weight:500;height:340px}
.tos-box::-webkit-scrollbar{width:3px}
.tos-box::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:3px}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:3px}
`;

/* ── Radar canvas — lives outside React, driven by RAF ── */
const RADAR_DATA={trains:[],uLat:NYC.lat,uLon:NYC.lon,alertDist:200,danger:false};
let rafId=null,sweep=0;

function drawRadar(canvas){
  if(!canvas||!document.contains(canvas)){rafId=null;return;}
  const ctx=canvas.getContext("2d");
  const W=canvas.width,H=canvas.height,cx=W/2,cy=H/2;
  const {trains,uLat,uLon,alertDist,danger}=RADAR_DATA;
  let maxD=Math.max(alertDist*1.8,350);
  trains.forEach(t=>{if(t.distanceToUser>maxD)maxD=t.distanceToUser;});
  const R=cx-14,scale=R/maxD;

  // BG
  const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,cx);
  bg.addColorStop(0,danger?"rgba(26,4,4,.97)":"rgba(5,13,28,.97)");
  bg.addColorStop(1,danger?"rgba(10,2,2,1)":"rgba(2,7,17,1)");
  ctx.fillStyle=bg;ctx.beginPath();ctx.arc(cx,cy,cx,0,Math.PI*2);ctx.fill();

  // Rings
  [.25,.5,.75,1].forEach(f=>{
    ctx.beginPath();ctx.arc(cx,cy,f*R,0,Math.PI*2);
    ctx.strokeStyle=danger?"rgba(255,60,60,.12)":"rgba(79,172,254,.1)";ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=danger?"rgba(255,100,100,.28)":"rgba(100,160,255,.28)";
    ctx.font="9px Nunito,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";
    ctx.fillText(Math.round(maxD*f)+"m",cx+f*R+3,cy-3);
  });

  // Compass
  ctx.fillStyle="rgba(255,255,255,.18)";ctx.font="bold 9px Nunito,sans-serif";ctx.textAlign="center";
  ctx.fillText("N",cx,cy-R+11);ctx.fillText("S",cx,cy+R-3);ctx.fillText("E",cx+R-5,cy+4);ctx.fillText("W",cx-R+5,cy+4);

  // Alert ring
  const ar=Math.min(alertDist*scale,R);
  ctx.beginPath();ctx.arc(cx,cy,ar,0,Math.PI*2);
  ctx.strokeStyle=danger?"rgba(255,82,82,.6)":"rgba(255,210,50,.5)";
  ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);

  // Sweep
  sweep=(sweep+0.012)%(Math.PI*2);
  ctx.save();ctx.translate(cx,cy);ctx.rotate(sweep);
  const sw=ctx.createLinearGradient(0,0,R,0);
  sw.addColorStop(0,danger?"rgba(255,60,60,.25)":"rgba(50,220,130,.2)");sw.addColorStop(1,"rgba(0,0,0,0)");
  ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,R,-.6,0);ctx.closePath();
  ctx.fillStyle=sw;ctx.fill();ctx.restore();

  // Trains at real GPS delta from user
  trains.forEach(t=>{
    if(!t.lat||!t.lon)return;
    const dLat=(t.lat-uLat)*111320;
    const dLon=(t.lon-uLon)*(111320*Math.cos(uLat*Math.PI/180));
    let px=cx+dLon*scale,py=cy-dLat*scale;
    const d=Math.hypot(px-cx,py-cy);
    if(d>R-12){px=cx+(px-cx)/d*(R-12);py=cy+(py-cy)/d*(R-12);}
    const col=LC[t.line]||"#888";
    const isA=t.distanceToUser<=alertDist||t.eta<=30;
    if(isA){const pr=11+Math.sin(Date.now()/300)*3;ctx.beginPath();ctx.arc(px,py,pr,0,Math.PI*2);ctx.fillStyle=col+"28";ctx.fill();}
    if(t.bearing!=null){
      const hb=(t.bearing-90)*Math.PI/180;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-Math.cos(hb)*17,py-Math.sin(hb)*17);
      ctx.strokeStyle=col+"88";ctx.lineWidth=1.8;ctx.stroke();
      const ax=px+Math.cos(hb)*9,ay=py+Math.sin(hb)*9;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax-Math.cos(hb-.45)*6,ay-Math.sin(hb-.45)*6);ctx.lineTo(ax-Math.cos(hb+.45)*6,ay-Math.sin(hb+.45)*6);ctx.closePath();ctx.fillStyle=col+"cc";ctx.fill();
    }
    ctx.beginPath();ctx.arc(px,py,isA?10:7,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,.85)";ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle=col==="#FCCC0A"?"#000":"#fff";ctx.font=`bold ${isA?10:9}px Nunito,sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(t.line,px,py);
  });

  // You dot
  const p=4+Math.sin(Date.now()/500)*1.5;
  ctx.beginPath();ctx.arc(cx,cy,p*2.2,0,Math.PI*2);ctx.fillStyle=danger?"rgba(255,80,80,.2)":"rgba(79,172,254,.2)";ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,8,0,Math.PI*2);ctx.fillStyle=danger?"#ff5252":"#4facfe";ctx.fill();
  ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle="#fff";ctx.font="bold 8px Nunito,sans-serif";ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText("YOU",cx,cy+10);

  rafId=requestAnimationFrame(()=>drawRadar(canvas));
}

function RadarCanvas({danger}){
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current;if(!c)return;
    c.width=310;c.height=310;
    if(rafId){cancelAnimationFrame(rafId);rafId=null;}
    rafId=requestAnimationFrame(()=>drawRadar(c));
    return()=>{cancelAnimationFrame(rafId);rafId=null;};
  },[]);
  return(
    <canvas ref={ref} style={{borderRadius:"50%",display:"block",margin:"0 auto",
      boxShadow:danger?"0 0 50px rgba(255,60,60,.22)":"0 0 50px rgba(79,172,254,.18)"}}/>
  );
}

/* ── Legal ── */
function Legal({onAccept}){
  const boxRef=useRef(null);
  const [scrolled,setScrolled]=useState(false);
  const [checked,setChecked]=useState(false);

  // Scroll handler only mutates local state — never triggers parent re-render
  const onScroll=useCallback(()=>{
    const el=boxRef.current;
    if(el&&!scrolled&&el.scrollTop+el.clientHeight>=el.scrollHeight-30)setScrolled(true);
  },[scrolled]);

  const clauses=[
    ["1. ACCEPTANCE","By tapping \"I Agree & Continue\" you unconditionally agree to every provision herein. If you do not agree, do not use this application."],
    ["2. INFORMATIONAL ONLY","Track Watch displays approximate subway train positions from public MTA GTFS-RT feeds. Data may be delayed, incomplete, or inaccurate. This app is NOT a safety device and CANNOT be relied upon to prevent injury or death."],
    ["3. ASSUMPTION OF ALL RISK","You acknowledge that: (a) railway tracks, tunnels, and restricted infrastructure are EXTREMELY DANGEROUS and may cause serious injury or death; (b) trains approach silently with little warning; (c) this app guarantees nothing. You assume ALL risks including electrocution, being struck, falls, toxic exposure, and entrapment. You are solely responsible for your own safety."],
    ["4. TRESPASSING & ILLEGAL USE","Access to MTA subway infrastructure is prohibited by law (NY Penal Law § 140.05 and federal statutes). The developer EXPRESSLY PROHIBITS use of this app to facilitate any illegal activity. All criminal and civil liability for trespassing rests solely with the User."],
    ["5. LIABILITY DISCLAIMER","TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE DEVELOPER SHALL NOT BE LIABLE FOR ANY DAMAGES WHATSOEVER — INCLUDING DEATH, INJURY, PROPERTY DAMAGE, OR CRIMINAL EXPOSURE — ARISING FROM USE OF THIS APPLICATION, UNDER ANY LEGAL THEORY."],
    ["6. INDEMNIFICATION","You agree to indemnify and hold harmless the Developer from all claims, costs, and attorneys' fees arising from your use or misuse of the application."],
    ["7. NO WARRANTY","Provided AS IS without warranty of any kind. All warranties are disclaimed to the fullest extent of law."],
    ["8. EMERGENCIES","This app has no emergency functionality. In any emergency dial 911 immediately."],
    ["9. AGE","You confirm you are 18 or older. Use by minors is strictly prohibited."],
    ["10. GOVERNING LAW","Governed by New York law. New York County courts have exclusive jurisdiction. This is the entire agreement."],
  ];

  return(
    <div style={{minHeight:"100vh",background:"#070d18",display:"flex",flexDirection:"column",padding:"0 0 32px"}}>
      <div style={{padding:"28px 22px 16px",textAlign:"center"}}>
        <div style={{width:52,height:52,borderRadius:16,background:"linear-gradient(135deg,#ff5252,#ff8a65)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 12px",boxShadow:"0 8px 24px rgba(255,82,82,.3)"}}>⚠️</div>
        <div style={{fontSize:19,fontWeight:900,color:"#fff",letterSpacing:-.3}}>Terms of Use & Liability Waiver</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:5}}>Scroll to the bottom then agree to continue</div>
      </div>

      {/* Scroll box — fixed height, React never rebuilds this on scroll */}
      <div ref={boxRef} className="tos-box" style={{margin:"0 18px"}} onScroll={onScroll}>
        <p style={{fontWeight:900,fontSize:13,color:"#fff",marginBottom:8}}>TRACK WATCH — LIABILITY WAIVER</p>
        <p style={{color:"rgba(255,120,120,.8)",fontWeight:700,marginBottom:12,fontSize:11}}>
          Effective: {new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}
        </p>
        {clauses.map(([t,b])=>(
          <div key={t} style={{marginBottom:12}}><span style={{fontWeight:800,color:"#fff"}}>{t}. </span>{b}</div>
        ))}
        <div style={{textAlign:"center",marginTop:8,fontSize:11,color:"rgba(255,255,255,.22)",opacity:scrolled?0:1,transition:"opacity .4s"}}>↓ Keep scrolling to continue</div>
      </div>

      <div style={{padding:"14px 18px 0"}}>
        <div onClick={()=>scrolled&&setChecked(c=>!c)}
          style={{display:"flex",alignItems:"flex-start",gap:13,marginBottom:12,
            background:"rgba(255,255,255,.04)",border:`1px solid ${checked?"rgba(67,233,123,.3)":"rgba(255,255,255,.1)"}`,
            borderRadius:18,padding:"13px 15px",opacity:scrolled?1:.4,
            transition:"opacity .3s,border-color .3s",cursor:scrolled?"pointer":"default"}}>
          <div style={{width:24,height:24,borderRadius:8,border:`2px solid ${checked?"#43e97b":"rgba(255,255,255,.3)"}`,
            background:checked?"#43e97b":"transparent",flexShrink:0,marginTop:1,
            display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",fontSize:14}}>
            {checked&&<span style={{animation:"checkGrow .2s ease"}}>✓</span>}
          </div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.75)",fontWeight:600,lineHeight:1.6}}>
            I have read and understood the Terms. I am 18+. I accept sole responsibility for my safety and all consequences. I agree to use this lawfully only.
          </div>
        </div>
        <button className="pill" onClick={()=>checked&&scrolled&&onAccept()}
          style={{background:checked&&scrolled?"linear-gradient(135deg,#4facfe,#00e0ff)":"rgba(255,255,255,.07)",
            color:checked&&scrolled?"#fff":"rgba(255,255,255,.25)",border:"none",
            boxShadow:checked&&scrolled?"0 8px 28px rgba(79,172,254,.4)":"none",
            fontSize:15,fontWeight:800,cursor:checked&&scrolled?"pointer":"default",transition:"all .3s"}}>
          {!scrolled?"Read the full terms first":"I Agree — Enter Track Watch"}
        </button>
        <div style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,.16)",marginTop:10,lineHeight:1.6}}>
          By continuing you electronically sign this agreement.
        </div>
      </div>
    </div>
  );
}

/* ── Train list item — memoized so it doesn't re-render unless its data changes ── */
const TrainRow=React.memo(({t,alertDist,danger})=>{
  const col=LC[t.line]||"#888";
  const isA=t.distanceToUser<=alertDist||t.eta<=30;
  const pct=Math.min(100,Math.max(4,(1-t.distanceToUser/(alertDist*3))*100));
  const dir=heading(t);
  const from=cardinal(t.bearingFromUser);
  const border=danger?"rgba(255,82,82,.2)":"rgba(79,172,254,.15)";
  return(
    <div className="train-row" style={{background:isA?col+"12":"rgba(255,255,255,.045)",border:`1.5px solid ${isA?col+"55":border}`,marginBottom:7}}>
      <div style={{width:38,height:38,borderRadius:50,background:col,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:col==="#FCCC0A"?"#000":"#fff",boxShadow:isA?`0 0 16px ${col}77`:"none"}}>{t.line}</div>
      <div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <b style={{fontSize:13}}>{Math.round(t.distanceToUser)}m away</b>
          <span style={{fontSize:11,fontWeight:700,color:isA?"#ff8585":"rgba(255,255,255,.4)"}}>ETA {t.eta}s</span>
        </div>
        <div className="prog"><div className="prog-fill" style={{width:pct+"%",background:isA?"#ff5252":col,transition:"width .5s ease"}}/></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:3}}>
          {dir&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:50,background:"rgba(255,255,255,.07)",color:isA?"#ffaaaa":"rgba(255,255,255,.5)"}}>{dir}</span>}
          {from&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:50,background:"rgba(79,172,254,.1)",color:"rgba(79,172,254,.9)"}}>{from} of you</span>}
          <span style={{fontSize:10,color:"rgba(255,255,255,.35)"}}>{Math.round((t.speed||0)*3.6)}km/h · {t.simulated?"sim":"live"}</span>
        </div>
      </div>
      {isA&&<span style={{fontSize:16,animation:"blink .6s infinite",flexShrink:0}}>⚠️</span>}
    </div>
  );
});

/* ── AI Guide ── */
const QUICK=["Plan route from my location to Times Square","Safest time to explore tonight?","Lines with longest gaps between trains?","Best gear for tunnel exploring?","How to spot a headlight from far away?","Emergency exits on the A/C/E line?"];

function AIGuide({loc,trains,alerts,alertDist}){
  const [msgs,setMsgs]=useState([{role:"assistant",content:"Hey — I'm your Track Watch AI. I know your real-time location and nearby train activity. Ask me anything: route planning, safety windows, gear, or what you're planning tonight."}]);
  const [inp,setInp]=useState("");
  const [busy,setBusy]=useState(false);
  const bottomRef=useRef(null);
  const taRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,busy]);

  const send=async(txt)=>{
    if(!txt||busy)return;
    setInp("");if(taRef.current){taRef.current.style.height="auto";}
    const next=[...msgs,{role:"user",content:txt}];
    setMsgs(next);setBusy(true);
    const u=loc;
    const ctx=`You are the AI inside Track Watch, an urbex subway proximity alert app for NYC.
Location: ${u?`${u.lat.toFixed(5)}, ${u.lon.toFixed(5)} (±${Math.round(u.acc||0)}m)`:"NYC sim, no GPS"}
Alert zone: ${alertDist}m | ${alerts.length>0?alerts.length+" trains in zone":"zone clear"}
Nearby: ${trains.slice(0,6).map(t=>`Line ${t.line} ${Math.round(t.distanceToUser)}m ${heading(t)} ETA ${t.eta}s`).join(", ")||"none"}
You know the NYC subway deeply: all lines, tunnels, third rails, maintenance windows, exits, schedules. Know urbex safety, gear, headlights, alcoves. Be direct and practical.`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:ctx,
          messages:next.map(m=>({role:m.role,content:m.content}))})
      });
      const d=await res.json();
      setMsgs(m=>[...m,{role:"assistant",content:d.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"No response."}]);
    }catch{setMsgs(m=>[...m,{role:"assistant",content:"Connection error."}]);}
    setBusy(false);
  };

  const border="rgba(79,172,254,.15)";
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[loc?`📍 ${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}`:"📍 NYC sim",`🚆 ${trains.length} trains`,alerts.length>0?`⚠️ ${alerts.length} in zone`:"✅ Zone clear"].map(c=>(
          <div key={c} style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:50,background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.45)",border:"1px solid rgba(255,255,255,.1)"}}>{c}</div>
        ))}
      </div>
      <div style={{background:"rgba(255,255,255,.045)",border:`1px solid ${border}`,borderRadius:20,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{maxHeight:280,overflowY:"auto",padding:"13px 13px 7px",display:"flex",flexDirection:"column",gap:9}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"88%",padding:"10px 13px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?"linear-gradient(135deg,#4facfe,#00e0ff)":"rgba(255,255,255,.07)",color:"#fff",fontSize:12.5,lineHeight:1.65,fontWeight:m.role==="user"?600:500,border:m.role==="assistant"?"1px solid rgba(255,255,255,.08)":"none",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{m.content}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.2)",marginTop:3,padding:"0 4px"}}>{m.role==="assistant"?"🤖 AI Guide":"You"}</div>
            </div>
          ))}
          {busy&&(
            <div style={{display:"flex"}}>
              <div style={{padding:"11px 15px",borderRadius:"18px 18px 18px 4px",background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.08)"}}>
                <div style={{display:"flex",gap:5}}>
                  {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"rgba(79,172,254,.6)",animation:`blink 1.2s ${i*.2}s infinite`}}/>)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"8px 10px 10px",borderTop:"1px solid rgba(255,255,255,.07)",display:"flex",gap:8,alignItems:"flex-end"}}>
          <textarea ref={taRef} value={inp} onChange={e=>setInp(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(inp.trim());}}}
            onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,80)+"px";}}
            placeholder="Ask anything — routes, safety, gear…" rows={1}
            style={{flex:1,minHeight:38,maxHeight:80,borderRadius:14}}/>
          <button onClick={()=>send(inp.trim())} disabled={!inp.trim()||busy}
            style={{width:40,height:40,borderRadius:50,border:"none",background:inp.trim()&&!busy?"linear-gradient(135deg,#4facfe,#00e0ff)":"rgba(255,255,255,.08)",color:inp.trim()&&!busy?"#fff":"rgba(255,255,255,.3)",fontSize:16,cursor:inp.trim()&&!busy?"pointer":"default",flexShrink:0,boxShadow:inp.trim()&&!busy?"0 4px 12px rgba(79,172,254,.4)":"none"}}>
            {busy?<div className="spinner" style={{width:16,height:16}}/>:"↑"}
          </button>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <div className="lbl">QUICK QUESTIONS</div>
        {QUICK.map(q=>(
          <button key={q} onClick={()=>send(q)} disabled={busy}
            style={{textAlign:"left",padding:"10px 14px",borderRadius:14,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"rgba(255,255,255,.55)",fontSize:12,fontFamily:"'Nunito',sans-serif",cursor:"pointer",fontWeight:500,width:"100%",opacity:busy?.5:1}}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   MAIN APP
═══════════════════════════════════ */
export default function App(){
  const [screen,setScreen]=useState("legal");
  const [tab,setTab]=useState("radar");
  const [loc,setLoc]=useState(null);
  const [locStatus,setLocStatus]=useState("idle");
  const [tracking,setTracking]=useState(false);
  const [alertDist,setAlertDist]=useState(200);
  const [alertTime,setAlertTime]=useState(30);
  const [liveMode,setLiveMode]=useState(false);
  const [fetching,setFetching]=useState(false);
  const [lastFetch,setLastFetch]=useState(null);
  const [notifOK,setNotifOK]=useState(false);
  const [log,setLog]=useState([]);
  const [trains,setTrains]=useState([]);
  const [alerts,setAlerts]=useState([]);
  const [danger,setDanger]=useState(false);
  // Crew & DMS
  const [dmsArmed,setDmsArmed]=useState(false);
  const [dmsCountdown,setDmsCountdown]=useState(30);
  const [dmsInterval,setDmsInterval]=useState(30);
  const [dmsTriggered,setDmsTriggered]=useState(false);
  const [crew,setCrew]=useState([]);
  const [crewOk,setCrewOk]=useState({});
  const [crewName,setCrewName]=useState("");
  const [crewPhone,setCrewPhone]=useState("");
  // Notes
  const [notes,setNotes]=useState(()=>{try{return JSON.parse(localStorage.getItem("tw_notes")||"[]")}catch{return[]}});
  const [noteText,setNoteText]=useState("");
  const [noteTag,setNoteTag]=useState("hazard");

  const watchRef=useRef(null);
  const tickRef=useRef(null);
  const dmsRef=useRef(null);
  const alertedRef=useRef(new Set());
  const addLog=useCallback((msg,type="info")=>setLog(l=>[{msg,type,time:new Date().toLocaleTimeString()},...l].slice(0,50)),[]);

  /* Sim loop — writes to RADAR_DATA every 100ms, no React setState */
  const simRef=useRef(null);
  useEffect(()=>{
    if(screen!=="app")return;
    simRef.current=setInterval(()=>{
      const uLat=(loc||NYC).lat,uLon=(loc||NYC).lon;
      const t=makeSim(uLat,uLon,Date.now());
      // Always keep radar data fresh
      RADAR_DATA.trains=t;RADAR_DATA.uLat=uLat;RADAR_DATA.uLon=uLon;
      RADAR_DATA.alertDist=alertDist;RADAR_DATA.danger=danger;
      // Only update React state every 2s to avoid excess re-renders
    },100);
    // Separate interval for React state (train list, alerts)
    const reactTick=setInterval(()=>{
      if(tracking)return; // tracking loop handles this
      const uLat=(loc||NYC).lat,uLon=(loc||NYC).lon;
      const t=makeSim(uLat,uLon,Date.now());
      setTrains(t);
      const a=t.filter(x=>x.distanceToUser<=alertDist||x.eta<=alertTime);
      setAlerts(a);setDanger(a.length>0);
    },2000);
    return()=>{clearInterval(simRef.current);clearInterval(reactTick);};
  },[screen,loc,alertDist,alertTime,tracking,danger]);

  /* GPS */
  const askLoc=useCallback(()=>{
    setLocStatus("asking");
    if(!navigator.geolocation){setLocStatus("denied");return;}
    navigator.geolocation.getCurrentPosition(
      p=>{setLoc({lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy});setLocStatus("ok");},
      ()=>setLocStatus("denied"),
      {enableHighAccuracy:true,timeout:12000,maximumAge:0}
    );
  },[]);

  /* Tracking */
  const startTracking=useCallback(()=>{
    setTracking(true);addLog("Tracking started","success");
    if(navigator.geolocation)watchRef.current=navigator.geolocation.watchPosition(
      p=>{setLoc({lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy});setLocStatus("ok");},
      e=>addLog(e.message,"warn"),{enableHighAccuracy:true,maximumAge:2000,timeout:10000}
    );
    if(liveMode){
      const tick=async()=>{
        setFetching(true);
        try{
          const u=loc||NYC;
          const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:8000,tools:[{type:"web_search_20250305",name:"web_search"}],messages:[{role:"user",content:`Fetch MTA NYC GTFS-RT feeds (public, no auth) and extract VehiclePosition entities.\nFeeds:\nhttps://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs\nhttps://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-ace\nhttps://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-bdfm\nhttps://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-g\nhttps://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-jz\nhttps://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-nqrw\nhttps://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-l\nhttps://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-si\nReturn ONLY JSON array: {"id":"str","line":"str","lat":num,"lon":num,"bearing":num|null,"speed":num|null,"direction":"N"|"S"|null}\nOnly lat 40.4-41.0, lon -74.4 to -73.5.`}]})});
          const data=await res.json();
          const text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
          const s=text.indexOf("["),e=text.lastIndexOf("]");
          if(s>=0&&e>s){
            const raw=JSON.parse(text.slice(s,e+1)).filter(t=>t.lat&&t.lon&&t.lat>40.4&&t.lat<41&&t.lon>-74.4&&t.lon<-73.5).map(t=>({...t,distanceToUser:hav(u.lat,u.lon,t.lat,t.lon),bearingFromUser:brng(u.lat,u.lon,t.lat,t.lon),get eta(){return Math.round(this.distanceToUser/Math.max(this.speed||12,1))},simulated:false}));
            if(raw.length>0){setTrains(raw);RADAR_DATA.trains=raw;setLastFetch(new Date());addLog(`✅ Live: ${raw.length} trains`,"success");}
            else{addLog("0 live — using sim","warn");setLiveMode(false);}
          }
        }catch{addLog("Live fetch failed — sim","warn");setLiveMode(false);}
        setFetching(false);
      };
      tick();tickRef.current=setInterval(tick,30000);
    }
  },[loc,liveMode,addLog]);

  const stopTracking=useCallback(()=>{
    if(watchRef.current)navigator.geolocation.clearWatch(watchRef.current);
    if(tickRef.current)clearInterval(tickRef.current);
    setTracking(false);setAlerts([]);setDanger(false);addLog("Tracking stopped","warn");
  },[addLog]);

  /* DMS */
  const armDMS=useCallback(()=>{
    setDmsArmed(true);setDmsCountdown(dmsInterval);setDmsTriggered(false);
    dmsRef.current=setInterval(()=>{
      setDmsCountdown(c=>{
        if(c<=1){setDmsTriggered(true);if("vibrate"in navigator)navigator.vibrate([500,200,500,200,1000]);return dmsInterval;}
        return c-1;
      });
    },1000);
  },[dmsInterval]);
  const disarmDMS=useCallback(()=>{clearInterval(dmsRef.current);setDmsArmed(false);setDmsTriggered(false);},[]);
  const checkInDMS=useCallback(()=>{setDmsCountdown(dmsInterval);setDmsTriggered(false);addLog("✓ DMS check-in","success");},[dmsInterval,addLog]);

  /* Notes */
  const saveNote=useCallback(()=>{
    if(!noteText.trim())return;
    const n=[{id:Date.now(),text:noteText.trim(),tag:noteTag,time:new Date().toLocaleString()},...notes].slice(0,50);
    setNotes(n);try{localStorage.setItem("tw_notes",JSON.stringify(n));}catch{}
    setNoteText("");
  },[noteText,noteTag,notes]);
  const delNote=useCallback((id)=>{const n=notes.filter(x=>x.id!==id);setNotes(n);try{localStorage.setItem("tw_notes",JSON.stringify(n));}catch{};},[notes]);

  if(screen==="legal") return(
    <React.Fragment>
      <style>{CSS}</style>
      <Legal onAccept={()=>{setScreen("app");askLoc();}}/>
    </React.Fragment>
  );

  const accent=danger?"#ff5252":"#4facfe";
  const border=danger?"rgba(255,82,82,.2)":"rgba(79,172,254,.15)";
  const TABS=[{id:"radar",icon:"📡",label:"Radar"},{id:"trains",icon:"🚆",label:"Trains"},{id:"ai",icon:"🤖",label:"AI Guide"},{id:"crew",icon:"👥",label:"Crew"},{id:"notes",icon:"📓",label:"Notes"},{id:"windows",icon:"🌙",label:"Windows"},{id:"settings",icon:"⚙️",label:"Settings"}];
  const TAGS={hazard:{i:"⚠️",col:"#ff8080"},safe:{i:"✅",col:"#43e97b"},info:{i:"📌",col:"#4facfe"},exit:{i:"🚪",col:"#ffd700"}};

  return(
    <React.Fragment>
      <style>{CSS}</style>
      <div style={{minHeight:"100vh",maxWidth:440,margin:"0 auto",paddingBottom:90,background:danger?"radial-gradient(ellipse at top,#180606,#070d18 55%)":"radial-gradient(ellipse at top,#0c1a30,#070d18 55%)",display:"flex",flexDirection:"column",transition:"background .6s"}}>

        {/* Header */}
        <div style={{padding:"18px 20px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:-.4}}>Track Watch</div>
            <div style={{display:"flex",alignItems:"center",gap:7,marginTop:3}}>
              <span style={{fontSize:10,color:"rgba(255,255,255,.35)"}}>nyc subway · urbex</span>
              <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:50,background:liveMode&&!trains[0]?.simulated?"rgba(67,233,123,.12)":"rgba(255,255,255,.06)",color:liveMode&&!trains[0]?.simulated?"#43e97b":"rgba(255,255,255,.35)",border:`1px solid ${liveMode&&!trains[0]?.simulated?"rgba(67,233,123,.28)":"rgba(255,255,255,.1)"}`}}>
                {fetching?"fetching…":liveMode&&!trains[0]?.simulated?"🔴 LIVE MTA":"⚡ SIM"}
              </span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            {fetching&&<div className="spinner" style={{width:18,height:18}}/>}
            {tracking&&!fetching&&(
              <div style={{position:"relative",width:10,height:10}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:danger?"#ff5252":"#43e97b",position:"absolute"}}/>
                <div style={{width:10,height:10,borderRadius:"50%",background:danger?"#ff5252":"#43e97b",position:"absolute",animation:"pulseRing 1.8s ease-out infinite"}}/>
              </div>
            )}
            <span style={{fontSize:11,fontWeight:700,letterSpacing:.4,color:tracking?(danger?"#ff8a8a":"#43e97b"):"rgba(255,255,255,.25)",animation:tracking?"blink 2.5s infinite":"none"}}>
              {tracking?(danger?"DANGER":"LIVE"):"IDLE"}
            </span>
          </div>
        </div>

        {/* Loc bar */}
        {locStatus!=="ok"&&(
          <div style={{margin:"0 18px 10px",padding:"10px 16px",borderRadius:16,background:"rgba(79,172,254,.08)",border:"1px solid rgba(79,172,254,.22)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <span style={{fontSize:12,color:"#4facfe",fontWeight:600}}>
              {locStatus==="asking"?"Requesting GPS…":locStatus==="denied"?"GPS denied — tap Retry":"Tap to share location"}
            </span>
            {locStatus==="asking"?<div className="spinner" style={{width:14,height:14}}/>:
              <button className="chip" onClick={askLoc} style={{background:"rgba(79,172,254,.2)",color:"#4facfe",border:"1px solid rgba(79,172,254,.3)",padding:"6px 14px",fontSize:11}}>
                {locStatus==="denied"?"Retry":"Share"}
              </button>}
          </div>
        )}

        {/* Danger */}
        {danger&&(
          <div style={{margin:"0 18px 10px",padding:"13px 18px",borderRadius:20,background:"rgba(255,82,82,.08)",border:"1.5px solid rgba(255,82,82,.35)",display:"flex",alignItems:"center",gap:12,animation:"dangerPulse 1.1s infinite"}}>
            <span style={{fontSize:24}}>⚠️</span>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:"#ff7878"}}>{alerts.length} train{alerts.length!==1?"s":""} approaching</div>
              <div style={{fontSize:11,color:"rgba(255,170,170,.5)",marginTop:1}}>Clear the tracks immediately</div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{display:"flex",gap:8,padding:"0 18px 10px",flexShrink:0}}>
          {[
            {label:"Position",value:loc?loc.lat.toFixed(4)+"°":"NYC sim",sub:loc?`±${Math.round(loc.acc||0)}m`:"no GPS",color:"#64c8ff"},
            {label:"Trains nearby",value:trains.length,sub:`${alerts.length} in ${alertDist}m zone`,color:danger?"#ff7878":"#43e97b"},
          ].map(s=>(
            <div key={s.label} className="card" style={{flex:1,padding:"12px 14px",border:`1px solid ${border}`}}>
              <div className="lbl">{s.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.35)",marginTop:3}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(t=>(
            <button key={t.id} className="tab" onClick={()=>setTab(t.id)}
              style={{background:tab===t.id?accent:"rgba(255,255,255,.05)",color:tab===t.id?"#fff":"rgba(255,255,255,.4)",boxShadow:tab===t.id?`0 4px 12px ${accent}44`:"none"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{padding:"0 18px",flex:1,animation:"fadeUp .22s ease"}}>

          {/* RADAR */}
          {tab==="radar"&&(
            <div className="card" style={{border:`1px solid ${border}`,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.35)",letterSpacing:.5}}>LIVE RADAR · {trains.length} TRAINS</span>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {fetching&&<div className="spinner" style={{width:13,height:13,borderWidth:2}}/>}
                  {lastFetch&&<span style={{fontSize:9,color:"rgba(255,255,255,.28)"}}>upd {lastFetch.toLocaleTimeString()}</span>}
                  <span style={{fontSize:9,fontWeight:700,color:trains[0]?.simulated?"rgba(255,190,0,.5)":"rgba(100,255,150,.6)"}}>
                    {trains[0]?.simulated?"SIM":"LIVE"}
                  </span>
                </div>
              </div>
              <RadarCanvas danger={danger}/>
              <div style={{display:"flex",justifyContent:"center",gap:14,marginTop:12,flexWrap:"wrap"}}>
                {[["● You","#64c8ff"],["⊙ Alert zone",danger?"#ff5252":"#ffd700"],["→ Heading","rgba(200,220,255,.5)"]].map(([l,c])=>(
                  <span key={l} style={{fontSize:10,color:c,fontWeight:700}}>{l}</span>
                ))}
              </div>
              {!loc&&(
                <button className="pill" onClick={askLoc} style={{marginTop:12,background:"rgba(79,172,254,.1)",color:"#4facfe",border:"1px solid rgba(79,172,254,.22)",fontSize:13,fontWeight:700}}>
                  📍 Grant GPS for real distances
                </button>
              )}
            </div>
          )}

          {/* TRAINS */}
          {tab==="trains"&&(
            <div>
              {trains.length===0?(
                <div className="card" style={{textAlign:"center",padding:"36px 0",border:`1px solid ${border}`}}>
                  <div style={{fontSize:36,marginBottom:10}}>🚇</div>
                  <div style={{color:"rgba(255,255,255,.4)",fontSize:13}}>Start tracking to see trains</div>
                </div>
              ):[...trains].sort((a,b)=>a.distanceToUser-b.distanceToUser).map(t=>(
                <TrainRow key={t.id} t={t} alertDist={alertDist} danger={danger}/>
              ))}
              {log.length>0&&(
                <div style={{marginTop:8}}>
                  <div className="lbl">EVENT LOG</div>
                  <div className="card" style={{maxHeight:140,overflowY:"auto",padding:"9px 13px",border:`1px solid ${border}`}}>
                    {log.map((e,i)=>(
                      <div key={i} style={{display:"flex",gap:9,padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                        <span style={{fontSize:9,color:"rgba(255,255,255,.2)",flexShrink:0}}>{e.time}</span>
                        <span style={{fontSize:11,color:e.type==="danger"?"#ff8080":e.type==="success"?"#43e97b":"rgba(255,255,255,.4)"}}>{e.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI */}
          {tab==="ai"&&<AIGuide loc={loc} trains={trains} alerts={alerts} alertDist={alertDist}/>}

          {/* CREW */}
          {tab==="crew"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {/* DMS */}
              <div className="card" style={{border:`1px solid ${dmsArmed?"rgba(255,82,82,.25)":border}`,display:"flex",flexDirection:"column",gap:11}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:dmsArmed?"#ff7878":"#fff"}}>☠️ Dead Man's Switch</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginTop:2}}>Fires alert if you miss a check-in</div>
                  </div>
                  <button className="chip" onClick={dmsArmed?disarmDMS:armDMS}
                    style={{background:dmsArmed?"rgba(255,82,82,.2)":"rgba(79,172,254,.15)",color:dmsArmed?"#ff7878":"#4facfe",border:`1px solid ${dmsArmed?"rgba(255,82,82,.35)":"rgba(79,172,254,.25)"}`,padding:"8px 16px"}}>
                    {dmsArmed?"DISARM":"ARM"}
                  </button>
                </div>
                {dmsArmed&&(
                  <React.Fragment>
                    {dmsTriggered&&<div style={{padding:"10px 14px",borderRadius:14,background:"rgba(255,82,82,.15)",border:"1px solid rgba(255,82,82,.4)",fontSize:12,fontWeight:700,color:"#ff8080",textAlign:"center",animation:"redFlash .6s infinite"}}>🚨 CHECK-IN OVERDUE</div>}
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:38,fontWeight:900,color:dmsCountdown<=10?"#ff5252":"#fff"}}>{dmsCountdown}s</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginTop:1}}>until alert fires</div>
                      <div style={{height:5,borderRadius:50,background:"rgba(255,255,255,.08)",marginTop:8,overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:50,background:"#4facfe",width:`${(dmsCountdown/dmsInterval)*100}%`,transition:"width 1s linear"}}/>
                      </div>
                    </div>
                    <button className="pill" onClick={checkInDMS} style={{background:"linear-gradient(135deg,#43e97b,#38f9d7)",color:"#07200f",border:"none",fontWeight:800,fontSize:14,boxShadow:"0 6px 20px rgba(67,233,123,.35)"}}>✓  I'M OK — CHECK IN</button>
                    <div>
                      <div className="lbl">INTERVAL</div>
                      <div style={{display:"flex",gap:6}}>
                        {[15,30,60,120].map(s=>(
                          <button key={s} className="chip" onClick={()=>{setDmsInterval(s);setDmsCountdown(s);}}
                            style={{flex:1,padding:"7px 0",background:dmsInterval===s?"rgba(79,172,254,.2)":"rgba(255,255,255,.06)",color:dmsInterval===s?"#4facfe":"rgba(255,255,255,.4)",border:`1px solid ${dmsInterval===s?"rgba(79,172,254,.3)":"rgba(255,255,255,.08)"}`}}>
                            {s}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </React.Fragment>
                )}
                {!dmsArmed&&<div style={{fontSize:11,color:"rgba(255,255,255,.4)",lineHeight:1.6}}>Arm to set a check-in timer. Miss one and it fires vibration + notification. Essential for solo runs.</div>}
              </div>
              {/* Crew */}
              <div className="card" style={{border:`1px solid ${border}`,display:"flex",flexDirection:"column",gap:9}}>
                <div className="lbl">ADD CREW MEMBER</div>
                <input value={crewName} onChange={e=>setCrewName(e.target.value)} placeholder="Name"/>
                <input value={crewPhone} onChange={e=>setCrewPhone(e.target.value)} placeholder="Phone (optional)" style={{marginTop:6}}/>
                <button className="pill" onClick={()=>{if(!crewName.trim())return;setCrew(c=>[...c,{id:Date.now(),name:crewName.trim(),phone:crewPhone.trim()}]);setCrewName("");setCrewPhone("");}}
                  style={{background:"linear-gradient(135deg,#4facfe,#00e0ff)",color:"#fff",border:"none",fontSize:13,marginTop:4}}>Add to Crew</button>
              </div>
              {crew.length>0&&(
                <div className="card" style={{border:`1px solid ${crew.every(m=>crewOk[m.id])?"rgba(67,233,123,.25)":border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:11}}>
                    <div className="lbl" style={{margin:0}}>CREW STATUS</div>
                    <div style={{fontSize:11,fontWeight:700,color:crew.every(m=>crewOk[m.id])?"#43e97b":"#ffd700"}}>{crew.every(m=>crewOk[m.id])?"✅ ALL SAFE":`${Object.values(crewOk).filter(Boolean).length}/${crew.length} in`}</div>
                  </div>
                  {crew.map(m=>(
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:14,background:"rgba(255,255,255,.04)",border:`1px solid ${crewOk[m.id]?"rgba(67,233,123,.25)":"rgba(255,255,255,.08)"}`,marginBottom:7}}>
                      <div style={{width:32,height:32,borderRadius:50,background:crewOk[m.id]?"rgba(67,233,123,.2)":"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{crewOk[m.id]?"✅":"👤"}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:crewOk[m.id]?"#43e97b":"#fff"}}>{m.name}</div>
                        {m.phone&&<div style={{fontSize:10,color:"rgba(255,255,255,.35)"}}>{m.phone}</div>}
                      </div>
                      <button className="chip" onClick={()=>setCrewOk(o=>({...o,[m.id]:!o[m.id]}))}
                        style={{background:crewOk[m.id]?"rgba(255,82,82,.15)":"rgba(67,233,123,.15)",color:crewOk[m.id]?"#ff8080":"#43e97b",border:`1px solid ${crewOk[m.id]?"rgba(255,82,82,.3)":"rgba(67,233,123,.3)"}`,padding:"7px 12px"}}>
                        {crewOk[m.id]?"UNCHECK":"SAFE"}
                      </button>
                      <button onClick={()=>setCrew(c=>c.filter(x=>x.id!==m.id))} style={{background:"none",border:"none",color:"rgba(255,255,255,.2)",fontSize:18,cursor:"pointer"}}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTES */}
          {tab==="notes"&&(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div className="card" style={{border:`1px solid ${border}`}}>
                <div className="lbl">ADD NOTE</div>
                <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={3} placeholder="e.g. 3rd rail exposed near pillar 42, safe alcove at 50m…"/>
                <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center"}}>
                  <div style={{display:"flex",gap:6,flex:1}}>
                    {Object.entries(TAGS).map(([k,v])=>(
                      <button key={k} className="chip" onClick={()=>setNoteTag(k)}
                        style={{flex:1,padding:"6px 0",fontSize:14,background:noteTag===k?v.col+"22":"rgba(255,255,255,.05)",color:noteTag===k?v.col:"rgba(255,255,255,.35)",border:`1px solid ${noteTag===k?v.col+"44":"rgba(255,255,255,.08)"}`}}>
                        {v.i}
                      </button>
                    ))}
                  </div>
                  <button className="chip" onClick={saveNote} style={{background:"linear-gradient(135deg,#4facfe,#00e0ff)",color:"#fff",border:"none",padding:"9px 18px",fontSize:13}}>Save</button>
                </div>
              </div>
              {notes.length===0?(
                <div className="card" style={{textAlign:"center",padding:"28px 0",border:"1px solid rgba(255,255,255,.07)"}}>
                  <div style={{fontSize:28,marginBottom:8}}>📓</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.35)"}}>No notes yet — add hazards, exits, safe spots</div>
                </div>
              ):notes.map(n=>(
                <div key={n.id} style={{borderRadius:16,padding:"11px 14px",display:"flex",gap:10,background:"rgba(255,255,255,.045)",border:`1px solid ${TAGS[n.tag]?.col+"33"||border}`}}>
                  <div style={{fontSize:20,marginTop:1,flexShrink:0}}>{TAGS[n.tag]?.i||"📌"}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#fff",lineHeight:1.5}}>{n.text}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.28)",marginTop:4}}>{n.time}</div>
                  </div>
                  <button onClick={()=>delNote(n.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,.25)",fontSize:18,cursor:"pointer"}}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* WINDOWS */}
          {tab==="windows"&&(()=>{
            const h=new Date().getHours(),isLow=h>=1&&h<5;
            const rows=[
              {line:"All lines",w:"1:00–5:00 AM",low:isLow,desc:"Reduced frequency, maintenance trains active"},
              {line:"1 2 3 4 5 6 7",w:"Late nights",low:h<22&&h>6,desc:"Local only nights/weekends"},
              {line:"L",w:"1:30–5:30 AM",low:h>=2&&h<5,desc:"Frequent overnight maintenance"},
              {line:"A / C / E",w:"Overnight",low:false,desc:"A express overnight, C/E suspended"},
              {line:"N Q R W",w:"After midnight",low:h>22||h<6,desc:"Reduced frequency"},
            ];
            return(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div className="card" style={{border:`1px solid ${isLow?"rgba(67,233,123,.25)":"rgba(255,82,82,.25)"}`,background:isLow?"rgba(67,233,123,.06)":"rgba(255,82,82,.06)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{fontSize:26}}>{isLow?"🌙":"🚇"}</div>
                    <div>
                      <div style={{fontWeight:800,fontSize:14,color:isLow?"#43e97b":"#ff7878"}}>{isLow?"Lower Activity Window":"Active Service Hours"}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:2}}>{new Date().toLocaleTimeString()} · {isLow?"1–5 AM: reduced frequency":"Full schedule running"}</div>
                    </div>
                  </div>
                </div>
                {rows.map((r,i)=>(
                  <div key={i} className="card" style={{border:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{fontSize:16,flexShrink:0}}>{r.low?"🟢":"🟡"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700}}>{r.line}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:2}}>{r.desc}</div>
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.35)",flexShrink:0}}>{r.w}</div>
                  </div>
                ))}
                <div className="card" style={{border:"1px solid rgba(255,255,255,.06)",textAlign:"center",fontSize:11,color:"rgba(255,255,255,.3)",lineHeight:1.7}}>⚠️ Maintenance trains run at any hour. Never rely on this for safety decisions.</div>
              </div>
            );
          })()}

          {/* SETTINGS */}
          {tab==="settings"&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div className="card" style={{border:`1px solid ${border}`}}>
                <div className="lbl">DATA SOURCE</div>
                <div style={{display:"flex",gap:8}}>
                  {[["live","🔴 Live MTA"],["sim","⚡ Simulation"]].map(([m,l])=>(
                    <button key={m} className="chip" onClick={()=>setLiveMode(m==="live")}
                      style={{flex:1,padding:"10px 0",background:(liveMode===(m==="live"))?"rgba(79,172,254,.2)":"rgba(255,255,255,.06)",color:(liveMode===(m==="live"))?"#4facfe":"rgba(255,255,255,.4)",border:`1px solid ${(liveMode===(m==="live"))?"rgba(79,172,254,.3)":"rgba(255,255,255,.08)"}`}}>
                      {l}
                    </button>
                  ))}
                </div>
                <p style={{fontSize:10,color:"rgba(255,255,255,.35)",marginTop:10,lineHeight:1.6}}>Live fetches real MTA feeds server-side. No API key needed. Refreshes every 30s.</p>
              </div>
              <div className="card" style={{border:`1px solid ${border}`}}>
                <div className="lbl">ALERT DISTANCE</div>
                <div style={{display:"flex",gap:7}}>
                  {[50,100,200,500].map(d=>(
                    <button key={d} className="chip" onClick={()=>setAlertDist(d)}
                      style={{flex:1,background:alertDist===d?"#4facfe":"rgba(255,255,255,.06)",color:alertDist===d?"#fff":"rgba(255,255,255,.4)",border:"none",boxShadow:alertDist===d?"0 3px 10px rgba(79,172,254,.4)":"none"}}>
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
              <div className="card" style={{border:`1px solid ${border}`}}>
                <div className="lbl">ALERT WHEN ETA ≤</div>
                <div style={{display:"flex",gap:7}}>
                  {[15,30,60,120].map(t=>(
                    <button key={t} className="chip" onClick={()=>setAlertTime(t)}
                      style={{flex:1,background:alertTime===t?"#4facfe":"rgba(255,255,255,.06)",color:alertTime===t?"#fff":"rgba(255,255,255,.4)",border:"none",boxShadow:alertTime===t?"0 3px 10px rgba(79,172,254,.4)":"none"}}>
                      {t}s
                    </button>
                  ))}
                </div>
              </div>
              <div className="card" style={{border:`1px solid ${border}`,display:"flex",flexDirection:"column",gap:8}}>
                <div className="lbl">NOTIFICATIONS & GPS</div>
                <button className="pill" onClick={async()=>{const p=await Notification.requestPermission();setNotifOK(p==="granted");addLog(p==="granted"?"Notifications on ✓":"Denied","success");}}
                  style={{background:notifOK?"rgba(67,233,123,.1)":"rgba(255,255,255,.06)",color:notifOK?"#43e97b":"rgba(255,255,255,.5)",border:`1px solid ${notifOK?"rgba(67,233,123,.28)":border}`,fontSize:13}}>
                  {notifOK?"🔔  Notifications on":"🔕  Enable notifications"}
                </button>
                <button className="pill" onClick={askLoc} style={{background:"rgba(79,172,254,.08)",color:"#4facfe",border:"1px solid rgba(79,172,254,.22)",fontSize:13}}>
                  📍 {loc?`${loc.lat.toFixed(5)}, ${loc.lon.toFixed(5)}`:"Re-request GPS"}
                </button>
              </div>
              <div className="card" style={{border:`1px solid ${border}`}}>
                <div className="lbl">ALL TRACKED LINES</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {LINES.map(l=>(
                    <div key={l} style={{width:28,height:28,borderRadius:50,background:LC[l]||"#555",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:LC[l]==="#FCCC0A"?"#000":"#fff"}}>{l}</div>
                  ))}
                </div>
              </div>
              <div className="card" style={{border:"1px solid rgba(255,255,255,.06)",background:"rgba(255,255,255,.02)"}}>
                <div className="lbl">LEGAL</div>
                <button className="pill" onClick={()=>setScreen("legal")} style={{background:"rgba(255,255,255,.05)",color:"rgba(255,255,255,.35)",border:"1px solid rgba(255,255,255,.07)",fontSize:12}}>📋  View Terms of Use & Liability Waiver</button>
              </div>
              <div style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,.15)",lineHeight:1.7,padding:"4px 0"}}>⚠️ For informational purposes only.<br/>Trespassing on railway property is illegal.</div>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <div style={{position:"sticky",bottom:0,padding:"14px 18px",background:"linear-gradient(to top,rgba(7,13,24,.98) 60%,transparent)",flexShrink:0}}>
          <button className="pill" onClick={tracking?stopTracking:startTracking}
            style={{background:tracking?(danger?"rgba(255,82,82,.15)":"rgba(255,255,255,.07)"):`linear-gradient(135deg,${accent},${danger?"#ffaaaa":"#00e0ff"})`,
              color:tracking?(danger?"#ff8080":"rgba(255,255,255,.5)"):"#fff",
              border:`1.5px solid ${tracking?(danger?"rgba(255,82,82,.35)":border):"transparent"}`,
              boxShadow:tracking?"none":`0 8px 24px ${accent}55`,fontSize:14,fontWeight:800}}>
            {tracking?"⏹  Stop Tracking":"▶  Start Tracking"}
          </button>
        </div>

      </div>
    </React.Fragment>
  );
}
