import { useState, useEffect, useMemo, useCallback } from "react";
import { Wifi, RefreshCw, Download } from "lucide-react";

interface WifiNetwork {
  id: string;
  ssid: string;
  bssid: string;
  dbm: number;
  channel: number;
  band: string;
  frequency: number;
  security: string;
  vendor: string;
}

function generateNetworks(): WifiNetwork[] {
  const networks: WifiNetwork[] = [];
  const ssids = ["HomeNet","OfficeWifi","CafeHotspot","GuestNetwork","SecureNet","AndroidAP","iPhone_Hotspot","Linksys","NETGEAR","TP-Link_5G"];
  const securities = ["WPA2","WPA3","Open","WEP","WPA"];
  for (let i = 0; i < 12; i++) {
    const freq = Math.random() > 0.5 ? 2437 + Math.floor(Math.random()*200) : 5180 + Math.floor(Math.random()*800);
    networks.push({
      id: `net-${i}`,
      ssid: ssids[i % ssids.length] + (i > 9 ? `-${i}` : ""),
      bssid: Array.from({length:6}, () => Math.floor(Math.random()*256).toString(16).padStart(2,'0')).join(':'),
      dbm: -30 - Math.floor(Math.random()*70),
      channel: freq < 3000 ? Math.floor(Math.random()*11)+1 : Math.floor(Math.random()*24)+36,
      band: freq < 3000 ? "2.4GHz" : "5GHz",
      frequency: freq,
      security: securities[Math.floor(Math.random()*securities.length)],
      vendor: ["Cisco","Netgear","TP-Link","Asus","Linksys"][Math.floor(Math.random()*5)],
    });
  }
  return networks;
}

async function scanNativeNetworks(): Promise<WifiNetwork[]> {
  try {
    const { WifiManager } = await import('@capgo/capacitor-wifi');
    const result = await WifiManager.getWifiList();
    return result.networks.map((n: any, i: number) => ({
      id: `net-${i}`,
      ssid: n.SSID || 'Hidden',
      bssid: n.BSSID || '00:00:00:00:00:00',
      dbm: n.level || -70,
      channel: n.frequency < 3000 ? Math.floor((n.frequency - 2412)/5)+1 : Math.floor((n.frequency - 5180)/5)+36,
      band: n.frequency < 3000 ? '2.4GHz' : '5GHz',
      frequency: n.frequency || 2437,
      security: n.capabilities || 'Unknown',
      vendor: 'Unknown',
    }));
  } catch {
    return generateNetworks();
  }
}

function SignalBar({ dbm }: { dbm: number }) {
  const strength = dbm > -50 ? 4 : dbm > -60 ? 3 : dbm > -70 ? 2 : 1;
  const color = strength === 4 ? '#22c55e' : strength === 3 ? '#84cc16' : strength === 2 ? '#eab308' : '#ef4444';
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:'2px',height:'16px'}}>
      {[1,2,3,4].map(b => (
        <div key={b} style={{width:'4px',backgroundColor: b <= strength ? color : '#374151',borderRadius:'1px',height:`${b*4}px`}} />
      ))}
    </div>
  );
}

