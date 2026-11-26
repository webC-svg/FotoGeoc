import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Download, CalendarDays, FileText, X, Check, ChevronDown, ArrowRight, Euro, Clock, AlertTriangle, TrendingUp, RefreshCw, Sparkles, Filter } from 'lucide-react';

type Stato='Da pagare'|'Pagata'|'Arretrata';
type Scadenza={
  id?:string;
  nome:string; categoria:string; tipo:string; importo:number;
  scadenza:string; inizio:string; fine:string;
  cadenza:string; cadenzaMesi?:number;
  stato:Stato; note:string;
  ratePagate:number; rateTotali:number;
  rinnovoAutomatico:boolean;
};
type Rec={id:string; value:Scadenza};
const MESI=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const CATEGORIE=['Casa','Bollette','Prestito','Assicurazione','Auto','Salute','Abbonamenti','Tasse','Lavoro','Altro'];
const TIPI=['Bolletta','Prestito','Abbonamento','Tassa','Affitto','Assicurazione','Altro'];
const CADENZE=['Una tantum','Ogni mese','Ogni 2 mesi','Ogni 3 mesi','Ogni 4 mesi','Ogni 6 mesi','Ogni anno','Personalizzata'];
const CADENZA_MESI:Record<string,number>={'Una tantum':0,'Ogni mese':1,'Ogni 2 mesi':2,'Ogni 3 mesi':3,'Ogni 4 mesi':4,'Ogni 6 mesi':6,'Ogni anno':12,'Personalizzata':0};

