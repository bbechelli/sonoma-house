import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const FAMILIES = [
  { id: "mikeval",        name: "Mike & Val",       symbol: "◆", mark: "#8B4040", bg: "#F5EDE0" },
  { id: "gregcece",       name: "Greg & Cece",      symbol: "●", mark: "#4A6741", bg: "#EBF0E8" },
  { id: "mattmariel",     name: "Matt & Mariel",    symbol: "▲", mark: "#4A5C7A", bg: "#E8EDF5" },
  { id: "briansteph",     name: "Brian & Steph",    symbol: "■", mark: "#7A5C2E", bg: "#F5F0E8" },
  { id: "kelseytravis",   name: "Kelsey & Travis",  symbol: "◇", mark: "#6B4A6B", bg: "#F0EBF5" },
  { id: "caitlinmichael", name: "Caitlin & Michael",symbol: "○", mark: "#2E6B5E", bg: "#E8F5F2" },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["S","M","T","W","T","F","S"];

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y, m) { return new Date(y, m, 1).getDay(); }
function toKey(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function fmtKey(key) {
  const [y,m,d] = key.split("-");
  return `${MONTHS[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
}
function fmtNow() {
  return new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}
function getF(id) { return FAMILIES.find(f => f.id === id); }

const VineyardSVG = ({ color }) => (
  <svg viewBox="0 0 320 80" style={{width:"100%",maxWidth:320,display:"block",margin:"0 auto"}} fill="none">
    <path d="M0,55 C20,40 45,50 70,44 C95,38 115,48 140,42 C165,36 185,46 210,40 C235,34 260,44 285,38 L320,36 L320,80 L0,80Z" stroke={color} strokeWidth="0.6" fill={color+"0A"}/>
    <path d="M0,65 C30,55 70,62 110,58 C150,54 190,62 230,58 C270,54 295,60 320,56 L320,80 L0,80Z" stroke={color} strokeWidth="0.4" fill={color+"06"}/>
    {/* farmhouse */}
    <rect x="12" y="42" width="14" height="11" stroke={color} strokeWidth="0.7" fill={color+"08"}/>
    <path d="M10,42 L19,34 L28,42Z" stroke={color} strokeWidth="0.7" fill={color+"10"}/>
    <rect x="15" y="47" width="3" height="6" stroke={color} strokeWidth="0.5" fill={color+"12"}/>
    {/* cypress trees */}
    {[38,43,48].map((x,i)=>(
      <g key={i}>
        <line x1={x} y1="55" x2={x} y2="36" stroke={color} strokeWidth="0.7"/>
        <ellipse cx={x} cy="44" rx="3" ry="8" stroke={color} strokeWidth="0.5" fill={color+"0D"}/>
      </g>
    ))}
    {/* vine rows */}
    {[0,1,2,3].map(row=>{
      const y1=73-row*10; const xs=62+row*6; const xe=270-row*6;
      const posts=6-row; const sp=(xe-xs)/Math.max(posts-1,1); const op=1-row*0.18;
      return (
        <g key={row} opacity={op}>
          <line x1={xs} y1={y1-8} x2={xe} y2={y1-8} stroke={color} strokeWidth={Math.max(0.3,0.55-row*0.05)}/>
          <line x1={xs} y1={y1-4} x2={xe} y2={y1-4} stroke={color} strokeWidth={Math.max(0.2,0.35-row*0.03)}/>
          {Array.from({length:posts}).map((_,i)=>(
            <line key={i} x1={xs+i*sp} y1={y1} x2={xs+i*sp} y2={y1-11} stroke={color} strokeWidth="0.6" strokeLinecap="round"/>
          ))}
          {Array.from({length:Math.max(0,posts-1)}).map((_,i)=>(
            <ellipse key={i} cx={xs+i*sp+sp/2} cy={y1-9} rx={sp*0.45} ry={Math.max(1.2,3.5-row*0.3)} stroke={color} strokeWidth="0.4" fill={color+"09"}/>
          ))}
        </g>
      );
    })}
    {/* grape clusters front row */}
    {[75,105,135,165,195,225,255].map((x,i)=>(
      <g key={i} opacity="0.55">
        <line x1={x} y1={65} x2={x} y2={68} stroke={color} strokeWidth="0.4"/>
        <circle cx={x} cy={70} r="1" fill={color}/>
        <circle cx={x-1.5} cy={72} r="0.9" fill={color}/>
        <circle cx={x+1.5} cy={72} r="0.9" fill={color}/>
        <circle cx={x} cy={74} r="0.8" fill={color}/>
      </g>
    ))}
    {/* sun */}
    <circle cx="298" cy="16" r="6" stroke={color} strokeWidth="0.6" fill="none" opacity="0.4"/>
    {[0,60,120,180,240,300].map((deg,i)=>{
      const r=deg*Math.PI/180;
      return <line key={i} x1={298+Math.cos(r)*8} y1={16+Math.sin(r)*8} x2={298+Math.cos(r)*11} y2={16+Math.sin(r)*11} stroke={color} strokeWidth="0.4" opacity="0.3"/>;
    })}
  </svg>
);

export default function App() {
  const today = new Date();
  const [tab, setTab] = useState("calendar");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [bookings, setBookings] = useState({});
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [selFam, setSelFam] = useState(FAMILIES[0].id);
  const [toast, setToast] = useState(null);
  const [histFilter, setHistFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const BG="#F2EDE4", INK="#1C1C1A", LIGHT="#7A7468", RULE="#C8C0B0", CARD="#EDE8DF";
  const cf = getF(selFam);

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null), 2500); }

  const loadAll = useCallback(async () => {
    try {
      const [b, h, n] = await Promise.all([
        supabase.from("bookings").select("*"),
        supabase.from("history").select("*").order("created_at",{ascending:false}).limit(200),
        supabase.from("notes").select("*").order("created_at",{ascending:false}),
      ]);
      if (b.data) {
        const map = {};
        b.data.forEach(r => { map[r.date] = r.family_id; });
        setBookings(map);
      }
      if (h.data) setHistory(h.data.map(r=>({type:r.type,family:r.family_id,dates:r.dates,timestamp:r.timestamp})));
      if (n.data) setNotes(n.data.map(r=>({id:r.id,text:r.text,author:r.author,timestamp:r.timestamp,resolved:r.resolved})));
    } catch(e) { showToast("Error loading data"); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const ch = supabase.channel("changes")
      .on("postgres_changes",{event:"*",schema:"public",table:"bookings"},loadAll)
      .on("postgres_changes",{event:"*",schema:"public",table:"history"},loadAll)
      .on("postgres_changes",{event:"*",schema:"public",table:"notes"},loadAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadAll]);

  async function bookDay(day) {
    const key = toKey(year, month, day);
    const existing = bookings[key];
    if (existing === selFam) {
      // Remove own booking
      setBookings(b => { const n={...b}; delete n[key]; return n; });
      setSaving(true);
      await supabase.from("bookings").delete().eq("date", key);
      await supabase.from("history").insert({type:"removed",family_id:selFam,dates:[key],timestamp:fmtNow()});
      setSaving(false);
      showToast("Reservation removed");
    } else if (existing) {
      showToast(`${getF(existing)?.name} has that date`);
    } else {
      // Book it
      setBookings(b => ({...b,[key]:selFam}));
      setSaving(true);
      const {error} = await supabase.from("bookings").upsert({date:key,family_id:selFam});
      if (error) {
        showToast("Error saving — try again");
        setBookings(b => { const n={...b}; delete n[key]; return n; });
      } else {
        await supabase.from("history").insert({type:"booked",family_id:selFam,dates:[key],timestamp:fmtNow()});
        showToast("Reserved!");
      }
      setSaving(false);
    }
  }

  async function addNote() {
    const t = newNote.trim(); if(!t) return;
    setSaving(true);
    const {data} = await supabase.from("notes").insert({text:t,author:selFam,timestamp:fmtNow(),resolved:false}).select().single();
    if(data) setNotes(n=>[{id:data.id,text:data.text,author:data.author,timestamp:data.timestamp,resolved:false},...n]);
    setNewNote(""); showToast("Note added"); setSaving(false);
  }

  async function toggleNote(id, resolved) {
    await supabase.from("notes").update({resolved:!resolved}).eq("id",id);
    setNotes(n=>n.map(x=>x.id===id?{...x,resolved:!resolved}:x));
  }

  async function deleteNote(id) {
    await supabase.from("notes").delete().eq("id",id);
    setNotes(n=>n.filter(x=>x.id!==id));
  }

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  function famNightsThisMonth(id) {
    return Object.entries(bookings).filter(([k,v])=>{
      const [y2,m2]=k.split("-").map(Number);
      return v===id && y2===year && m2-1===month;
    }).length;
  }
  function famNightsTotal(id) { return Object.values(bookings).filter(v=>v===id).length; }
  function fmtDates(dates) {
    if(!dates?.length) return "";
    if(dates.length===1) return fmtKey(dates[0]);
    const s=[...dates].sort();
    return `${fmtKey(s[0])} – ${fmtKey(s[s.length-1])} (${dates.length}n)`;
  }

  const cells=[];
  for(let i=0;i<firstDay(year,month);i++) cells.push(null);
  for(let d=1;d<=daysInMonth(year,month);d++) cells.push(d);
  const isToday=(d)=>d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
  const openNotes=notes.filter(n=>!n.resolved);
  const resolvedNotes=notes.filter(n=>n.resolved);
  const filtHist=histFilter==="all"?history:history.filter(e=>e.family===histFilter);

  const sBtn = (active, color) => ({
    background: active ? color : "transparent",
    color: active ? BG : LIGHT,
    border: `1px solid ${active ? color : RULE}`,
    borderRadius: 0, padding: "4px 10px", cursor: "pointer",
    fontFamily: "'Josefin Sans',sans-serif", fontSize: 9,
    letterSpacing: "1.5px", textTransform: "uppercase", transition: "all 0.15s",
  });

  if (loading) return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",fontFamily:"'EB Garamond',serif"}}>
        <div style={{fontStyle:"italic",fontSize:24,color:LIGHT}}>Sonoma House</div>
        <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:"3px",textTransform:"uppercase",color:RULE,marginTop:8}}>Loading…</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'EB Garamond','Georgia',serif",color:INK,margin:0,padding:0,maxWidth:600,marginLeft:"auto",marginRight:"auto"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Josefin+Sans:wght@300;400&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        .day-cell{transition:background 0.1s;cursor:pointer;}
        .day-cell:active{opacity:0.7;}
        @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(8px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        input:focus{outline:none;}
        input::placeholder{color:#A8A098;}
      `}</style>

      {/* HEADER */}
      <div style={{borderBottom:`1px solid ${RULE}`,padding:"20px 16px 0",textAlign:"center"}}>
        <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:"4px",textTransform:"uppercase",color:LIGHT,marginBottom:8}}>Sonoma Valley, California</div>
        <div style={{fontFamily:"'EB Garamond',serif",fontStyle:"italic",fontSize:36,color:INK,lineHeight:1,margin:0}}>Sonoma House</div>
        <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:"4px",textTransform:"uppercase",color:LIGHT,marginTop:4,marginBottom:10}}>
          A Shared Estate{saving?" · Saving…":""}
        </div>
        <div style={{padding:"0 8px 10px"}}>
          <VineyardSVG color={cf.mark}/>
        </div>

        {/* Family pills */}
        <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",padding:"0 8px 14px"}}>
          {FAMILIES.map(f=>(
            <button key={f.id} onClick={()=>setSelFam(f.id)} style={{
              background: selFam===f.id ? f.mark : "transparent",
              color: selFam===f.id ? BG : LIGHT,
              border:`1px solid ${selFam===f.id ? f.mark : RULE}`,
              borderRadius:0,padding:"5px 10px",cursor:"pointer",
              fontFamily:"'Josefin Sans',sans-serif",fontSize:9,
              letterSpacing:"1.5px",textTransform:"uppercase",
              display:"flex",alignItems:"center",gap:4,transition:"all 0.15s",
            }}>
              <span style={{fontSize:8}}>{f.symbol}</span>{f.name}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",justifyContent:"center",gap:24,borderTop:`1px solid ${RULE}`,paddingTop:12,paddingBottom:0,marginBottom:-1}}>
          {[
            {id:"calendar",label:"Calendar"},
            {id:"notes",label:`Notes${openNotes.length>0?` (${openNotes.length})`:""}`},
            {id:"history",label:"History"},
          ].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:"none",border:"none",cursor:"pointer",
              fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:"2.5px",
              textTransform:"uppercase",color:tab===t.id?cf.mark:LIGHT,
              borderBottom:`1.5px solid ${tab===t.id?cf.mark:"transparent"}`,
              paddingBottom:10,transition:"all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"16px 12px 48px"}}>

        {/* ── CALENDAR ── */}
        {tab==="calendar" && (
          <>
            {openNotes.length>0&&(
              <div onClick={()=>setTab("notes")} style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"8px 12px",border:`1px solid ${RULE}`,background:CARD,cursor:"pointer"}}>
                <span style={{color:LIGHT,fontSize:12}}>✦</span>
                <span style={{fontFamily:"'EB Garamond',serif",fontStyle:"italic",fontSize:13,color:LIGHT,flex:1}}>{openNotes[0].text}{openNotes.length>1?` +${openNotes.length-1} more`:""}</span>
                <span style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:8,color:LIGHT,letterSpacing:"1px"}}>VIEW →</span>
              </div>
            )}

            {/* Month nav */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <button onClick={prevMonth} style={{background:"none",border:`1px solid ${RULE}`,color:LIGHT,width:34,height:34,cursor:"pointer",fontSize:16,fontFamily:"serif",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'EB Garamond',serif",fontStyle:"italic",fontSize:22,color:INK,lineHeight:1}}>{MONTHS[month]}</div>
                <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:"3px",color:LIGHT,marginTop:2}}>{year}</div>
              </div>
              <button onClick={nextMonth} style={{background:"none",border:`1px solid ${RULE}`,color:LIGHT,width:34,height:34,cursor:"pointer",fontSize:16,fontFamily:"serif",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
            </div>

            {/* Nights counter — compact 2-row grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,marginBottom:12,border:`1px solid ${RULE}`}}>
              {FAMILIES.map((f,i)=>{
                const n=famNightsThisMonth(f.id);
                return (
                  <div key={f.id} style={{textAlign:"center",padding:"6px 4px",borderRight:i%3<2?`1px solid ${RULE}`:"none",borderBottom:i<3?`1px solid ${RULE}`:"none"}}>
                    <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:7,letterSpacing:"1px",textTransform:"uppercase",color:LIGHT,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.name.split(" & ")[0]}</div>
                    <div style={{fontFamily:"'EB Garamond',serif",fontSize:18,color:n>0?f.mark:LIGHT,lineHeight:1.1}}>{n}<span style={{fontSize:8,color:LIGHT,marginLeft:1}}>n</span></div>
                  </div>
                );
              })}
            </div>

            {/* Calendar grid */}
            <div style={{border:`1px solid ${RULE}`}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:`1px solid ${RULE}`}}>
                {DAYS.map((d,i)=>(
                  <div key={i} style={{textAlign:"center",padding:"6px 0",fontFamily:"'Josefin Sans',sans-serif",fontSize:9,color:LIGHT}}>{d}</div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
                {cells.map((day,idx)=>{
                  if(!day) return <div key={`e${idx}`} style={{minHeight:52,borderRight:`1px solid ${RULE}`,borderBottom:`1px solid ${RULE}`,background:"#EDE8DC"}}/>;
                  const key=toKey(year,month,day);
                  const by=bookings[key];
                  const fam=by?getF(by):null;
                  const todayCell=isToday(day);
                  return (
                    <div key={day} className="day-cell"
                      onClick={()=>bookDay(day)}
                      style={{minHeight:52,padding:"5px 4px",borderRight:`1px solid ${RULE}`,borderBottom:`1px solid ${RULE}`,background:by?fam.bg:BG,display:"flex",flexDirection:"column",gap:2,userSelect:"none"}}>
                      <span style={{fontFamily:"'EB Garamond',serif",fontSize:13,color:todayCell?cf.mark:INK,fontWeight:todayCell?500:400,textDecoration:todayCell?"underline":"none",textUnderlineOffset:2}}>
                        {day}
                      </span>
                      {fam&&<span style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:7,letterSpacing:"0.5px",textTransform:"uppercase",color:fam.mark,lineHeight:1.2}}>{fam.symbol} {fam.name.split(" & ")[0]}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div style={{display:"flex",flexWrap:"wrap",gap:"8px 16px",justifyContent:"center",marginTop:10}}>
              {FAMILIES.map(f=>(
                <div key={f.id} style={{display:"flex",alignItems:"center",gap:4,fontFamily:"'Josefin Sans',sans-serif",fontSize:8,letterSpacing:"1px",textTransform:"uppercase",color:LIGHT}}>
                  <span style={{color:f.mark}}>{f.symbol}</span>{f.name}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── NOTES ── */}
        {tab==="notes" && (
          <div>
            <div style={{marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${RULE}`}}>
              <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:LIGHT,marginBottom:8}}>Note from {cf.name}</div>
              <div style={{display:"flex",gap:0}}>
                <input value={newNote} onChange={e=>setNewNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote()}
                  placeholder="Leave a note for the house…"
                  style={{flex:1,padding:"9px 12px",border:`1px solid ${RULE}`,borderRight:"none",background:CARD,fontFamily:"'EB Garamond',serif",fontSize:15,color:INK}}/>
                <button onClick={addNote} style={{background:INK,color:BG,border:`1px solid ${INK}`,padding:"9px 16px",cursor:"pointer",fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:"2px",textTransform:"uppercase",whiteSpace:"nowrap"}}>Post</button>
              </div>
            </div>

            {openNotes.length===0&&(
              <div style={{textAlign:"center",padding:"36px 0",fontFamily:"'EB Garamond',serif",fontStyle:"italic",fontSize:16,color:LIGHT}}>The house is in good order.</div>
            )}

            {openNotes.length>0&&(
              <>
                <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:LIGHT,marginBottom:10}}>Open — {openNotes.length}</div>
                {openNotes.map(note=>{
                  const f=getF(note.author);
                  return (
                    <div key={note.id} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:`1px solid ${RULE}`,alignItems:"flex-start"}}>
                      <button onClick={()=>toggleNote(note.id,note.resolved)} style={{width:16,height:16,border:`1px solid ${f?.mark}`,background:"transparent",borderRadius:"50%",cursor:"pointer",flexShrink:0,marginTop:3}}/>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'EB Garamond',serif",fontSize:15,color:INK,marginBottom:3,lineHeight:1.4}}>{note.text}</div>
                        <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:8,letterSpacing:"1px",textTransform:"uppercase",color:LIGHT}}><span style={{color:f?.mark}}>{f?.symbol}</span> {f?.name} · {note.timestamp}</div>
                      </div>
                      <button onClick={()=>deleteNote(note.id)} style={{background:"none",border:"none",color:RULE,cursor:"pointer",fontSize:18,lineHeight:1,padding:0}}>×</button>
                    </div>
                  );
                })}
              </>
            )}

            {resolvedNotes.length>0&&(
              <div style={{marginTop:24}}>
                <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:RULE,marginBottom:10}}>Resolved — {resolvedNotes.length}</div>
                {resolvedNotes.map(note=>{
                  const f=getF(note.author);
                  return (
                    <div key={note.id} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:`1px solid #E0D8CC`,alignItems:"center",opacity:0.5}}>
                      <button onClick={()=>toggleNote(note.id,note.resolved)} style={{width:16,height:16,border:`1px solid ${f?.mark}`,background:f?.mark,borderRadius:"50%",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:BG,fontSize:9}}>✓</button>
                      <div style={{flex:1,fontFamily:"'EB Garamond',serif",fontSize:14,color:LIGHT,textDecoration:"line-through"}}>{note.text}</div>
                      <button onClick={()=>deleteNote(note.id)} style={{background:"none",border:"none",color:RULE,cursor:"pointer",fontSize:16,lineHeight:1,padding:0}}>×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab==="history" && (
          <>
            {/* Totals */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,marginBottom:16,border:`1px solid ${RULE}`}}>
              {FAMILIES.map((f,i)=>{
                const n=famNightsTotal(f.id);
                return (
                  <div key={f.id} style={{textAlign:"center",padding:"8px 4px",borderRight:i%3<2?`1px solid ${RULE}`:"none",borderBottom:i<3?`1px solid ${RULE}`:"none"}}>
                    <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:7,letterSpacing:"1px",textTransform:"uppercase",color:LIGHT}}>{f.name.split(" & ")[0]}</div>
                    <div style={{fontFamily:"'EB Garamond',serif",fontStyle:"italic",fontSize:20,color:n>0?f.mark:LIGHT,lineHeight:1.1}}>{n}</div>
                    <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:7,color:RULE}}>total</div>
                  </div>
                );
              })}
            </div>

            {/* Filter */}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
              <button onClick={()=>setHistFilter("all")} style={sBtn(histFilter==="all",INK)}>All</button>
              {FAMILIES.map(f=><button key={f.id} onClick={()=>setHistFilter(f.id)} style={sBtn(histFilter===f.id,f.mark)}>{f.symbol} {f.name.split(" & ")[0]}</button>)}
            </div>

            {filtHist.length===0&&<div style={{padding:"32px 0",textAlign:"center",fontFamily:"'EB Garamond',serif",fontStyle:"italic",fontSize:15,color:LIGHT}}>No records yet.</div>}
            {filtHist.map((entry,i)=>{
              const f=getF(entry.family);
              const isBooked=entry.type==="booked";
              return (
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 0",borderBottom:`1px solid ${RULE}`}}>
                  <span style={{fontSize:10,color:f?.mark,width:16,textAlign:"center",paddingTop:2}}>{f?.symbol}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"baseline",marginBottom:2,flexWrap:"wrap"}}>
                      <span style={{fontFamily:"'EB Garamond',serif",fontSize:14,color:INK}}>{f?.name}</span>
                      <span style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:7,letterSpacing:"1.5px",textTransform:"uppercase",color:isBooked?"#4A6741":"#8B4040"}}>{isBooked?"Reserved":"Removed"}</span>
                    </div>
                    <div style={{fontFamily:"'EB Garamond',serif",fontStyle:"italic",fontSize:12,color:LIGHT}}>{fmtDates(entry.dates)}</div>
                  </div>
                  <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:8,color:LIGHT,flexShrink:0,paddingTop:3}}>{entry.timestamp}</div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{borderTop:`1px solid ${RULE}`,padding:"14px",textAlign:"center"}}>
        <div style={{fontFamily:"'Josefin Sans',sans-serif",fontSize:7,letterSpacing:"3px",textTransform:"uppercase",color:RULE}}>Est. Sonoma Valley · Shared with care</div>
      </div>

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:INK,color:BG,padding:"9px 20px",fontSize:11,fontFamily:"'Josefin Sans',sans-serif",letterSpacing:"2px",textTransform:"uppercase",boxShadow:"0 4px 20px rgba(0,0,0,0.2)",animation:"fadeUp 0.2s ease",zIndex:100,whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}
    </div>
  );
}
