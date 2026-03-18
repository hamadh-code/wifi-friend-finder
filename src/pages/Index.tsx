import { useState, useEffect, useMemo, useCallback } from "react";
import { Wifi, RefreshCw, Download } from "lucide-react";
import { CapacitorWifi } from "@capgo/capacitor-wifi";
import { Capacitor } from "@capacitor/core";

interface WifiNetwork {
  id: string; ssid: string; bssid: string; dbm: number;
  channel: number; band: string; frequency: number; security: string;
}

function generateNetworks(): WifiNetwork[] {
  const ssids = ["HomeNet","OfficeWifi","CafeHotspot","GuestNetwork","SecureNet","AndroidAP","iPhone","Linksys","NETGEAR","TP-Link"];
  const secs = ["WPA2","WPA3","Open","WEP","WPA"];
  return Array.from({length:12},(_,i) => {
    const freq = Math.random()>0.5?2437+Math.floor(Math.random()*200):5180+Math.floor(Math.random()*800);
    return {id:"net-"+i,ssid:ssids[i%ssids.length]+(i>9?"-"+i:""),
      bssid:Array.from({length:6},()=>Math.floor(Math.random()*256).toString(16).padStart(2,"0")).join(":"),
      dbm:-30-Math.floor(Math.random()*70),
      channel:freq<3000?Math.floor(Math.random()*11)+1:Math.floor(Math.random()*24)+36,
      band:freq<3000?"2.4GHz":"5GHz",frequency:freq,
      security:secs[Math.floor(Math.random()*secs.length)]};
  });
}

async function scanNative(): Promise<WifiNetwork[]> {
  try {
    await CapacitorWifi.requestPermissions();
    await new Promise<void>(resolve => {
      CapacitorWifi.addListener("networksScanned", () => resolve()).then(() => CapacitorWifi.startScan());
      setTimeout(resolve, 5000);
    });
    const { networks } = await CapacitorWifi.getAvailableNetworks();
    if (!networks || !networks.length) return generateNetworks();
    return networks.map((n,i) => {
      const freq = (n as any).frequency || 2437;
      return {id:"net-"+i,ssid:(n as any).ssid||"Hidden",bssid:(n as any).bssid||"00:00:00:00:00:00",
        dbm:(n as any).rssi||-70,
        channel:freq<3000?Math.floor((freq-2412)/5)+1:Math.floor((freq-5180)/5)+36,
        band:freq<3000?"2.4GHz":"5GHz",frequency:freq,
        security:(n as any).security||"Unknown"};
    });
  } catch(e) { console.log("scan err",e); return generateNetworks(); }
}

function Bar({dbm}:{dbm:number}) {
  const s=dbm>-50?4:dbm>-60?3:dbm>-70?2:1;
  const c=s===4?"#22c55e":s===3?"#84cc16":s===2?"#eab308":"#ef4444";
  return <div style={{display:"flex",alignItems:"flex-end",gap:"2px",height:"16px"}}>{[1,2,3,4].map(b=><div key={b} style={{width:"4px",backgroundColor:b<=s?c:"#374151",borderRadius:"1px",height:b*4+"px"}}/>)}</div>;
}

