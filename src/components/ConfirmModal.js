import React from 'react';
export default function ConfirmModal({ isOpen, onConfirm, onCancel, fields }) {
  if (!isOpen) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#fff', borderRadius:12, padding:28, width:400, maxWidth:'90vw', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize:17, fontWeight:700, color:'#111827', marginBottom:6 }}>Check before saving</div>
        <div style={{ fontSize:13, color:'#6b7280', marginBottom:18 }}>Please confirm your details are correct</div>
        <div style={{ background:'#f6f8f6', border:'1px solid #e3e8e4', borderRadius:8, padding:14, marginBottom:20 }}>
          {(fields||[]).filter(f=>f.value).map((f,i,arr)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:i<arr.length-1?'1px solid #f3f4f6':'none', fontSize:13 }}>
              <span style={{ color:'#6b7280' }}>{f.label}</span>
              <span style={{ fontWeight:600, color:'#111827' }}>{f.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'10px 0', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:500 }}>Go back and edit</button>
          <button onClick={onConfirm} style={{ flex:1, padding:'10px 0', borderRadius:8, border:'none', background:'#166534', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>Yes, save it</button>
        </div>
      </div>
    </div>
  );
}
