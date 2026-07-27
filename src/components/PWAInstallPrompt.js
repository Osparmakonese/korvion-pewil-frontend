import { useState, useEffect } from 'react';
import { subscribe, promptInstall } from '../utils/pwaInstall';

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribe(({ available, installed }) => {
      if (available && !installed && !localStorage.getItem('pwa_dismissed')) {
        setShow(true);
      }
      if (installed || !available) setShow(false);
    });
    return unsubscribe;
  }, []);

  async function install() {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      setShow(false);
      localStorage.removeItem('pwa_dismissed');
    }
  }

  function dismiss() {
    setShow(false);
    localStorage.setItem('pwa_dismissed', '1');
  }

  if (!show) return null;

  return (
    <div style={{ position:'fixed', bottom:76, left:12, right:12, zIndex:999, background:'#1a6b3a', color:'#fff', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 24px rgba(0,0,0,0.3)', fontFamily:'Inter,sans-serif', gap:12 }}>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:3}}>Install Pewil</div>
        <div style={{fontSize:11,opacity:0.85}}>Add to home screen for quick access</div>
      </div>
      <div style={{display:'flex',gap:8,flexShrink:0}}>
        <button onClick={dismiss} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',padding:'7px 10px',borderRadius:7,fontSize:12,cursor:'pointer'}}>Not now</button>
        <button onClick={install} style={{background:'#fff',border:'none',color:'#1a6b3a',padding:'7px 14px',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer'}}>Install</button>
      </div>
    </div>
  );
}