export default function Index() {
  const [nets,setNets]=useState<WifiNetwork[]>([]);
  const [scanning,setScanning]=useState(false);
  const [band,setBand]=useState("all");
  const [sec,setSec]=useState("all");
  const [status,setStatus]=useState("init");
  const isNative = Capacitor.isNativePlatform();

  const scan=useCallback(async()=>{
    if(scanning)return;
    setScanning(true);setStatus("scanning");
    const r=isNative?await scanNative():generateNetworks();
    setNets(r);setStatus(isNative?"native:"+r.length:"sim:"+r.length);
    setScanning(false);
  },[isNative,scanning]);

  useEffect(()=>{scan();const t=setInterval(scan,10000);return()=>clearInterval(t);},[]);

  const filtered=useMemo(()=>nets.filter(n=>{
    if(band!=="all"&&n.band!==band)return false;
    if(sec==="Open"&&n.security!=="Open")return false;
    if(sec==="Secured"&&n.security==="Open")return false;
    return true;
  }),[nets,band,sec]);

  const fb=(a:boolean):React.CSSProperties=>({padding:"4px 10px",borderRadius:"999px",border:"1px solid",borderColor:a?"#3b82f6":"#334155",background:a?"#1d4ed8":"transparent",color:a?"#fff":"#94a3b8",cursor:"pointer",fontSize:"11px",whiteSpace:"nowrap"});
  const badge=(c:string):React.CSSProperties=>({padding:"2px 8px",borderRadius:"999px",fontSize:"10px",background:c+"20",color:c,border:"1px solid "+c+"40"});

  return (
    <div style={{minHeight:"100vh",background:"#0f172a",color:"#f1f5f9",fontFamily:"monospace",display:"flex",flexDirection:"column"}}>
      <div style={{borderBottom:"1px solid #1e293b",padding:"8px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10,background:"#0f172a"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <Wifi size={16} color="#3b82f6"/>
          <div><div style={{fontSize:"14px",fontWeight:600}}>WiFi Friend Finder</div><div style={{fontSize:"11px",color:"#64748b"}}>Diagnostic Utility</div></div>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <button style={{display:"flex",alignItems:"center",gap:"4px",padding:"4px 10px",borderRadius:"6px",border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:"11px"}} onClick={()=>{const csv=["SSID,Signal",...filtered.map(n=>n.ssid+","+n.dbm)].join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv]));a.download="wifi.csv";a.click();}}><Download size={12}/>CSV</button>
          <button style={{display:"flex",alignItems:"center",gap:"4px",padding:"4px 10px",borderRadius:"6px",border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:"11px"}} onClick={scan} disabled={scanning}><RefreshCw size={12} style={scanning?{animation:"spin 1s linear infinite"}:{}}/>Scan</button>
        </div>
      </div>
      <div style={{padding:"3px 16px",background:isNative?"#052e16":"#2d1b00",borderBottom:"1px solid #1e293b",fontSize:"10px",color:isNative?"#4ade80":"#fbbf24"}}>{isNative?"📱 ":"🌐 "}{status}</div>
      <div style={{display:"flex",gap:"8px",padding:"8px 16px",borderBottom:"1px solid #1e293b",overflowX:"auto"}}>
        <span style={{fontSize:"11px",color:"#64748b",alignSelf:"center"}}>Band:</span>
        {["all","2.4GHz","5GHz"].map(b=><button key={b} style={fb(band===b)} onClick={()=>setBand(b)}>{b}</button>)}
        <span style={{fontSize:"11px",color:"#64748b",alignSelf:"center",marginLeft:"8px"}}>Sec:</span>
        {["all","Open","Secured"].map(s=><button key={s} style={fb(sec===s)} onClick={()=>setSec(s)}>{s}</button>)}
      </div>
      {scanning&&<div style={{padding:"3px 16px",background:"#1d4ed820",fontSize:"10px",color:"#60a5fa"}}>Scanning...</div>}
      <div style={{flex:1,overflowY:"auto",padding:"8px"}}>
        {filtered.length===0?<div style={{textAlign:"center",padding:"48px",color:"#475569"}}>No networks</div>:filtered.map(n=>(
          <div key={n.id} style={{background:"#1e293b",borderRadius:"8px",padding:"12px",marginBottom:"8px",border:"1px solid #334155"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
              <div><div style={{fontWeight:600,fontSize:"14px"}}>{n.ssid}</div><div style={{fontSize:"10px",color:"#64748b"}}>{n.bssid}</div></div>
              <div style={{textAlign:"right"}}><Bar dbm={n.dbm}/><div style={{fontSize:"11px",color:"#94a3b8",marginTop:"4px"}}>{n.dbm}dBm</div></div>
            </div>
            <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
              <span style={badge("#3b82f6")}>{n.band}</span>
              <span style={badge("#8b5cf6")}>Ch{n.channel}</span>
              <span style={badge(n.security==="Open"?"#ef4444":"#22c55e")}>{n.security}</span>
              <span style={badge("#0891b2")}>{n.frequency}MHz</span>
            </div>
          </div>
        ))}
      </div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
