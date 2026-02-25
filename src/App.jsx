import { useState, useMemo, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import * as XLSX from 'xlsx'

// ── 비밀번호 (Vercel 환경변수 VITE_APP_PASSWORD 로 관리) ─────
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || '2912'

// ── 상수 ─────────────────────────────────────────────────────
const FLOORS          = ['지하1층','1층','2층','3층','4층']
const FLOOR_COLORS    = {'지하1층':'#6D28D9','1층':'#0284C7','2층':'#059669','3층':'#B45309','4층':'#DC2626'}
const FLOOR_ICONS     = {'지하1층':'🏗','1층':'🏢','2층':'🏬','3층':'🏙','4층':'🏛'}
const PRESET_MANAGERS = ['이건','박광성']
const DELETE_REASONS  = ['오류등록','고장','파손','납품']
const OUT_TYPES       = ['납품','대여','반출','폐기','기타']
const COLOR_PALETTE   = ['#0EA5E9','#EF4444','#22C55E','#F97316','#A855F7','#14B8A6','#EC4899','#EAB308']
const ICON_OPTIONS    = ['📦','🔌','🖱','⌨','🎙','📷','🔊','💡','🛠','🔧','🖨','📱','🗂','🔋','📡','🎯','🖇','🔩']

// ── 라이트 테마 ───────────────────────────────────────────────
const C = {
  bg:'#F1F5F9',panel:'#FFFFFF',border:'#E2E8F0',border2:'#CBD5E1',
  text:'#0F172A',sub:'#475569',muted:'#94A3B8',
  accent:'#0284C7',accentBg:'#EFF6FF',sidebar:'#FFFFFF',
}

const sx = {
  app:       {fontFamily:"'Pretendard Variable','Pretendard',-apple-system,sans-serif",background:C.bg,minHeight:'100vh',color:C.text,display:'flex'},
  sidebar:   {width:220,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,height:'100vh',zIndex:100,overflowY:'auto',boxShadow:'2px 0 8px rgba(0,0,0,0.04)'},
  logoWrap:  {padding:'24px 22px 20px',borderBottom:`1px solid ${C.border}`},
  logoText:  {fontSize:15,fontWeight:800,color:C.text,letterSpacing:-0.5},
  logoSub:   {fontSize:10,color:C.muted,marginTop:2},
  navSec:    {padding:'12px 12px 4px',fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1,textTransform:'uppercase'},
  nav: a =>  ({display:'flex',alignItems:'center',gap:9,margin:'2px 10px',padding:'9px 12px',cursor:'pointer',color:a?C.accent:C.sub,background:a?C.accentBg:'transparent',borderRadius:10,fontSize:13,fontWeight:a?700:500,transition:'all 0.15s'}),
  main:      {marginLeft:220,padding:'28px 32px',flex:1,minWidth:0},
  pageTitle: {fontSize:22,fontWeight:800,color:C.text,letterSpacing:-0.4,marginBottom:3},
  pageSub:   {fontSize:12,color:C.muted,marginBottom:22},
  card:      {background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'},
  table:     {width:'100%',borderCollapse:'collapse',fontSize:13},
  th:        {textAlign:'left',padding:'9px 14px',color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`,fontSize:11,whiteSpace:'nowrap',background:'#F8FAFC'},
  td:        {padding:'11px 14px',borderBottom:'1px solid #F1F5F9',verticalAlign:'middle'},
  input:     {background:'#F8FAFC',border:`1px solid ${C.border2}`,borderRadius:8,padding:'9px 13px',color:C.text,fontSize:13,width:'100%',outline:'none',boxSizing:'border-box'},
  select:    {background:'#F8FAFC',border:`1px solid ${C.border2}`,borderRadius:8,padding:'9px 13px',color:C.text,fontSize:13,width:'100%',outline:'none'},
  label:     {fontSize:11,color:C.sub,fontWeight:700,marginBottom:6,display:'block'},
  overlay:   {position:'fixed',inset:0,background:'rgba(15,23,42,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'},
  modal:     {background:C.panel,border:`1px solid ${C.border}`,borderRadius:18,padding:28,width:540,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'},
  btnPrimary:{background:'linear-gradient(135deg,#0284C7,#6D28D9)',border:'none',color:'#fff',borderRadius:9,padding:'9px 20px',fontSize:13,cursor:'pointer',fontWeight:700,boxShadow:'0 2px 8px rgba(2,132,199,0.3)'},
  btnGhost:  (c='#0284C7')=>({background:'#fff',border:`1.5px solid ${c}`,color:c,borderRadius:8,padding:'7px 14px',fontSize:12,cursor:'pointer',fontWeight:600}),
  btnDanger: {background:'#FFF5F5',border:'1.5px solid #FCA5A5',color:'#DC2626',borderRadius:8,padding:'6px 12px',fontSize:12,cursor:'pointer',fontWeight:600},
  grid2:     {display:'grid',gridTemplateColumns:'1fr 1fr',gap:14},
  trow:      {display:'flex',gap:7,flexWrap:'wrap'},
  toggle:    (a,c='#0284C7')=>({padding:'7px 13px',borderRadius:8,border:`1.5px solid ${a?c:C.border2}`,background:a?c:'#fff',color:a?'#fff':C.sub,cursor:'pointer',fontSize:12,fontWeight:a?700:500,transition:'all 0.15s',boxShadow:a?`0 2px 6px ${c}40`:'none'}),
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────
const Field = ({label,children}) => <div><label style={sx.label}>{label}</label>{children}</div>

const Badge = ({text,color}) => (
  <span style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,color,background:`${color}15`,border:`1px solid ${color}30`,whiteSpace:'nowrap'}}>{text}</span>
)

const Spinner = () => (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80,gap:16}}>
    <div style={{width:36,height:36,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    <span style={{color:C.muted,fontSize:13}}>불러오는 중...</span>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

const Toast = ({msg,type}) => (
  <div style={{position:'fixed',bottom:28,right:28,zIndex:999,background:type==='error'?'#FFF5F5':C.panel,border:`1.5px solid ${type==='error'?'#FCA5A5':C.border}`,borderRadius:12,padding:'12px 18px',fontSize:13,fontWeight:600,color:type==='error'?'#DC2626':C.text,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',display:'flex',alignItems:'center',gap:8}}>
    {type==='error'?'❌':'✅'} {msg}
  </div>
)

// ── 로그인 화면 ───────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [pw,setPw]       = useState('')
  const [error,setError] = useState(false)
  const [shake,setShake] = useState(false)

  const tryLogin = () => {
    if (pw === APP_PASSWORD) { onLogin(); return }
    setError(true); setShake(true)
    setTimeout(()=>setShake(false),500)
    setTimeout(()=>setError(false),2000)
    setPw('')
  }

  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Pretendard Variable','Pretendard',-apple-system,sans-serif"}}>
      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:20,padding:'40px 44px',width:360,boxShadow:'0 20px 60px rgba(0,0,0,0.1)',textAlign:'center',animation:shake?'shake 0.4s ease':'none'}}>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
        <div style={{fontSize:36,marginBottom:12}}>🔒</div>
        <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>ERIC HW_List</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:28}}>접근하려면 비밀번호를 입력하세요</div>
        <input
          type="password"
          style={{...sx.input,textAlign:'center',fontSize:20,letterSpacing:6,marginBottom:12,border:`1.5px solid ${error?'#EF4444':C.border2}`}}
          placeholder="••••"
          value={pw}
          onChange={e=>{setPw(e.target.value);setError(false)}}
          onKeyDown={e=>e.key==='Enter'&&tryLogin()}
          autoFocus
        />
        {error && <div style={{fontSize:12,color:'#EF4444',marginBottom:10}}>비밀번호가 틀렸어요</div>}
        <button style={{...sx.btnPrimary,width:'100%',padding:'11px',fontSize:14}} onClick={tryLogin}>입장</button>
      </div>
    </div>
  )
}

// ── 담당자 선택 ──────────────────────────────────────────────
function ManagerPicker({value,onChange}) {
  const isPreset  = PRESET_MANAGERS.includes(value)
  const [custom,setCustom] = useState(!isPreset && value!=='')
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <div style={sx.trow}>
        {PRESET_MANAGERS.map((m,i)=>(
          <button key={m} style={{...sx.toggle(!custom&&value===m,i===0?'#0284C7':'#D97706'),padding:'9px 24px',fontSize:14,fontWeight:700}}
            onClick={()=>{setCustom(false);onChange(m)}}>{m}</button>
        ))}
        <button style={{...sx.toggle(custom,'#7C3AED'),padding:'9px 14px',fontSize:12}}
          onClick={()=>{setCustom(true);onChange('')}}>✏ 직접입력</button>
      </div>
      {custom && <input style={sx.input} placeholder="담당자 이름 입력" value={isPreset?'':value} onChange={e=>onChange(e.target.value)} autoFocus/>}
    </div>
  )
}

// ── 카테고리 추가/수정 모달 ──────────────────────────────────
function CategoryModal({mode,initial,onSave,onClose,existingColors}) {
  const [name,setName]   = useState(initial?.name||'')
  const [icon,setIcon]   = useState(initial?.icon||'📦')
  const [color,setColor] = useState(initial?.color||(COLOR_PALETTE.find(c=>!existingColors.includes(c))||COLOR_PALETTE[0]))
  return (
    <div style={sx.overlay} onClick={onClose}>
      <div style={{...sx.modal,width:420}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
          <span style={{fontSize:16,fontWeight:800,color:C.text}}>{mode==='add'?'카테고리 추가':'카테고리 수정'}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:C.muted,fontSize:22,cursor:'pointer'}}>×</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <Field label="카테고리 이름 *">
            <input style={sx.input} value={name} onChange={e=>setName(e.target.value)} placeholder="예) 케이블, 공구" autoFocus/>
          </Field>
          <Field label="아이콘">
            <div style={{...sx.trow,gap:6}}>
              {ICON_OPTIONS.map(ic=>(
                <button key={ic} style={{width:38,height:38,borderRadius:8,border:`1.5px solid ${ic===icon?color:C.border2}`,background:ic===icon?`${color}15`:'#F8FAFC',fontSize:18,cursor:'pointer',transition:'all 0.15s'}}
                  onClick={()=>setIcon(ic)}>{ic}</button>
              ))}
            </div>
          </Field>
          <Field label="색상">
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {COLOR_PALETTE.map(cl=>(
                <button key={cl} style={{width:30,height:30,borderRadius:'50%',background:cl,border:cl===color?'3px solid #0F172A':'2px solid transparent',cursor:'pointer'}}
                  onClick={()=>setColor(cl)}/>
              ))}
            </div>
          </Field>
          <div style={{background:'#F8FAFC',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,border:`1px solid ${C.border}`}}>
            <span style={{fontSize:11,color:C.muted}}>미리보기</span>
            <Badge text={`${icon} ${name||'카테고리명'}`} color={color}/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:22}}>
          <button style={sx.btnGhost()} onClick={onClose}>취소</button>
          <button style={{...sx.btnPrimary,opacity:name.trim()?1:0.4}} disabled={!name.trim()}
            onClick={()=>{if(!name.trim())return;onSave({name:name.trim(),icon,color});onClose()}}>
            {mode==='add'?'추가':'저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 출고/납품 모달 ────────────────────────────────────────────
function OutboundModal({item,onConfirm,onClose}) {
  const [outType,setOutType]   = useState('납품')
  const [client,setClient]     = useState('')
  const [qty,setQty]           = useState(1)
  const [manager,setManager]   = useState('이건')
  const [note,setNote]         = useState('')
  return (
    <div style={sx.overlay} onClick={onClose}>
      <div style={{...sx.modal,width:460}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
          <span style={{fontSize:16,fontWeight:800,color:C.text}}>출고 / 납품</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:C.muted,fontSize:22,cursor:'pointer'}}>×</button>
        </div>
        <div style={{background:'#F8FAFC',borderRadius:10,padding:'12px 16px',marginBottom:18,border:`1px solid ${C.border}`}}>
          <div style={{fontWeight:700,fontSize:14,color:C.text}}>{item.name}</div>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>현재 재고: {item.total}개</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Field label="출고 유형">
            <div style={sx.trow}>
              {OUT_TYPES.map(t=>(
                <button key={t} style={sx.toggle(outType===t,'#0284C7')} onClick={()=>setOutType(t)}>{t}</button>
              ))}
            </div>
          </Field>
          <Field label="거래처 / 목적지">
            <input style={sx.input} value={client} onChange={e=>setClient(e.target.value)} placeholder="예) ㈜홍길동, 강남 전시장"/>
          </Field>
          <Field label="출고 수량">
            <input style={{...sx.input,maxWidth:110}} type="number" min={1} max={item.total} value={qty} onChange={e=>setQty(Math.min(item.total,Math.max(1,parseInt(e.target.value)||1)))}/>
            {qty>item.total && <span style={{fontSize:11,color:'#EF4444',marginTop:4,display:'block'}}>재고 수량을 초과할 수 없어요</span>}
          </Field>
          <Field label="담당자">
            <ManagerPicker value={manager} onChange={setManager}/>
          </Field>
          <Field label="비고 (선택)">
            <input style={sx.input} value={note} onChange={e=>setNote(e.target.value)} placeholder="특이사항 등"/>
          </Field>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:22}}>
          <button style={sx.btnGhost()} onClick={onClose}>취소</button>
          <button style={sx.btnPrimary} onClick={()=>onConfirm({outType,client,qty,manager,note})}>출고 확정</button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 앱 ─────────────────────────────────────────────────
export default function App() {
  const [loggedIn,setLoggedIn]      = useState(()=>sessionStorage.getItem('hw_auth')==='ok')
  const [tab,setTab]                = useState('dashboard')
  const [items,setItems]            = useState([])
  const [logs,setLogs]              = useState([])
  const [categories,setCategories]  = useState([])
  const [loading,setLoading]        = useState(true)
  const [toast,setToast]            = useState(null)

  // 카테고리 모달
  const [catModal,setCatModal]      = useState(null) // null | {mode:'add'|'edit', data?}

  // 출고 모달
  const [outModal,setOutModal]      = useState(null) // null | item

  // 재고 필터
  const [dashFloor,setDashFloor]    = useState('전체')
  const [search,setSearch]          = useState('')
  const [catFilter,setCatFilter]    = useState('전체')
  const [floorFilter,setFloorFilter]= useState('전체')

  // 히스토리 검색/필터
  const [logSearch,setLogSearch]    = useState('')
  const [logTypeFilter,setLogTypeFilter] = useState('전체')

  // 장비 모달
  const [itemModal,setItemModal]    = useState(null)
  const [form,setForm]              = useState({})
  const [saving,setSaving]          = useState(false)

  // 삭제 모달
  const [deleteModal,setDeleteModal]     = useState(null)
  const [deleteReason,setDeleteReason]   = useState('오류등록')
  const [deleteManager,setDeleteManager] = useState('이건')

  const showToast = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000) }

  const handleLogin = () => { sessionStorage.setItem('hw_auth','ok'); setLoggedIn(true) }

  // ── 데이터 로드 ──
  const loadItems      = useCallback(async()=>{ const {data}=await supabase.from('items').select('*').order('created_at',{ascending:true}); if(data) setItems(data) },[])
  const loadLogs       = useCallback(async()=>{ const {data}=await supabase.from('logs').select('*').order('created_at',{ascending:false}).limit(500); if(data) setLogs(data) },[])
  const loadCategories = useCallback(async()=>{ const {data}=await supabase.from('categories').select('*').order('sort_order',{ascending:true}); if(data) setCategories(data) },[])

  useEffect(()=>{
    if(!loggedIn) return
    const init=async()=>{ setLoading(true); await Promise.all([loadItems(),loadLogs(),loadCategories()]); setLoading(false) }
    init()
    const c1=supabase.channel('i').on('postgres_changes',{event:'*',schema:'public',table:'items'},loadItems).subscribe()
    const c2=supabase.channel('l').on('postgres_changes',{event:'*',schema:'public',table:'logs'},loadLogs).subscribe()
    const c3=supabase.channel('c').on('postgres_changes',{event:'*',schema:'public',table:'categories'},loadCategories).subscribe()
    return()=>{ c1.unsubscribe();c2.unsubscribe();c3.unsubscribe() }
  },[loggedIn,loadItems,loadLogs,loadCategories])

  const addLog = async(entry)=>{ await supabase.from('logs').insert([{type:entry.type,manager:entry.manager,item_name:entry.item,detail:entry.detail}]) }

  // ── 카테고리 CRUD ──
  const handleSaveCategory = async(cat,editId)=>{
    if(editId){
      await supabase.from('categories').update({name:cat.name,icon:cat.icon,color:cat.color}).eq('id',editId)
      // 기존 장비 카테고리명도 업데이트
      const old = categories.find(c=>c.id===editId)
      if(old && old.name!==cat.name) await supabase.from('items').update({category:cat.name}).eq('category',old.name)
      showToast('카테고리가 수정됐어요!')
    } else {
      await supabase.from('categories').insert([{name:cat.name,icon:cat.icon,color:cat.color,sort_order:categories.length}])
      showToast('카테고리가 추가됐어요!')
    }
    loadCategories(); loadItems()
  }

  const handleDeleteCategory = async(id,name)=>{
    if(items.some(i=>i.category===name)){alert(`"${name}" 카테고리에 장비가 있어 삭제할 수 없어요.`);return}
    await supabase.from('categories').delete().eq('id',id)
    loadCategories()
  }

  // ── 장비 CRUD ──
  const openAdd  = ()=>{ setForm({category:categories[0]?.name||'',name:'',spec:'',serial:'',total:1,location:'1층',note:'',manager:'이건'}); setItemModal({mode:'add'}) }
  const openEdit = (item)=>{ setForm({...item}); setItemModal({mode:'edit'}) }
  const closeItemModal = ()=>setItemModal(null)

  const saveItem = async()=>{
    if(!form.name.trim()) return
    setSaving(true)
    if(itemModal.mode==='add'){
      const {error}=await supabase.from('items').insert([{category:form.category,name:form.name,spec:form.spec,serial:form.serial,total:form.total,location:form.location,note:form.note,manager:form.manager}])
      if(error){showToast('저장 실패: '+error.message,'error');setSaving(false);return}
      await addLog({type:'입고',manager:form.manager||'미지정',item:form.name,detail:`${form.category} / ${form.location} / ${form.total}개 입고`})
      showToast('장비가 입고됐어요!')
    } else {
      const old=items.find(i=>i.id===form.id)
      const {error}=await supabase.from('items').update({category:form.category,name:form.name,spec:form.spec,serial:form.serial,total:form.total,location:form.location,note:form.note,manager:form.manager}).eq('id',form.id)
      if(error){showToast('수정 실패: '+error.message,'error');setSaving(false);return}
      const ch=[]
      if(old.name!==form.name)         ch.push(`이름: ${old.name}→${form.name}`)
      if(old.total!==form.total)       ch.push(`수량: ${old.total}→${form.total}`)
      if(old.location!==form.location) ch.push(`위치: ${old.location}→${form.location}`)
      if(old.manager!==form.manager)   ch.push(`담당: ${old.manager}→${form.manager}`)
      if(old.category!==form.category) ch.push(`카테고리: ${old.category}→${form.category}`)
      await addLog({type:'수정',manager:form.manager||'미지정',item:form.name,detail:ch.join(', ')||'정보 수정'})
      showToast('수정됐어요!')
    }
    await loadItems(); await loadLogs(); setSaving(false); closeItemModal()
  }

  // ── 출고 처리 ──
  const handleOutbound = async({outType,client,qty,manager,note})=>{
    const item = outModal
    const newTotal = item.total - qty
    const {error}=await supabase.from('items').update({total:newTotal}).eq('id',item.id)
    if(error){showToast('출고 처리 실패','error');return}
    await addLog({
      type:'출고',
      manager,
      item:item.name,
      detail:`유형: ${outType} / 거래처: ${client||'-'} / 수량: ${qty}개 출고 (잔여 ${newTotal}개)${note?' / '+note:''}`
    })
    await loadItems(); await loadLogs()
    setOutModal(null)
    showToast(`${qty}개 출고 완료!`)
  }

  // ── 삭제 ──
  const askDelete    = (item)=>{ setDeleteModal({item}); setDeleteReason('오류등록'); setDeleteManager('이건') }
  const confirmDelete = async()=>{
    setSaving(true)
    const {error}=await supabase.from('items').delete().eq('id',deleteModal.item.id)
    if(error){showToast('삭제 실패','error');setSaving(false);return}
    await addLog({type:'삭제',manager:deleteManager,item:deleteModal.item.name,detail:`사유: ${deleteReason} / ${deleteModal.item.total}개 / ${deleteModal.item.location}`})
    await loadItems(); await loadLogs(); setSaving(false); setDeleteModal(null)
    showToast('삭제되고 히스토리에 기록됐어요.')
  }

  // ── 엑셀 ──
  const downloadExcel = ()=>{
    const data=items.map(i=>({카테고리:i.category,품목명:i.name,'모델/스펙':i.spec,시리얼:i.serial,수량:i.total,위치:i.location,담당자:i.manager,비고:i.note||''}))
    const wb=XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),'재고현황')
    if(logs.length>0){
      const ld=logs.map(l=>({시간:l.created_at,유형:l.type,담당자:l.manager,품목:l.item_name,내용:l.detail}))
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ld),'히스토리')
    }
    XLSX.writeFile(wb,`ERIC_HW_List_${new Date().toLocaleDateString('ko-KR').replace(/\. /g,'-').replace('.','')}.xlsx`)
  }

  const uploadExcel = async(e)=>{
    const file=e.target.files[0]; if(!file) return
    const reader=new FileReader()
    reader.onload=async(ev)=>{
      const wb=XLSX.read(ev.target.result,{type:'binary'})
      const ws=wb.Sheets[wb.SheetNames[0]]
      const raw=XLSX.utils.sheet_to_json(ws)
      const rows=raw.map(r=>({category:r['카테고리']||'',name:r['품목명']||'',spec:r['모델/스펙']||'',serial:r['시리얼']||'',total:Number(r['수량'])||0,location:r['위치']||'1층',manager:r['담당자']||'이건',note:r['비고']||''}))
      const {error}=await supabase.from('items').insert(rows)
      if(error){showToast('업로드 실패: '+error.message,'error');return}
      await addLog({type:'업로드',manager:'시스템',item:`${rows.length}개 항목`,detail:`엑셀 업로드: ${file.name}`})
      await loadItems(); await loadLogs()
      showToast(`${rows.length}개 항목이 업로드됐어요!`)
    }
    reader.readAsBinaryString(file); e.target.value=''
  }

  // ── 헬퍼 ──
  const getCat = (name)=>categories.find(c=>c.name===name)||{name,icon:'📦',color:'#94A3B8'}
  const managerColor = (m)=>m==='이건'?'#0284C7':m==='박광성'?'#D97706':'#7C3AED'
  const logColor = {입고:'#059669',수정:'#0284C7',출고:'#F97316',삭제:'#DC2626',업로드:'#7C3AED'}

  const filtered = useMemo(()=>items.filter(i=>{
    const mc=catFilter==='전체'||i.category===catFilter
    const mf=floorFilter==='전체'||i.location===floorFilter
    const q=search.toLowerCase()
    const ms=!search||i.name.toLowerCase().includes(q)||(i.spec||'').toLowerCase().includes(q)||(i.serial||'').toLowerCase().includes(q)
    return mc&&mf&&ms
  }),[items,catFilter,floorFilter,search])

  const filteredLogs = useMemo(()=>logs.filter(l=>{
    const mt=logTypeFilter==='전체'||l.type===logTypeFilter
    const q=logSearch.toLowerCase()
    const ms=!logSearch||l.item_name?.toLowerCase().includes(q)||l.detail?.toLowerCase().includes(q)||l.manager?.toLowerCase().includes(q)
    return mt&&ms
  }),[logs,logTypeFilter,logSearch])

  const dashItems = dashFloor==='전체'?items:items.filter(i=>i.location===dashFloor)
  const catStats  = categories.map(cat=>({...cat,count:dashItems.filter(i=>i.category===cat.name).length,total:dashItems.filter(i=>i.category===cat.name).reduce((s,i)=>s+i.total,0)})).filter(c=>c.count>0)

  // ── 로그인 전 ──
  if(!loggedIn) return <LoginScreen onLogin={handleLogin}/>
  if(loading)   return <div style={{...sx.app,alignItems:'center',justifyContent:'center'}}><Spinner/></div>

  const LOG_TYPES = ['전체','입고','출고','수정','삭제','업로드']

  return (
    <div style={sx.app}>

      {/* ── 사이드바 ── */}
      <div style={sx.sidebar}>
        <div style={sx.logoWrap}>
          <div style={{fontSize:20,marginBottom:6}}>📋</div>
          <div style={sx.logoText}>ERIC HW_List</div>
          <div style={sx.logoSub}>인터랙티브 장비 관리</div>
        </div>
        <div style={{padding:'8px 0 4px'}}>
          <div style={sx.navSec}>메뉴</div>
          {[
            {id:'dashboard',  icon:'▦', label:'대시보드'},
            {id:'inventory',  icon:'☰', label:'재고 현황'},
            {id:'categories', icon:'🏷', label:'카테고리 관리'},
            {id:'logs',       icon:'📋', label:'히스토리'},
          ].map(n=>(
            <div key={n.id} style={sx.nav(tab===n.id)} onClick={()=>setTab(n.id)}>
              <span style={{fontSize:15}}>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.id==='logs'&&logs.length>0&&<span style={{background:C.accentBg,color:C.accent,borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:800}}>{logs.length}</span>}
            </div>
          ))}
        </div>
        <div style={{marginTop:'auto',padding:'16px 22px',borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>총 장비 종류</div>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>{items.length}<span style={{fontSize:12,fontWeight:500,color:C.muted,marginLeft:4}}>종</span></div>
          <button style={{...sx.btnGhost('#94A3B8'),fontSize:11,padding:'4px 10px',marginTop:10,width:'100%'}}
            onClick={()=>{sessionStorage.removeItem('hw_auth');setLoggedIn(false)}}>🔒 잠금</button>
        </div>
      </div>

      {/* ── 메인 ── */}
      <div style={sx.main}>

        {/* ══ 대시보드 ══ */}
        {tab==='dashboard' && <>
          <div style={sx.pageTitle}>대시보드</div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:22,flexWrap:'wrap'}}>
            <span style={{fontSize:12,color:C.muted,fontWeight:600}}>층 필터</span>
            <div style={sx.trow}>
              <button style={sx.toggle(dashFloor==='전체','#475569')} onClick={()=>setDashFloor('전체')}>전체</button>
              {FLOORS.map(f=><button key={f} style={sx.toggle(dashFloor===f,FLOOR_COLORS[f])} onClick={()=>setDashFloor(f)}>{FLOOR_ICONS[f]} {f}</button>)}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(255px,1fr))',gap:14}}>
            {catStats.map(c=>(
              <div key={c.name} style={{...sx.card,marginBottom:0,cursor:'pointer',transition:'box-shadow 0.2s,transform 0.15s'}}
                onClick={()=>{setTab('inventory');setCatFilter(c.name)}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)';e.currentTarget.style.transform='translateY(-2px)'}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';e.currentTarget.style.transform='none'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <div style={{width:46,height:46,borderRadius:12,background:`${c.color}12`,border:`1.5px solid ${c.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{c.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,color:C.text}}>{c.name}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{c.count}종류</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:32,fontWeight:800,color:c.color,lineHeight:1}}>{c.total}</div>
                    <div style={{fontSize:11,color:C.muted}}>개</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {FLOORS.map(fl=>{
                    const cnt=items.filter(i=>i.category===c.name&&i.location===fl).reduce((s,i)=>s+i.total,0)
                    if(!cnt) return null
                    return <div key={fl} style={{flex:'1 1 60px',background:'#F8FAFC',border:`1px solid ${C.border}`,borderRadius:7,padding:'4px 8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:10,color:C.muted}}>{fl}</span>
                      <span style={{fontSize:12,fontWeight:700,color:FLOOR_COLORS[fl]}}>{cnt}</span>
                    </div>
                  })}
                </div>
              </div>
            ))}
          </div>
          {catStats.length===0&&<div style={{textAlign:'center',padding:60,color:C.muted}}>등록된 장비가 없습니다.</div>}
          <div style={{marginTop:14,fontSize:11,color:C.muted,textAlign:'center'}}>카드를 클릭하면 해당 카테고리 재고로 이동합니다</div>
        </>}

        {/* ══ 재고 현황 ══ */}
        {tab==='inventory' && <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,flexWrap:'wrap',gap:10}}>
            <div>
              <div style={sx.pageTitle}>재고 현황</div>
              <div style={sx.pageSub}>총 {items.length}종 · 필터 결과 {filtered.length}종</div>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <label style={{...sx.btnGhost('#059669'),display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                📤 업로드 <input type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={uploadExcel}/>
              </label>
              <button style={sx.btnGhost('#059669')} onClick={downloadExcel}>📥 다운로드</button>
              <button style={sx.btnPrimary} onClick={openAdd}>+ 입고 등록</button>
            </div>
          </div>
          <div style={{...sx.card,padding:16,marginBottom:16}}>
            <div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'flex-start'}}>
              <div style={{flex:'1 1 200px'}}>
                <label style={sx.label}>검색</label>
                <input style={sx.input} placeholder="이름, 모델, 시리얼..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <div>
                <label style={sx.label}>위치</label>
                <div style={sx.trow}>
                  <button style={sx.toggle(floorFilter==='전체','#475569')} onClick={()=>setFloorFilter('전체')}>전체</button>
                  {FLOORS.map(f=><button key={f} style={sx.toggle(floorFilter===f,FLOOR_COLORS[f])} onClick={()=>setFloorFilter(f)}>{FLOOR_ICONS[f]} {f}</button>)}
                </div>
              </div>
              <div>
                <label style={sx.label}>카테고리</label>
                <div style={sx.trow}>
                  <button style={sx.toggle(catFilter==='전체','#475569')} onClick={()=>setCatFilter('전체')}>전체</button>
                  {categories.map(c=><button key={c.name} style={sx.toggle(catFilter===c.name,c.color)} onClick={()=>setCatFilter(c.name)}>{c.icon} {c.name}</button>)}
                </div>
              </div>
            </div>
          </div>
          {(floorFilter==='전체'?FLOORS:[floorFilter]).map(floor=>{
            const fi=filtered.filter(i=>i.location===floor)
            if(!fi.length) return null
            return <div key={floor} style={{marginBottom:24}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:4,height:22,borderRadius:2,background:FLOOR_COLORS[floor]}}/>
                <span style={{fontSize:15,fontWeight:700,color:C.text}}>{FLOOR_ICONS[floor]} {floor}</span>
                <span style={{fontSize:12,color:C.muted}}>{fi.length}종 · {fi.reduce((s,i)=>s+i.total,0)}개</span>
              </div>
              <div style={sx.card}>
                <table style={sx.table}>
                  <thead><tr>{['카테고리','품목명','모델/스펙','시리얼','수량','담당자','비고','관리'].map(h=><th key={h} style={sx.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {fi.map(item=>{
                      const cat=getCat(item.category)
                      return <tr key={item.id} onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={sx.td}><Badge text={`${cat.icon} ${item.category}`} color={cat.color}/></td>
                        <td style={sx.td}><span style={{fontWeight:700,color:C.text}}>{item.name}</span></td>
                        <td style={sx.td}><span style={{color:C.muted,fontSize:12}}>{item.spec}</span></td>
                        <td style={sx.td}><span style={{fontFamily:'monospace',fontSize:11,color:C.muted}}>{item.serial}</span></td>
                        <td style={sx.td}>
                          <span style={{fontWeight:800,fontSize:17,color:item.total===0?'#EF4444':C.text}}>{item.total}</span>
                          {item.total===0&&<span style={{fontSize:10,color:'#EF4444',marginLeft:4}}>재고없음</span>}
                        </td>
                        <td style={sx.td}><Badge text={item.manager||'미지정'} color={managerColor(item.manager)}/></td>
                        <td style={sx.td}><span style={{fontSize:12,color:C.muted}}>{item.note}</span></td>
                        <td style={sx.td}>
                          <div style={{display:'flex',gap:5'}}>
                            <button style={{...sx.btnGhost('#F97316'),padding:'5px 10px',fontSize:11}} onClick={()=>setOutModal(item)}>출고</button>
                            <button style={sx.btnGhost()} onClick={()=>openEdit(item)}>수정</button>
                            <button style={sx.btnDanger} onClick={()=>askDelete(item)}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          })}
          {filtered.length===0&&<div style={{textAlign:'center',padding:80,color:C.muted}}>검색 결과가 없습니다.</div>}
        </>}

        {/* ══ 카테고리 관리 ══ */}
        {tab==='categories' && <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div>
              <div style={sx.pageTitle}>카테고리 관리</div>
              <div style={sx.pageSub}>카테고리를 추가·수정·삭제할 수 있어요</div>
            </div>
            <button style={sx.btnPrimary} onClick={()=>setCatModal({mode:'add'})}>+ 카테고리 추가</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
            {categories.map(c=>{
              const cnt=items.filter(i=>i.category===c.name).length
              return <div key={c.id} style={{...sx.card,marginBottom:0,display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:`${c.color}12`,border:`1.5px solid ${c.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{c.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>장비 {cnt}종</div>
                </div>
                <div style={{display:'flex',gap:5,flexShrink:0}}>
                  <button style={{...sx.btnGhost(),padding:'5px 10px',fontSize:11}} onClick={()=>setCatModal({mode:'edit',data:c})}>수정</button>
                  {cnt===0
                    ? <button style={{...sx.btnDanger,padding:'5px 10px',fontSize:11}} onClick={()=>handleDeleteCategory(c.id,c.name)}>삭제</button>
                    : <span style={{fontSize:11,color:C.muted,whiteSpace:'nowrap',background:'#F1F5F9',padding:'4px 8px',borderRadius:6}}>사용중</span>
                  }
                </div>
              </div>
            })}
          </div>
          <div style={{marginTop:14,padding:'12px 16px',background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:10,fontSize:12,color:'#92400E'}}>
            💡 장비가 등록된 카테고리는 삭제할 수 없어요. 수정은 언제든지 가능해요.
          </div>
        </>}

        {/* ══ 히스토리 ══ */}
        {tab==='logs' && <>
          <div style={sx.pageTitle}>히스토리</div>
          <div style={sx.pageSub}>입고·출고·수정·삭제 전체 이력 ({filteredLogs.length}건)</div>
          <div style={{...sx.card,padding:16,marginBottom:16}}>
            <div style={{display:'flex',gap:14,flexWrap:'wrap',alignItems:'flex-start'}}>
              <div style={{flex:'1 1 200px'}}>
                <label style={sx.label}>검색</label>
                <input style={sx.input} placeholder="품목명, 담당자, 내용..." value={logSearch} onChange={e=>setLogSearch(e.target.value)}/>
              </div>
              <div>
                <label style={sx.label}>유형 필터</label>
                <div style={sx.trow}>
                  {LOG_TYPES.map(t=><button key={t} style={sx.toggle(logTypeFilter===t,logColor[t]||'#475569')} onClick={()=>setLogTypeFilter(t)}>{t}</button>)}
                </div>
              </div>
            </div>
          </div>
          {filteredLogs.length===0
            ? <div style={{...sx.card,textAlign:'center',padding:80,color:C.muted}}>이력이 없습니다.</div>
            : <div style={sx.card}>
                <table style={sx.table}>
                  <thead><tr>{['시간','유형','담당자','품목','내용'].map(h=><th key={h} style={sx.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredLogs.map(l=>(
                      <tr key={l.id} onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={sx.td}><span style={{fontSize:11,color:C.muted,whiteSpace:'nowrap'}}>{new Date(l.created_at).toLocaleString('ko-KR')}</span></td>
                        <td style={sx.td}><Badge text={l.type} color={logColor[l.type]||'#94A3B8'}/></td>
                        <td style={sx.td}><Badge text={l.manager} color={managerColor(l.manager)}/></td>
                        <td style={sx.td}><span style={{fontWeight:600,color:C.text}}>{l.item_name}</span></td>
                        <td style={sx.td}><span style={{fontSize:12,color:C.sub}}>{l.detail}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </>}
      </div>

      {/* ══ 장비 입고 모달 ══ */}
      {itemModal && (
        <div style={sx.overlay} onClick={closeItemModal}>
          <div style={sx.modal} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <span style={{fontSize:16,fontWeight:800,color:C.text}}>{itemModal.mode==='add'?'입고 등록':'장비 수정'}</span>
              <button onClick={closeItemModal} style={{background:'none',border:'none',color:C.muted,fontSize:22,cursor:'pointer'}}>×</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <Field label="카테고리">
                <div style={sx.trow}>
                  {categories.map(c=><button key={c.name} style={sx.toggle(form.category===c.name,c.color)} onClick={()=>setForm({...form,category:c.name})}>{c.icon} {c.name}</button>)}
                  <button style={{...sx.toggle(false,'#7C3AED'),fontSize:11}} onClick={()=>{closeItemModal();setTab('categories')}}>+ 추가</button>
                </div>
              </Field>
              <div style={sx.grid2}>
                <Field label="품목명 *"><input style={sx.input} value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="예) HDMI 케이블 5m"/></Field>
                <Field label="시리얼번호"><input style={sx.input} value={form.serial||''} onChange={e=>setForm({...form,serial:e.target.value})} placeholder="예) SN-001"/></Field>
              </div>
              <Field label="모델명/스펙"><input style={sx.input} value={form.spec||''} onChange={e=>setForm({...form,spec:e.target.value})} placeholder="예) 4K 60Hz, 2m"/></Field>
              <Field label="수량"><input style={{...sx.input,maxWidth:110}} type="number" min={1} value={form.total||1} onChange={e=>setForm({...form,total:parseInt(e.target.value)||1})}/></Field>
              <Field label="위치">
                <div style={sx.trow}>
                  {FLOORS.map(f=><button key={f} style={{...sx.toggle(form.location===f,FLOOR_COLORS[f]),padding:'9px 16px'}} onClick={()=>setForm({...form,location:f})}>{FLOOR_ICONS[f]} {f}</button>)}
                </div>
              </Field>
              <Field label="담당자"><ManagerPicker value={form.manager||''} onChange={v=>setForm({...form,manager:v})}/></Field>
              <Field label="비고 (선택)"><input style={sx.input} value={form.note||''} onChange={e=>setForm({...form,note:e.target.value})} placeholder="특이사항 등"/></Field>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:22}}>
              <button style={sx.btnGhost()} onClick={closeItemModal}>취소</button>
              <button style={{...sx.btnPrimary,opacity:form.name&&!saving?1:0.5}} onClick={saveItem} disabled={!form.name||saving}>{saving?'저장 중...':'저장'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ 삭제 모달 ══ */}
      {deleteModal && (
        <div style={sx.overlay} onClick={()=>setDeleteModal(null)}>
          <div style={{...sx.modal,width:420}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center',marginBottom:22}}>
              <div style={{width:56,height:56,borderRadius:'50%',background:'#FFF5F5',border:'1.5px solid #FCA5A5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 14px'}}>🗑️</div>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:6}}>"{deleteModal.item.name}"</div>
              <div style={{fontSize:13,color:C.muted}}>삭제 사유와 담당자를 선택해주세요.</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <Field label="삭제 사유">
                <select style={sx.select} value={deleteReason} onChange={e=>setDeleteReason(e.target.value)}>
                  {DELETE_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="처리 담당자"><ManagerPicker value={deleteManager} onChange={setDeleteManager}/></Field>
            </div>
            <div style={{display:'flex',gap:10,marginTop:22,justifyContent:'flex-end'}}>
              <button style={sx.btnGhost()} onClick={()=>setDeleteModal(null)}>취소</button>
              <button style={{...sx.btnDanger,padding:'9px 20px',fontSize:13,fontWeight:700}} onClick={confirmDelete} disabled={saving}>{saving?'처리 중...':'삭제 & 기록'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ 카테고리 추가/수정 모달 ══ */}
      {catModal && (
        <CategoryModal
          mode={catModal.mode}
          initial={catModal.data}
          onSave={(cat)=>handleSaveCategory(cat, catModal.mode==='edit'?catModal.data.id:null)}
          onClose={()=>setCatModal(null)}
          existingColors={categories.filter(c=>catModal.data?c.id!==catModal.data.id:true).map(c=>c.color)}
        />
      )}

      {/* ══ 출고 모달 ══ */}
      {outModal && <OutboundModal item={outModal} onConfirm={handleOutbound} onClose={()=>setOutModal(null)}/>}

      {/* ══ 토스트 ══ */}
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  )
}