async function api(action:string,args:any){
  const r=await fetch("actions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,args})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error) throw new Error(j.error||`Errore ${r.status}`);
  return j.data;
}
function fmt(n:number){return new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n||0)}
function fmtData(s:string){if(!s) return '—'; const d=new Date(s+'T12:00:00'); return d.toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'})}
function addMonths(dateStr:string,months:number){const d=new Date(dateStr+'T12:00:00'); const day=d.getDate(); d.setMonth(d.getMonth()+months); if(d.getDate()<day) d.setDate(0); return d.toISOString().slice(0,10)}
function pct(a:number,b:number){return b?Math.round((a/b)*100):0}
function isCurrentMonth(dateStr:string){if(!dateStr) return false; const now=new Date(); const d=new Date(dateStr+'T12:00:00'); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()}

const ESEMPI:Scadenza[]=[
{nome:'Affitto casa',categoria:'Casa',tipo:'Affitto',importo:850,scadenza:'2026-11-05',inizio:'2026-01-05',fine:'2026-12-05',cadenza:'Ogni mese',stato:'Da pagare',note:'Bonifico entro il 5',ratePagate:10,rateTotali:12,rinnovoAutomatico:true},
{nome:'Bolletta luce',categoria:'Bollette',tipo:'Bolletta',importo:118.40,scadenza:'2026-11-18',inizio:'2026-01-18',fine:'2026-12-18',cadenza:'Ogni 2 mesi',stato:'Da pagare',note:'Lettura contatore',ratePagate:5,rateTotali:6,rinnovoAutomatico:true},
{nome:'Rata prestito auto',categoria:'Prestito',tipo:'Prestito',importo:285,scadenza:'2026-11-22',inizio:'2025-11-22',fine:'2028-10-22',cadenza:'Ogni mese',stato:'Da pagare',note:'Finanziamento 36 rate',ratePagate:12,rateTotali:36,rinnovoAutomatico:true},
{nome:'Assicurazione auto',categoria:'Assicurazione',tipo:'Assicurazione',importo:642,scadenza:'2026-12-10',inizio:'2025-12-10',fine:'2026-12-10',cadenza:'Ogni anno',stato:'Da pagare',note:'RCA + furto e incendio',ratePagate:0,rateTotali:1,rinnovoAutomatico:false},
{nome:'Abbonamento palestra',categoria:'Abbonamenti',tipo:'Abbonamento',importo:49,scadenza:'2026-11-01',inizio:'2026-01-01',fine:'2026-12-31',cadenza:'Ogni mese',stato:'Pagata',note:'Accesso annuale',ratePagate:11,rateTotali:12,rinnovoAutomatico:true},
{nome:'Bolletta gas',categoria:'Bollette',tipo:'Bolletta',importo:96.20,scadenza:'2026-10-20',inizio:'2026-02-20',fine:'2026-12-20',cadenza:'Ogni 2 mesi',stato:'Arretrata',note:'Da saldare',ratePagate:4,rateTotali:6,rinnovoAutomatico:false},
{nome:'IMU seconda rata',categoria:'Tasse',tipo:'Tassa',importo:312,scadenza:'2026-12-16',inizio:'2026-06-16',fine:'2026-12-16',cadenza:'Ogni 6 mesi',stato:'Da pagare',note:'Saldo IMU',ratePagate:1,rateTotali:2,rinnovoAutomatico:false},
{nome:'Abbonamento streaming',categoria:'Abbonamenti',tipo:'Abbonamento',importo:13.99,scadenza:'2026-11-12',inizio:'2026-01-12',fine:'2026-12-12',cadenza:'Ogni mese',stato:'Pagata',note:'Piano famiglia',ratePagate:11,rateTotali:12,rinnovoAutomatico:true},
{nome:'Visita medica controllo',categoria:'Salute',tipo:'Altro',importo:120,scadenza:'2026-11-28',inizio:'2026-11-28',fine:'2026-11-28',cadenza:'Una tantum',stato:'Da pagare',note:'Prenotare conferma',ratePagate:0,rateTotali:0,rinnovoAutomatico:false},
{nome:'Bolletta internet',categoria:'Bollette',tipo:'Bolletta',importo:29.90,scadenza:'2026-11-15',inizio:'2026-01-15',fine:'2026-12-15',cadenza:'Ogni mese',stato:'Da pagare',note:'Fibra 1 Gbps',ratePagate:10,rateTotali:12,rinnovoAutomatico:true},
{nome:'Manutenzione caldaia',categoria:'Casa',tipo:'Altro',importo:95,scadenza:'2026-09-30',inizio:'2026-09-30',fine:'2026-09-30',cadenza:'Ogni anno',stato:'Pagata',note:'Controllo annuale',ratePagate:1,rateTotali:1,rinnovoAutomatico:false},
{nome:'Bollo auto',categoria:'Auto',tipo:'Tassa',importo:198.50,scadenza:'2026-08-31',inizio:'2026-08-31',fine:'2026-08-31',cadenza:'Ogni anno',stato:'Pagata',note:'Scadenza agosto',ratePagate:1,rateTotali:1,rinnovoAutomatico:false},
];

const empty:Scadenza={nome:'',categoria:'Bollette',tipo:'Bolletta',importo:0,scadenza:new Date().toISOString().slice(0,10),inizio:new Date().toISOString().slice(0,10),fine:'',cadenza:'Ogni mese',stato:'Da pagare',note:'',ratePagate:0,rateTotali:0,rinnovoAutomatico:true};

function escapePdf(s:string){return s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[^\x20-\x7Eàèéìòù]/g,' ')}
function buildPdf(lines:string[]){
  let objects:string[]=[]; let content='BT /F1 11 Tf 1 0 0 1 36 780 Tm\n';
  lines.forEach((l,i)=>{ if(l==='---'){content+='0 -18 Td\n'; return} content+=`(${escapePdf(l)}) Tj 0 -16 Td\n`; });
  content+='ET';
  const objs=[`<< /Type /Catalog /Pages 2 0 R >>`,`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf='%PDF-1.4\n'; let offsets:number[]=[0]; objs.forEach((o,i)=>{offsets.push(pdf.length); pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});
  const xrefPos=pdf.length; pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`; for(let i=1;i<=objs.length;i++){pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`}
  pdf+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`; return new Blob([pdf],{type:'application/pdf'});
}

export default function App(){
  const now=new Date();
  const [records,setRecords]=useState<Rec[]>([]);
  const [loading,setLoading]=useState(true);
  const [apiError,setApiError]=useState<string|null>(null);
  const [mese,setMese]=useState<number|string>(now.getMonth()); // default current month? spec wants filter visible; start with Tutti? Start with current to showcase highlight? Use Tutti for full view but badge logic. Choose current month to highlight feature.
  const [anno,setAnno]=useState<number|string>(now.getFullYear());
  const [fStato,setFStato]=useState('Tutti');
  const [fCat,setFCat]=useState('Tutti');
  const [fCad,setFCad]=useState('Tutte');
  const [q,setQ]=useState('');
  const [tab,setTab]=useState<'elenco'|'costi'|'report'>('elenco');
  const [reportTipo,setReportTipo]=useState<'Annuo'|'Per Categoria'|'Per Mese'>('Annuo');
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState<Rec|null>(null);
  const [form,setForm]=useState<Scadenza>(empty);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState<string|null>(null);
  const [confirmPay,setConfirmPay]=useState<Rec|null>(null);
  const [confirmDel,setConfirmDel]=useState<Rec|null>(null);
  const [bulkBusy,setBulkBusy]=useState(false);
  const [bulkResult,setBulkResult]=useState<{saved:number;remaining:number;error:string|null;reloadError:string|null}|null>(null);

  async function reloadRecords(){
    const data=await api('records.list',{collection:'scadenze'});
    const list=(data.records||[]) as {id:string;value:Scadenza}[]; setRecords(list.map(r=>({id:r.id,value:r.value}))); setApiError(null);
  }
  useEffect(()=>{(async()=>{try{await reloadRecords()}catch(e:any){setApiError(e.message||'Archivio non raggiungibile')} finally{setLoading(false)}})()},[]);

  const anni=useMemo(()=>{const s=new Set<number>(); records.forEach(r=>{if(r.value.scadenza) s.add(new Date(r.value.scadenza+'T12:00:00').getFullYear())}); s.add(now.getFullYear()); s.add(2026); return [...s].sort((a,b)=>b-a)},[records]);
  const isFiltered = mese!=='Tutti' || anno!=='Tutti';
  const labelPeriodo = mese==='Tutti' && anno==='Tutti' ? 'Tutti i periodi' : mese==='Tutti' ? `Anno ${anno}` : anno==='Tutti' ? `${MESI[Number(mese)]}` : `${MESI[Number(mese)]} ${anno}`;

  const filtrate=useMemo(()=>{
    return records.filter(r=>{
      const v=r.value; const d=new Date(v.scadenza+'T12:00:00'); if(isNaN(d.getTime())) return false;
      if(mese!=='Tutti' && d.getMonth()!==Number(mese)) return false;
      if(anno!=='Tutti' && d.getFullYear()!==Number(anno)) return false;
      if(fStato!=='Tutti' && v.stato!==fStato) return false;
      if(fCat!=='Tutti' && v.categoria!==fCat) return false;
      if(fCad!=='Tutte' && v.cadenza!==fCad) return false;
      if(q && !(v.nome+' '+v.categoria+' '+v.note).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).sort((a,b)=>a.value.scadenza.localeCompare(b.value.scadenza));
  },[records,mese,anno,fStato,fCat,fCad,q]);

  const totali=useMemo(()=>{
    const tot={totale:0,pagato:0,daPagare:0,arretrato:0,n:filtrate.length};
    filtrate.forEach(r=>{tot.totale+=r.value.importo; if(r.value.stato==='Pagata') tot.pagato+=r.value.importo; if(r.value.stato==='Da pagare') tot.daPagare+=r.value.importo; if(r.value.stato==='Arretrata') tot.arretrato+=r.value.importo});
    return tot;
  },[filtrate]);

  // Costs month by month for selected year (or per-year when Tutti)
  const costiMese=useMemo(()=>{
    if(anno==='Tutti'){
      return anni.map(y=>{
        const rows=records.filter(r=>new Date(r.value.scadenza+'T12:00:00').getFullYear()===y);
        const da=rows.filter(r=>r.value.stato==='Da pagare').reduce((s,r)=>s+r.value.importo,0);
        const pa=rows.filter(r=>r.value.stato==='Pagata').reduce((s,r)=>s+r.value.importo,0);
        const ar=rows.filter(r=>r.value.stato==='Arretrata').reduce((s,r)=>s+r.value.importo,0);
        return {label:`Anno ${y}`,anno:y,meseIdx:-1,daPagare:da,pagato:pa,arretrato:ar,totale:da+pa+ar,n:rows.length,pct:rows.length?Math.round(pa/(da+pa+ar)*100):0, isCurrent:y===now.getFullYear()};
      });
    }
    const y=Number(anno);
    return MESI.map((label,mi)=>{
      const rows=records.filter(r=>{const d=new Date(r.value.scadenza+'T12:00:00'); return d.getFullYear()===y && d.getMonth()===mi});
      const da=rows.filter(r=>r.value.stato==='Da pagare').reduce((s,r)=>s+r.value.importo,0);
      const pa=rows.filter(r=>r.value.stato==='Pagata').reduce((s,r)=>s+r.value.importo,0);
      const ar=rows.filter(r=>r.value.stato==='Arretrata').reduce((s,r)=>s+r.value.importo,0);
      const tot=da+pa+ar;
      return {label,anno:y,meseIdx:mi,daPagare:da,pagato:pa,arretrato:ar,totale:tot,n:rows.length,pct:tot?Math.round(pa/tot*100):0,isCurrent:mi===now.getMonth() && y===now.getFullYear()};
    });
  },[records,anno,anni]);

  const riepilogoAnno=useMemo(()=>{
    const tot=costiMese.reduce((a,c)=>({totale:a.totale+c.totale,pagato:a.pagato+c.pagato,daPagare:a.daPagare+c.daPagare,arretrato:a.arretrato+c.arretrato}),{totale:0,pagato:0,daPagare:0,arretrato:0});
    const piuCostoso=costiMese.reduce((a,b)=>b.totale>a.totale?b:a,costiMese[0]||{label:'—',totale:0});
    const piuScadenze=costiMese.reduce((a,b)=>b.n>a.n?b:a,costiMese[0]||{label:'—',n:0});
    return {...tot,pct:tot.totale?Math.round(tot.pagato/tot.totale*100):0,piuCostoso,piuScadenze};
  },[costiMese]);

  const reportRows=useMemo(()=>{
    if(reportTipo==='Per Categoria'){
      const map=new Map<string,{n:number;totale:number;pagato:number;da:number;ar:number}>();
      filtrate.forEach(r=>{const k=r.value.categoria; const cur=map.get(k)||{n:0,totale:0,pagato:0,da:0,ar:0}; cur.n++; cur.totale+=r.value.importo; if(r.value.stato==='Pagata')cur.pagato+=r.value.importo; if(r.value.stato==='Da pagare')cur.da+=r.value.importo; if(r.value.stato==='Arretrata')cur.ar+=r.value.importo; map.set(k,cur)});
      return [...map.entries()].map(([k,v])=>({label:k,...v}));
    }
    if(reportTipo==='Per Mese'){
      return costiMese.map(c=>({label:c.label,n:c.n,totale:c.totale,pagato:c.pagato,da:c.daPagare,ar:c.arretrato,isCurrent:c.isCurrent}));
    }
    return [{label:labelPeriodo,n:filtrate.length,totale:totali.totale,pagato:totali.pagato,da:totali.daPagare,ar:totali.arretrato}];
  },[reportTipo,filtrate,costiMese,totali,labelPeriodo]);

  function azzera(){setMese('Tutti'); setAnno('Tutti'); setFStato('Tutti'); setFCat('Tutti'); setFCad('Tutte'); setQ('')}
  function meseCorrente(){setMese(now.getMonth()); setAnno(now.getFullYear()); setTab('elenco')}

  async function createRow(row:Scadenza){ await api('records.create',{collection:'scadenze',value:row,idempotency_key:`scadenza-${row.nome}-${row.scadenza}-${Math.random().toString(36).slice(2,8)}`}) }
  async function caricaEsempi(){
    setBulkBusy(true); let saved=0; let error:string|null=null;
    try{ for(const row of ESEMPI){ await createRow(row); saved+=1; } }catch(e:any){ error=e.message||String(e) }
    let reloadError:string|null=null; try{ await reloadRecords() }catch(e:any){ reloadError=e.message||String(e) }
    setBulkResult({saved,remaining:ESEMPI.length-saved,error,reloadError}); setBulkBusy(false);
  }

  async function salva(e:React.FormEvent){
    e.preventDefault(); if(!form.nome.trim()){setMsg('Inserisci il nome della scadenza.'); return}
    setSaving(true); setMsg(null);
    try{
      if(editing){ await api('records.replace',{collection:'scadenze',id:editing.id,value:form}); setMsg('Scadenza aggiornata.'); }
      else { await api('records.create',{collection:'scadenze',value:form,idempotency_key:`new-${Date.now()}-${form.nome}`}); setMsg('Scadenza aggiunta.'); }
      await reloadRecords(); setShowForm(false); setEditing(null);
    }catch(err:any){ setMsg(err.message||'Salvataggio non riuscito.') } finally{setSaving(false)}
  }

  function apriNuova(){setEditing(null); setForm({...empty}); setShowForm(true)}
  function apriModifica(r:Rec){setEditing(r); setForm({...r.value}); setShowForm(true)}

  async function segnaPagata(r:Rec, conRinnovo:boolean){
    try{
      const v={...r.value,stato:'Pagata' as Stato, ratePagate: r.value.rateTotali? Math.min(r.value.rateTotali, r.value.ratePagate+1): r.value.ratePagate};
      await api('records.replace',{collection:'scadenze',id:r.id,value:v});
      if(conRinnovo){
        const mesi = r.value.cadenza==='Personalizzata' ? (r.value.cadenzaMesi||1) : CADENZA_MESI[r.value.cadenza]||0;
        if(mesi>0){
          const next:Scadenza={...r.value, scadenza:addMonths(r.value.scadenza,mesi), inizio:r.value.scadenza, stato:'Da pagare', ratePagate: r.value.rateTotali? r.value.ratePagate+1 : r.value.ratePagate};
          // keep ratePagate as already counted in next cycle? For clarity, next keeps incremented count
          await api('records.create',{collection:'scadenze',value:next,idempotency_key:`rinnovo-${r.id}-${next.scadenza}`});
          setMsg(`Pagata. Rinnovo creato per ${fmtData(next.scadenza)}.`);
        } else setMsg('Segnata come Pagata.');
      } else setMsg('Segnata come Pagata.');
      await reloadRecords(); setConfirmPay(null);
    }catch(err:any){setMsg(err.message)}
  }
  async function elimina(r:Rec){ try{ await api('records.delete',{collection:'scadenze',id:r.id}); await reloadRecords(); setConfirmDel(null); setMsg('Scadenza eliminata.')}catch(e:any){setMsg(e.message)} }

  function downloadCSV(rows:Rec[], filename:string){
    const header='Nome;Categoria;Tipo;Importo;Scadenza;Inizio;Fine;Cadenza;Stato;Note\n';
    const body=rows.map(r=>[r.value.nome,r.value.categoria,r.value.tipo,String(r.value.importo).replace('.',','),r.value.scadenza,r.value.inizio,r.value.fine,r.value.cadenza,r.value.stato,(r.value.note||'').replace(/;/g,',')].join(';')).join('\n');
    const blob=new Blob(['\ufeff'+header+body],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
  }
  function downloadPDF(){
    const lines:string[]=['LE MIE SCADENZE GESTIONE','---',`Periodo: ${labelPeriodo}`,`Riepilogo: Totale ${fmt(totali.totale)} | Pagato ${fmt(totali.pagato)} | Da pagare ${fmt(totali.daPagare)} | Arretrato ${fmt(totali.arretrato)}`,`Riepilogo anno: Totale ${fmt(riepilogoAnno.totale)} | Pagato ${fmt(riepilogoAnno.pagato)} | Completata ${riepilogoAnno.pct}%`,'---','COSTI MESE PER MESE'];
    costiMese.forEach(c=>lines.push(`${c.label}: Tot ${fmt(c.totale)} | Pagato ${fmt(c.pagato)} | Da pagare ${fmt(c.daPagare)} | Arretrato ${fmt(c.arretrato)} | N ${c.n} | Pagata ${c.pct}%${c.isCurrent?' | MESE CORRENTE':''}`));
    lines.push('---','SCADENZE FILTRATE');
    filtrate.forEach(r=>lines.push(`${r.value.nome} | ${r.value.categoria} | ${r.value.cadenza} | ${r.value.scadenza} | ${fmt(r.value.importo)} | ${r.value.stato}${isCurrentMonth(r.value.scadenza)?' | MESE CORRENTE':''}`));
    lines.push('---','Le righe del mese corrente sono evidenziate in giallo chiaro e in grassetto.');
    const blob=buildPdf(lines); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`report-${labelPeriodo.replace(/\s+/g,'-').toLowerCase()}.pdf`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),2000); setMsg('Report PDF scaricato per il periodo selezionato.');
  }

  const csvSets=[
    {label:'Tutte', fn:()=>downloadCSV(records,'tutte.csv')},
    {label:'Annuo', fn:()=>downloadCSV(records.filter(r=>anno==='Tutti'||new Date(r.value.scadenza+'T12:00:00').getFullYear()===Number(anno)),'annuo.csv')},
    {label:'Arretrate', fn:()=>downloadCSV(records.filter(r=>r.value.stato==='Arretrata'),'arretrate.csv')},
    {label:'Pagate', fn:()=>downloadCSV(records.filter(r=>r.value.stato==='Pagata'),'pagate.csv')},
    {label:'Prossime', fn:()=>downloadCSV(records.filter(r=>r.value.stato==='Da pagare'),'prossime.csv')},
    {label:'Per categoria', fn:()=>downloadCSV(filtrate,'per-categoria.csv')},
    {label:'Per mese', fn:()=>downloadCSV(filtrate,'per-mese.csv')},
  ];

  return (
    <div data-safe-area-inset-root style={{boxSizing:'border-box',paddingTop:'var(--safe-area-inset-top)',minHeight:'100vh',background:'var(--bg)'}} className="overflow-x-clip">
      <header data-safe-area-sticky-top style={{top:'var(--safe-area-inset-top)'}} className="sticky z-20 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] uppercase text-[var(--muted)]"><span className="w-7 h-7 rounded-full bg-[var(--primary)] text-white grid place-items-center font-display text-base">L</span> Gestione personale</div>
            <h1 className="font-display text-[clamp(28px,5vw,44px)] leading-[1.02] mt-2">Le Mie Scadenze <span className="italic font-normal">Gestione</span></h1>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-[640px]">Usa <b>Mese</b> e <b>Anno</b> per vedere costi e scadenze di un periodo, poi premi <b>Scarica report PDF</b>: il PDF segue sempre il filtro attivo. Le scadenze del mese corrente sono in <b className="bg-[#FFF9C4] px-1 rounded">giallo chiaro e grassetto</b>.</p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-2">
            <span className="text-xs bg-[var(--surface)] border border-[var(--line)] rounded-full px-3 py-1.5">Oggi · {now.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}</span>
            <button className="btn btn-primary" onClick={apriNuova}><Plus size={16}/> Nuova scadenza</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 pb-16">
        {/* FILTRO MESE + ANNO */}
        <section className="mt-5 bg-[var(--surface)] border border-[var(--line)] rounded-[var(--radius)] p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl flex items-center gap-2"><CalendarDays size={20}/> Filtro mese + anno</h2>
            <button onClick={meseCorrente} className="btn btn-primary btn-small"><Clock size={15}/> Mese corrente</button>
          </div>
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 mt-4">
            <label className="block"><span className="text-xs font-semibold text-[var(--muted)]">MESE</span>
              <select value={String(mese)} onChange={e=>setMese(e.target.value==='Tutti'?'Tutti':Number(e.target.value))}><option value="Tutti">Tutti i mesi</option>{MESI.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></label>
            <label className="block"><span className="text-xs font-semibold text-[var(--muted)]">ANNO</span>
              <select value={String(anno)} onChange={e=>setAnno(e.target.value==='Tutti'?'Tutti':Number(e.target.value))}><option value="Tutti">Tutti gli anni</option>{anni.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
            <button onClick={azzera} className="btn self-end">Azzera filtri</button>
          </div>
          {isFiltered && <div className="mt-4 inline-flex flex-wrap items-center gap-2 bg-[#FFF9C4] border border-[#E7D86B] rounded-full pl-3 pr-1 py-1 text-sm font-bold">Stai vedendo: {labelPeriodo} <button onClick={azzera} className="bg-[var(--ink)] text-[var(--bg)] rounded-full px-2.5 py-1 text-xs flex items-center gap-1"><X size={13}/> Azzera</button></div>}
          <p className="text-xs text-[var(--muted)] mt-3">Il filtro agisce su elenco, totali, costi mese per mese e report. Con “Tutti gli anni” i costi sono raggruppati per anno.</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {[{l:'Totale periodo',v:fmt(totali.totale)},{l:'Pagato',v:fmt(totali.pagato)},{l:'Da pagare',v:fmt(totali.daPagare)},{l:'Arretrato',v:fmt(totali.arretrato)}].map(x=><div key={x.l} className="border border-[var(--line)] rounded-2xl p-3 bg-[var(--bg)]"><div className="text-[11px] uppercase tracking-wide text-[var(--muted)] font-semibold">{x.l}</div><div className="font-display text-[22px] mt-1 [overflow-wrap:anywhere]">{x.v}</div><div className="text-xs text-[var(--muted)]">{totali.n} scadenze · {totali.totale?Math.round(totali.pagato/totali.totale*100):0}% pagato</div></div>)}
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-2 mt-5 flex-wrap">
          {(['elenco','costi','report'] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={`chip !px-4 !py-2.5 !text-sm ${tab===t?'active':''}`}>{t==='elenco'?'Elenco scadenze':t==='costi'?'Costi mese per mese':'Report e download'}</button>)}
          <div className="ml-auto flex gap-2"><button className="btn btn-small" onClick={downloadPDF}><FileText size={15}/> Scarica report PDF</button><button className="btn btn-small md:hidden" onClick={apriNuova}><Plus size={15}/> Nuova</button></div>
        </div>
        {msg && <div className="mt-3 bg-[var(--surface)] border border-[var(--line)] rounded-xl px-4 py-3 text-sm flex justify-between gap-3"><span>{msg}</span><button onClick={()=>setMsg(null)}><X size={16}/></button></div>}
        {apiError && <div className="mt-3 bg-[#FFF1EF] border border-red-200 rounded-xl px-4 py-3 text-sm">Archivio non raggiungibile in anteprima: {apiError}. I dati si salvano dopo la pubblicazione.</div>}

        {tab==='costi' && (
          <section className="mt-5">
            <div className="flex flex-wrap justify-between items-end gap-3"><div><h2 className="font-display text-[26px]">Costi mese per mese</h2><p className="text-sm text-[var(--muted)]">{anno==='Tutti'?'Totale per anno — scegli un anno per vedere i 12 mesi.':'Anno selezionato: '+anno}</p></div><span className="text-xs bg-[#FFF9C4] border border-[#E7D86B] px-2.5 py-1 rounded-full font-bold">● Riga gialla = mese corrente</span></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              <div className="bg-[var(--primary)] text-white rounded-[var(--radius)] p-4 lg:col-span-2"><div className="text-xs uppercase tracking-widest opacity-80">Riepilogo {anno==='Tutti'?'tutti gli anni':'anno '+anno}</div><div className="font-display text-[32px] mt-1">{fmt(riepilogoAnno.totale)}</div><div className="grid grid-cols-3 gap-2 mt-3 text-sm"><span>Pagato<br/><b>{fmt(riepilogoAnno.pagato)}</b></span><span>Da pagare<br/><b>{fmt(riepilogoAnno.daPagare)}</b></span><span>Arretrato<br/><b>{fmt(riepilogoAnno.arretrato)}</b></span></div><div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white" style={{width:`${riepilogoAnno.pct}%`}}/></div><div className="text-xs mt-1">{riepilogoAnno.pct}% completata</div></div>
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[var(--radius)] p-4 space-y-3"><div className="flex gap-2"><TrendingUp size={18}/><div><div className="text-xs text-[var(--muted)]">Mese più costoso</div><b>{riepilogoAnno.piuCostoso.label} · {fmt(riepilogoAnno.piuCostoso.totale)}</b></div></div><div className="flex gap-2"><CalendarDays size={18}/><div><div className="text-xs text-[var(--muted)]">Mese con più scadenze</div><b>{riepilogoAnno.piuScadenze.label} · {riepilogoAnno.piuScadenze.n} scadenze</b></div></div><p className="text-xs text-[var(--muted)]">Ogni riga mostra totale da pagare, pagato, arretrato, numero scadenze e % pagata.</p></div>
            </div>
            <div className="mt-4 bg-[var(--surface)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
              <div className="table-wrap"><table><thead><tr><th>{anno==='Tutti'?'Anno':'Mese'}</th><th>Da pagare</th><th>Pagato</th><th>Arretrato</th><th>N°</th><th>% pagata</th><th>Totale</th></tr></thead><tbody>
                {costiMese.map(c=><tr key={c.label} className={c.isCurrent?'current-row':''}><td className="font-semibold">{c.label} {c.isCurrent && <span className="ml-1 text-[11px] bg-[var(--ink)] text-[var(--bg)] px-2 py-0.5 rounded-full">Mese corrente</span>}</td><td>{fmt(c.daPagare)}</td><td>{fmt(c.pagato)}</td><td>{fmt(c.arretrato)}</td><td>{c.n}</td><td><span className="inline-block bg-[var(--surface-2)] rounded-full px-2 py-0.5 text-xs font-bold">{c.pct}%</span></td><td className="font-bold">{fmt(c.totale)}</td></tr>)}
              </tbody></table></div>
            </div>
          </section>
        )}

        {tab==='report' && (
          <section className="mt-5 grid lg:grid-cols-[280px_1fr] gap-4">
            <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[var(--radius)] p-4 h-fit">
              <h3 className="font-display text-lg">Report</h3>
              <div className="flex flex-col gap-2 mt-3">{(['Annuo','Per Categoria','Per Mese'] as const).map(r=><button key={r} onClick={()=>setReportTipo(r)} className={`text-left px-3 py-2.5 rounded-xl border text-sm font-semibold ${reportTipo===r?'bg-[var(--ink)] text-[var(--bg)]':'border-[var(--line)]'}`}>{r}</button>)}</div>
              <button onClick={downloadPDF} className="btn btn-primary w-full mt-4"><FileText size={16}/> Scarica report PDF</button>
              <p className="text-xs text-[var(--muted)] mt-2">Il PDF contiene titolo, periodo, riepilogo, tabella scadenze filtrate e costi mese per mese.</p>
              <h4 className="font-semibold mt-5 text-sm">Download CSV</h4>
              <div className="flex flex-wrap gap-2 mt-2">{csvSets.map(s=><button key={s.label} onClick={s.fn} className="chip !text-xs flex items-center gap-1"><Download size={13}/> {s.label}</button>)}</div>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
              <div className="p-4 border-b border-[var(--line)] flex justify-between"><div><h3 className="font-display text-xl">Report {reportTipo}</h3><p className="text-sm text-[var(--muted)]">Periodo: {labelPeriodo} · Colonna Cadenza inclusa nell’elenco completo sotto.</p></div><span className="text-xs bg-[var(--surface-2)] rounded-full px-3 py-1 h-fit font-bold">{reportRows.length} righe</span></div>
              <div className="table-wrap"><table><thead><tr><th>{reportTipo==='Per Categoria'?'Categoria':reportTipo==='Per Mese'?(anno==='Tutti'?'Anno':'Mese'):'Periodo'}</th><th>N°</th><th>Totale</th><th>Pagato</th><th>Da pagare</th><th>Arretrato</th></tr></thead><tbody>{reportRows.map((r:any)=><tr key={r.label} className={r.isCurrent?'current-row':''}><td className="font-semibold">{r.label}{r.isCurrent&&<span className="ml-2 text-[11px] bg-[var(--ink)] text-[var(--bg)] px-2 py-0.5 rounded-full">Mese corrente</span>}</td><td>{r.n}</td><td>{fmt(r.totale)}</td><td>{fmt(r.pagato)}</td><td>{fmt(r.da)}</td><td>{fmt(r.ar)}</td></tr>)}</tbody></table></div>
              <div className="p-4"><h4 className="font-semibold text-sm mb-2">Scadenze filtrate — con Cadenza</h4><div className="table-wrap"><table><thead><tr><th>Nome</th><th>Categoria</th><th>Cadenza</th><th>Data</th><th>Importo</th><th>Stato</th></tr></thead><tbody>{filtrate.map(r=><tr key={r.id} className={isCurrentMonth(r.value.scadenza)?'current-row':''}><td className="font-semibold">{r.value.nome}{isCurrentMonth(r.value.scadenza)&&<span className="ml-2 text-[11px] bg-[var(--ink)] text-[var(--bg)] px-2 py-0.5 rounded-full">Mese corrente</span>}</td><td>{r.value.categoria}</td><td>{r.value.cadenza}</td><td>{fmtData(r.value.scadenza)}</td><td>{fmt(r.value.importo)}</td><td>{r.value.stato}</td></tr>)}</tbody></table></div></div>
            </div>
          </section>
        )}

        {tab==='elenco' && (
          <>
            <div className="mt-5 bg-[var(--surface)] border border-[var(--line)] rounded-[var(--radius)] p-3 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cerca nome, categoria, note…" className="!pl-9"/></div>
              <select value={fStato} onChange={e=>setFStato(e.target.value)} className="!w-auto"><option>Tutti</option><option>Da pagare</option><option>Pagata</option><option>Arretrata</option></select>
              <select value={fCat} onChange={e=>setFCat(e.target.value)} className="!w-auto"><option>Tutti</option>{CATEGORIE.map(c=><option key={c}>{c}</option>)}</select>
              <select value={fCad} onChange={e=>setFCad(e.target.value)} className="!w-auto"><option>Tutte</option>{CADENZE.map(c=><option key={c}>{c}</option>)}</select>
              <span className="text-xs text-[var(--muted)] flex items-center gap-1"><Filter size={13}/> {filtrate.length} risultati</span>
            </div>

            {loading ? <p className="mt-6 text-center text-[var(--muted)]">Caricamento scadenze…</p> : filtrate.length===0 ? (
              <div className="mt-6 bg-[var(--surface)] border border-dashed border-[var(--line)] rounded-[var(--radius)] p-8 text-center"><Sparkles className="mx-auto mb-2"/><h3 className="font-display text-xl">Nessuna scadenza in questo periodo</h3><p className="text-sm text-[var(--muted)] mt-1 max-w-[520px] mx-auto">Prova ad azzerare i filtri, oppure carica i dati di esempio per vedere subito elenco, costi e PDF.</p><div className="flex justify-center gap-2 mt-4 flex-wrap"><button className="btn btn-primary" onClick={caricaEsempi} disabled={bulkBusy}>{bulkBusy?'Caricamento…':'Carica dati di esempio'}</button><button className="btn" onClick={azzera}>Azzera filtri</button><button className="btn" onClick={apriNuova}>+ Aggiungi scadenza</button></div>{bulkResult && <p className="text-xs mt-3">Salvati: {bulkResult.saved} · Rimanenti: {bulkResult.remaining}{bulkResult.error?` · Errore: ${bulkResult.error}`:''}{bulkResult.reloadError?` · Ricarica: ${bulkResult.reloadError}`:''}</p>}</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3 mt-4">
                {filtrate.map(r=>{
                  const v=r.value; const curr=isCurrentMonth(v.scadenza);
                  const totImporto=v.rateTotali? v.rateTotali*v.importo: v.importo;
                  const pagatoImporto=v.ratePagate*v.importo;
                  const start=v.inizio?new Date(v.inizio+'T12:00:00').getTime():0; const end=v.fine?new Date(v.fine+'T12:00:00').getTime():0; const nowT=Date.now(); const pctTempo=(start&&end&&end>start)?Math.max(0,Math.min(100,Math.round((nowT-start)/(end-start)*100))):0;
                  return (
                    <article key={r.id} className={`bg-[var(--surface)] border border-[var(--line)] rounded-[var(--radius)] p-4 ${curr?'card-current':''}`}>
                      <div className="flex justify-between gap-2"><div><div className="flex flex-wrap gap-1.5"><span className="text-[11px] font-bold bg-[var(--surface-2)] rounded-full px-2 py-0.5">{v.categoria}</span><span className="text-[11px] font-bold bg-[var(--surface-2)] rounded-full px-2 py-0.5">{v.tipo}</span>{curr&&<span className="text-[11px] font-bold bg-[var(--ink)] text-[var(--bg)] rounded-full px-2 py-0.5">Mese corrente</span>}<span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${v.stato==='Pagata'?'bg-[#E3F2E6] text-[#2F6B4A]':v.stato==='Arretrata'?'bg-[#FDE8E4] text-[#A83A2E]':'bg-[#FFF3CD] text-[#7A5A00]'}`}>{v.stato}</span></div><h3 className="font-display text-[21px] leading-tight mt-2 [overflow-wrap:anywhere]">{v.nome}</h3></div><div className="text-right shrink-0"><div className="font-display text-[22px]">{fmt(v.importo)}</div><div className="text-xs text-[var(--muted)]">Scade {fmtData(v.scadenza)}</div></div></div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] mt-3 text-[var(--muted)]"><span>Cadenza: <b className="text-[var(--ink)]">{v.cadenza}{v.cadenza==='Personalizzata'&&v.cadenzaMesi?` (${v.cadenzaMesi} mesi)`:''}</b></span><span>Inizio: <b className="text-[var(--ink)]">{fmtData(v.inizio)}</b></span><span>Fine: <b className="text-[var(--ink)]">{fmtData(v.fine)}</b></span><span>Rinnovo auto: <b className="text-[var(--ink)]">{v.rinnovoAutomatico?'Sì':'No'}</b></span></div>
                      {v.note && <p className="text-[13px] mt-2 [overflow-wrap:anywhere]">{v.note}</p>}
                      {v.categoria==='Prestito' && <div className="mt-3 bg-[var(--bg)] rounded-xl p-3 text-xs space-y-1.5"><div className="flex justify-between"><span>Rate pagate</span><b>{v.ratePagate} / {v.rateTotali} · {pct(v.ratePagate,v.rateTotali)}%</b></div><div className="h-1.5 bg-[var(--line)] rounded-full overflow-hidden"><div className="h-full bg-[var(--primary)]" style={{width:`${pct(v.ratePagate,v.rateTotali)}%`}}/></div><div className="flex justify-between"><span>% importo pagato</span><b>{fmt(pagatoImporto)} / {fmt(totImporto)} · {pct(pagatoImporto,totImporto)}%</b></div><div className="flex justify-between"><span>% tempo trascorso</span><b>{pctTempo}%</b></div></div>}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {v.stato!=='Pagata' && <button className="btn btn-primary btn-small" onClick={()=>setConfirmPay(r)}><Check size={15}/> Segna Pagata</button>}
                        <button className="btn btn-small" onClick={()=>apriModifica(r)}>Modifica</button>
                        <button className="btn btn-small" onClick={()=>setConfirmDel(r)}>Elimina</button>
                        <label className="ml-auto flex items-center gap-2 text-xs font-semibold cursor-pointer"><input type="checkbox" checked={v.rinnovoAutomatico} onChange={async()=>{try{await api('records.replace',{collection:'scadenze',id:r.id,value:{...v,rinnovoAutomatico:!v.rinnovoAutomatico}}); await reloadRecords()}catch(e:any){setMsg(e.message)}}} className="!w-4 !h-4 accent-[var(--primary)]"/> Rinnovo auto</label>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
            {records.length>0 && <div className="mt-4 flex justify-center"><button className="btn btn-small" onClick={caricaEsempi} disabled={bulkBusy}><RefreshCw size={14}/> {bulkBusy?'Caricamento…':'Aggiungi dati di esempio'}</button></div>}
            {bulkResult && <p className="text-center text-xs mt-2">Esempi salvati: {bulkResult.saved} · Rimanenti: {bulkResult.remaining}{bulkResult.error?` · Errore: ${bulkResult.error}`:''}</p>}
          </>
        )}
      </main>

      {/* Form overlay */}
      {showForm && <div className="fixed inset-0 overflow-y-auto bg-black/50 z-50 pt-[max(1rem,var(--safe-area-inset-top))] pb-6"><div className="min-h-full flex items-center justify-center px-3"><div className="bg-[var(--surface)] w-full max-w-[680px] rounded-[var(--radius)] p-5 shadow-xl">
        <div className="flex justify-between items-start"><div><h2 className="font-display text-2xl">{editing?'Modifica scadenza':'Nuova scadenza'}</h2><p className="text-sm text-[var(--muted)]">Compila tutti i campi utili. Le rate servono per i prestiti.</p></div><button onClick={()=>setShowForm(false)} className="btn btn-small">✕</button></div>
        <form onSubmit={salva} className="grid sm:grid-cols-2 gap-3 mt-4">
          <label className="sm:col-span-2"><span className="text-xs font-semibold">Nome *</span><input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Es. Affitto casa"/></label>
          <label><span className="text-xs font-semibold">Categoria</span><select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>{CATEGORIE.map(c=><option key={c}>{c}</option>)}</select></label>
          <label><span className="text-xs font-semibold">Tipo</span><select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>{TIPI.map(c=><option key={c}>{c}</option>)}</select></label>
          <label><span className="text-xs font-semibold">Importo (€)</span><input type="number" step="0.01" min="0" value={form.importo} onChange={e=>setForm({...form,importo:Number(e.target.value)})}/></label>
          <label><span className="text-xs font-semibold">Data scadenza</span><input type="date" value={form.scadenza} onChange={e=>setForm({...form,scadenza:e.target.value})}/></label>
          <label><span className="text-xs font-semibold">Data inizio</span><input type="date" value={form.inizio} onChange={e=>setForm({...form,inizio:e.target.value})}/></label>
          <label><span className="text-xs font-semibold">Data fine</span><input type="date" value={form.fine} onChange={e=>setForm({...form,fine:e.target.value})}/></label>
          <label><span className="text-xs font-semibold">Cadenza</span><select value={form.cadenza} onChange={e=>setForm({...form,cadenza:e.target.value})}>{CADENZE.map(c=><option key={c}>{c}</option>)}</select></label>
          {form.cadenza==='Personalizzata' && <label><span className="text-xs font-semibold">Ogni quanti mesi?</span><input type="number" min="1" max="24" value={form.cadenzaMesi||1} onChange={e=>setForm({...form,cadenzaMesi:Number(e.target.value)})}/></label>}
          <label><span className="text-xs font-semibold">Stato</span><select value={form.stato} onChange={e=>setForm({...form,stato:e.target.value as Stato})}>{['Da pagare','Pagata','Arretrata'].map(s=><option key={s}>{s}</option>)}</select></label>
          <label className="sm:col-span-2"><span className="text-xs font-semibold">Note</span><textarea rows={2} value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Note, riferimenti, promemoria…"/></label>
          <div className="sm:col-span-2 grid grid-cols-2 gap-3"><label><span className="text-xs font-semibold">Rate pagate (prestiti)</span><input type="number" min="0" value={form.ratePagate} onChange={e=>setForm({...form,ratePagate:Number(e.target.value)})}/></label><label><span className="text-xs font-semibold">Rate totali</span><input type="number" min="0" value={form.rateTotali} onChange={e=>setForm({...form,rateTotali:Number(e.target.value)})}/></label></div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.rinnovoAutomatico} onChange={e=>setForm({...form,rinnovoAutomatico:e.target.checked})} className="!w-4 !h-4"/> Rinnovo automatico alla prossima cadenza</label>
          <div className="sm:col-span-2 flex gap-2 justify-end"><button type="button" className="btn" onClick={()=>setShowForm(false)}>Annulla</button><button className="btn btn-primary" disabled={saving}>{saving?'Salvataggio…':'Salva scadenza'}</button></div>
        </form>
      </div></div></div>}

      {confirmPay && <div className="fixed inset-0 overflow-y-auto bg-black/50 z-50 pt-[max(1rem,var(--safe-area-inset-top))] pb-6"><div className="min-h-full flex items-center justify-center px-3"><div className="bg-[var(--surface)] w-full max-w-[480px] rounded-[var(--radius)] p-5"><h3 className="font-display text-xl">Segna come Pagata?</h3><p className="text-sm mt-2"><b>{confirmPay.value.nome}</b> · {fmt(confirmPay.value.importo)} · scadenza {fmtData(confirmPay.value.scadenza)}</p>{confirmPay.value.cadenza!=='Una tantum' && <p className="text-sm mt-2 bg-[#FFF9C4] border border-[#E7D86B] rounded-xl p-3">Proposta di rinnovo: nuova scadenza il <b>{fmtData(addMonths(confirmPay.value.scadenza, confirmPay.value.cadenza==='Personalizzata'?(confirmPay.value.cadenzaMesi||1):CADENZA_MESI[confirmPay.value.cadenza]||0))}</b> ({confirmPay.value.cadenza}).{confirmPay.value.rinnovoAutomatico?' Rinnovo automatico attivo.':''}</p>}<div className="flex flex-wrap gap-2 mt-4 justify-end"><button className="btn" onClick={()=>setConfirmPay(null)}>Annulla</button><button className="btn" onClick={()=>segnaPagata(confirmPay,false)}>Solo Pagata</button>{confirmPay.value.cadenza!=='Una tantum' && <button className="btn btn-primary" onClick={()=>segnaPagata(confirmPay,true)}>Pagata + rinnovo <ArrowRight size={15}/></button>}</div></div></div></div>}
      {confirmDel && <div className="fixed inset-0 overflow-y-auto bg-black/50 z-50 pt-[max(1rem,var(--safe-area-inset-top))] pb-6"><div className="min-h-full flex items-center justify-center px-3"><div className="bg-[var(--surface)] w-full max-w-[440px] rounded-[var(--radius)] p-5"><h3 className="font-display text-xl flex gap-2"><AlertTriangle size={22}/> Eliminare?</h3><p className="text-sm mt-2">Vuoi eliminare <b>{confirmDel.value.nome}</b>? L’azione non si può annullare.</p><div className="flex gap-2 mt-4 justify-end"><button className="btn" onClick={()=>setConfirmDel(null)}>Annulla</button><button className="btn !bg-[#A83A2E] !text-white !border-[#A83A2E]" onClick={()=>elimina(confirmDel)}>Elimina</button></div></div></div></div>}

      <footer className="border-t border-[var(--line)] py-5 text-center text-xs text-[var(--muted)] px-4">Le Mie Scadenze Gestione · Filtro mese/anno, costi mese per mese e PDF seguono il periodo selezionato · Il giallo chiaro indica solo il mese corrente.</footer>
    </div>
  );
}