export default function Index() {
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [band, setBand] = useState<'all'|'2.4GHz'|'5GHz'>('all');
  const [security, setSecurity] = useState<'all'|'Open'|'Secured'>('all');
  const [scanInterval] = useState(5);
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();

  const scan = useCallback(async () => {
    setScanning(true);
    const results = isNative ? await scanNativeNetworks() : generateNetworks();
    setNetworks(results);
    setScanning(false);
  }, [isNative]);

  useEffect(() => {
    scan();
    const interval = setInterval(scan, scanInterval * 1000);
    return () => clearInterval(interval);
  }, [scan, scanInterval]);

  const filtered = useMemo(() => networks.filter(n => {
    if (band !== 'all' && n.band !== band) return false;
    if (security === 'Open' && n.security !== 'Open') return false;
    if (security === 'Secured' && n.security === 'Open') return false;
    return true;
  }), [networks, band, security]);

  const exportData = () => {
    const csv = ['SSID,BSSID,Signal (dBm),Channel,Band,Frequency,Security,Vendor',
      ...filtered.map(n => `"${n.ssid}","${n.bssid}",${n.dbm},${n.channel},"${n.band}",${n.frequency},"${n.security}","${n.vendor}"`)
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `wifi-scan-${Date.now()}.csv`;
    a.click();
  };

  const filterBtn = (active: boolean): React.CSSProperties => ({
    padding:'4px 10px',borderRadius:'999px',border:'1px solid',
    borderColor: active ? '#3b82f6' : '#334155',
    background: active ? '#1d4ed8' : 'transparent',
    color: active ? '#fff' : '#94a3b8',
    cursor:'pointer',fontSize:'11px',whiteSpace:'nowrap'
  });

  const badge = (color: string): React.CSSProperties => ({
    padding:'2px 8px',borderRadius:'999px',fontSize:'10px',
    background:color+'20',color:color,border:`1px solid ${color}40`
  });

  return (
    <div style={{minHeight:'100vh',background:'#0f172a',color:'#f1f5f9',fontFamily:'monospace',display:'flex',flexDirection:'column'}}>
      <div style={{borderBottom:'1px solid #1e293b',background:'#0f172a',padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <Wifi size={16} color="#3b82f6" />
          <div>
            <div style={{fontSize:'14px',fontWeight:600}}>WiFi Friend Finder</div>
            <div style={{fontSize:'11px',color:'#64748b'}}>WiFi Diagnostic Utility</div>
          </div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 10px',borderRadius:'6px',border:'1px solid #334155',background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:'11px'}} onClick={exportData}><Download size={12}/>CSV</button>
          <button style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 10px',borderRadius:'6px',border:'1px solid #334155',background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:'11px'}} onClick={scan} disabled={scanning}>
            <RefreshCw size={12} style={scanning?{animation:'spin 1s linear infinite'}:{}}/>Scan
          </button>
        </div>
      </div>
      <div style={{display:'flex',gap:'8px',padding:'8px 16px',borderBottom:'1px solid #1e293b',overflowX:'auto'}}>
        <span style={{fontSize:'11px',color:'#64748b',alignSelf:'center'}}>Band:</span>
        {(['all','2.4GHz','5GHz'] as const).map(b => <button key={b} style={filterBtn(band===b)} onClick={()=>setBand(b)}>{b}</button>)}
        <span style={{fontSize:'11px',color:'#64748b',alignSelf:'center',marginLeft:'8px'}}>Sec:</span>
        {(['all','Open','Secured'] as const).map(s => <button key={s} style={filterBtn(security===s)} onClick={()=>setSecurity(s)}>{s}</button>)}
      </div>
      {scanning && <div style={{padding:'4px 16px',background:'#1d4ed820',borderBottom:'1px solid #1d4ed8',fontSize:'11px',color:'#3b82f6'}}>Scanning...</div>}
      <div style={{flex:1,overflowY:'auto',padding:'8px'}}>
        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'48px',color:'#475569'}}>
            <p>No networks detected</p>
          </div>
        ) : filtered.map(n => (
          <div key={n.id} style={{background:'#1e293b',borderRadius:'8px',padding:'12px',marginBottom:'8px',border:'1px solid #334155'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
              <div>
                <div style={{fontWeight:600,fontSize:'14px'}}>{n.ssid}</div>
                <div style={{fontSize:'11px',color:'#64748b'}}>{n.bssid}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <SignalBar dbm={n.dbm}/>
                <div style={{fontSize:'12px',color:'#94a3b8',marginTop:'4px'}}>{n.dbm} dBm</div>
              </div>
            </div>
            <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginTop:'6px'}}>
              <span style={badge('#3b82f6')}>{n.band}</span>
              <span style={badge('#8b5cf6')}>Ch {n.channel}</span>
              <span style={badge(n.security==='Open'?'#ef4444':'#22c55e')}>{n.security}</span>
              <span style={badge('#64748b')}>{n.vendor}</span>
              <span style={badge('#0891b2')}>{n.frequency}MHz</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:'16px',padding:'8px 16px',borderTop:'1px solid #1e293b',fontSize:'11px',color:'#64748b'}}>
        <span>{filtered.length} networks</span>
        <span>Every {scanInterval}s</span>
        <span style={{marginLeft:'auto'}}>{isNative ? 'Native' : 'Simulated'}</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
