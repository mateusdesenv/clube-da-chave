import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import {
  ArrowLeft, CalendarDays, ChevronRight, CircleUserRound, LayoutDashboard,
  LogOut, Menu, MoreHorizontal, Plus, Search, Settings, Trophy, Users,
  X, Pencil, Trash2, MapPin, Clock3, Check, Brackets, ArrowUp, ArrowDown, Shuffle,
  Download, Upload, Database, UserRound, FileJson, Crown
  , Play, Pause, ListChecks, Monitor, Printer,
  ClipboardCheck, AlertTriangle, Grid2X2, Save
} from 'lucide-react';
import { auth, firebaseReady, loginWithGoogle, logoutFromGoogle } from './firebase';
import './styles.css';

type Status = 'Inscrições abertas' | 'Em andamento' | 'Finalizado';
type Tournament = {
  id: string; name: string; start: string; end: string; format: string;
  status: Status; location: string; players: string[];
  rules?: { modality:string; raceTo:number; tiebreak:string; timeLimit:number };
  enrollments?: Record<string,'Convidado'|'Confirmado'|'Espera'|'Cancelado'|'Desclassificado'>;
  checkIns?: Record<string,string>;
  awards?: { position:string; description:string }[];
  theme?: { color:string; shortName:string };
};
type MatchStatus = 'Agendada'|'Chamada'|'Em andamento'|'Pausada'|'Concluída'|'W.O.'|'Cancelada';
type Match = { id: string; tournamentId: string; round: string; a: string; b: string; scoreA?: number; scoreB?: number; date: string; time: string; table: string; winner?: string; position?: number; status?:MatchStatus; notes?:string; startedAt?:string; finishedAt?:string };
type Player = { id:string; name:string; email:string; phone:string; club:string };
type User = { id:string; name:string; email:string; role:'Administrador'|'Organizador' };
type PoolTable = { id:string; name:string; status:'Livre'|'Em uso'|'Manutenção'; notes:string };
type AuditEvent = { id:string; at:string; type:string; message:string; tournamentId?:string; snapshot?:Partial<Store> };
type Store = { schemaVersion:number; tournaments: Tournament[]; matches: Match[]; players: Player[]; users: User[]; tables:PoolTable[]; events:AuditEvent[] };
type Page = 'dashboard' | 'tournaments' | 'participants' | 'settings' | 'detail';

const seed: Store = {
  schemaVersion: 2,
  users: [
    {id:'u1',name:'Ricardo Martins',email:'organizador@clube.app',role:'Administrador'},
    {id:'u2',name:'Marina Oliveira',email:'marina@clube.app',role:'Organizador'},
    {id:'u3',name:'Carlos Henrique',email:'carlos@clube.app',role:'Organizador'}
  ],
  players: [
    ['Lucas Almeida','lucas@exemplo.com','(11) 98888-1001','Clube Central'], ['Bruno Santos','bruno@exemplo.com','(11) 98888-1002','Arena Norte'],
    ['Rafael Lima','rafael@exemplo.com','(11) 98888-1003','Clube Central'], ['Diego Costa','diego@exemplo.com','(11) 98888-1004','Salão Vitória'],
    ['Marcos Rocha','marcos@exemplo.com','(11) 98888-1005','Arena Norte'], ['André Gomes','andre@exemplo.com','(11) 98888-1006','Clube Central'],
    ['Felipe Araújo','felipe@exemplo.com','(11) 98888-1007','Clube Central'], ['João Vitor','joao@exemplo.com','(11) 98888-1008','Salão Vitória'],
    ['Carlos Henrique','carlos@exemplo.com','(11) 98888-1009','Arena Norte'], ['Paulo Mendes','paulo@exemplo.com','(11) 98888-1010','Clube Central'],
    ['Tiago Ribeiro','tiago@exemplo.com','(11) 98888-1011','Arena Norte'], ['Renato Alves','renato@exemplo.com','(11) 98888-1012','Salão Vitória'],
    ['Gustavo Nunes','gustavo@exemplo.com','(11) 98888-1013','Clube Central'], ['Leonardo Braga','leonardo@exemplo.com','(11) 98888-1014','Arena Norte'],
    ['Eduardo Lima','eduardo@exemplo.com','(11) 98888-1015','Clube Central'], ['Matheus Silva','matheus@exemplo.com','(11) 98888-1016','Salão Vitória'],
    ['Vinícius Costa','vinicius@exemplo.com','(11) 98888-1017','Arena Norte'], ['Rodrigo Martins','rodrigo@exemplo.com','(11) 98888-1018','Clube Central']
  ].map((p,i)=>({id:`j${i+1}`,name:p[0],email:p[1],phone:p[2],club:p[3]})),
  tournaments: [
    { id: 'copa-paulista', name: 'Copa Paulista 2026', start: '2026-08-15', end: '2026-08-17', format: 'Mata-mata', status: 'Inscrições abertas', location: 'Clube Central', players: ['Lucas Almeida', 'Bruno Santos', 'Rafael Lima', 'Diego Costa', 'Marcos Rocha', 'André Gomes', 'Felipe Araújo', 'João Vitor'], rules:{modality:'8-Ball',raceTo:4,tiebreak:'Frame decisivo',timeLimit:60}, checkIns:{'Lucas Almeida':'2026-08-15T13:12','Bruno Santos':'2026-08-15T13:18'}, awards:[{position:'Campeão',description:'Troféu + R$ 1.000'},{position:'Vice',description:'Troféu + R$ 500'}], theme:{color:'#136c46',shortName:'Copa Paulista'} },
    { id: 'torneio-inverno', name: 'Torneio de Inverno', start: '2026-07-05', end: '2026-07-26', format: 'Mata-mata', status: 'Em andamento', location: 'Arena Norte', players: ['Carlos Henrique', 'Paulo Mendes', 'Tiago Ribeiro', 'Renato Alves'] },
    { id: 'liga-central', name: 'Liga do Clube Central', start: '2026-03-15', end: '2026-08-30', format: 'Pontos corridos', status: 'Em andamento', location: 'Clube Central', players: ['Gustavo Nunes', 'Leonardo Braga', 'Eduardo Lima', 'Matheus Silva', 'Vinícius Costa', 'Rodrigo Martins'] },
    { id: 'desafio-8-ball', name: 'Desafio 8-Ball', start: '2026-02-20', end: '2026-02-21', format: 'Mata-mata', status: 'Finalizado', location: 'Salão Vitória', players: ['Bruno Santos', 'Lucas Almeida', 'Diego Costa', 'Rafael Lima'] }
  ],
  matches: [
    { id:'m1', tournamentId:'copa-paulista', round:'Quartas de final', a:'Lucas Almeida', b:'Bruno Santos', scoreA:4, scoreB:2, date:'2026-08-15', time:'14:00', table:'Mesa 01',status:'Concluída',winner:'Lucas Almeida' },
    { id:'m2', tournamentId:'copa-paulista', round:'Quartas de final', a:'Rafael Lima', b:'Diego Costa', scoreA:4, scoreB:1, date:'2026-08-15', time:'16:00', table:'Mesa 02',status:'Concluída',winner:'Rafael Lima' },
    { id:'m3', tournamentId:'copa-paulista', round:'Semifinais', a:'Lucas Almeida', b:'Rafael Lima', date:'2026-08-16', time:'14:00', table:'Mesa 01' },
    { id:'m4', tournamentId:'copa-paulista', round:'Semifinais', a:'Marcos Rocha', b:'André Gomes', date:'2026-08-16', time:'16:00', table:'Mesa 02' }
  ],
  tables:[{id:'tb1',name:'Mesa 01',status:'Livre',notes:'Mesa principal'},{id:'tb2',name:'Mesa 02',status:'Em uso',notes:''},{id:'tb3',name:'Mesa 03',status:'Manutenção',notes:'Troca do pano'}],
  events:[{id:'ev1',at:'2026-07-24T09:00:00',type:'Sistema',message:'Base de demonstração criada.'}]
};

const STORAGE_KEY = 'clube-da-chave.app.v1';
const fmtDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${value}T12:00:00`));
const maskPhone = (value:string) => {
  const digits=value.replace(/\D/g,'').slice(0,11);
  if(!digits)return '';
  if(digits.length<=2)return `(${digits}`;
  const area=digits.slice(0,2);
  const number=digits.slice(2);
  if(number.length<=4)return `(${area}) ${number}`;
  if(digits.length<=10)return `(${area}) ${number.slice(0,4)}-${number.slice(4)}`;
  return `(${area}) ${number.slice(0,5)}-${number.slice(5)}`;
};
const normalizeEmail = (value:string) => value.replace(/\s/g,'').toLocaleLowerCase('pt-BR');
const uid = () => Math.random().toString(36).slice(2, 9);
const bracketRounds = ['Oitavas de final', 'Quartas de final', 'Semifinais', 'Final'];
const matchWinner = (match:Match) => match.winner || (match.scoreA!==undefined && match.scoreB!==undefined && match.scoreA!==match.scoreB ? (match.scoreA>match.scoreB?match.a:match.b) : undefined);

function migrateStore(value:Partial<Store>):Store {
  const tournaments = Array.isArray(value.tournaments) ? value.tournaments : seed.tournaments;
  const knownNames = Array.from(new Set(tournaments.flatMap(t=>t.players)));
  const players = Array.isArray(value.players) ? value.players : knownNames.map((name,i)=>({id:`migrado-${i}`,name,email:'',phone:'',club:''}));
  return {
    schemaVersion:2,
    tournaments:tournaments.map(t=>({...t,rules:t.rules||{modality:'8-Ball',raceTo:4,tiebreak:'Frame decisivo',timeLimit:60},enrollments:t.enrollments||Object.fromEntries(t.players.map(n=>[n,'Confirmado']))})),
    matches:(Array.isArray(value.matches) ? value.matches : seed.matches).map(m=>({...m,status:m.status||(m.scoreA!==undefined?'Concluída':'Agendada')})),
    players,
    users:Array.isArray(value.users) ? value.users : seed.users,
    tables:Array.isArray(value.tables) ? value.tables : seed.tables,
    events:Array.isArray(value.events) ? value.events : []
  };
}

function useStore(currentUser:FirebaseUser|null) {
  const [data, setData] = useState<Store>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as Partial<Store>;
      return migrateStore(saved);
    }
    catch { return seed; }
  });
  const [remoteReady,setRemoteReady]=useState(false);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);

  useEffect(()=>{
    if(!currentUser){setRemoteReady(false);return}
    let active=true;
    const hydrate=async()=>{
      try {
        const token=await currentUser.getIdToken();
        const headers={Authorization:`Bearer ${token}`};
        const response=await fetch('/api/data',{headers});
        if(!response.ok)throw new Error(`API ${response.status}`);
        const payload=await response.json() as {data?:Partial<Store>|null};
        if(!active)return;
        if(payload.data)setData(migrateStore(payload.data));
        else {
          const created=await fetch('/api/data',{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(data)});
          if(!created.ok)throw new Error(`API ${created.status}`);
        }
      }
      catch(error){console.warn('API indisponível; mantendo os dados deste navegador.',error)}
      finally{if(active)setRemoteReady(true)}
    };
    void hydrate();
    return()=>{active=false};
  },[currentUser]);

  useEffect(()=>{
    if(!remoteReady||!currentUser)return;
    const timeout=window.setTimeout(()=>{
      void currentUser.getIdToken().then(token=>fetch('/api/data',{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(data)}))
        .then(response=>{if(!response.ok)throw new Error(`API ${response.status}`)})
        .catch(error=>console.warn('Não foi possível sincronizar com o servidor.',error));
    },700);
    return()=>window.clearTimeout(timeout);
  },[data,remoteReady,currentUser]);

  return [data, setData] as const;
}

function Logo({ compact=false }: { compact?: boolean }) {
  return <div className="logo"><span className="logo-mark"><i/><i/><i/></span>{!compact && <strong>Clube da Chave</strong>}</div>;
}

function GoogleIcon() {
  return <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.86A6.02 6.02 0 0 1 6.07 12c0-.65.11-1.28.32-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z"/><path fill="#EA4335" d="M12 6.01c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6 12 6.01Z"/></svg>;
}

function Login({ onLogin }: { onLogin: () => Promise<void> }) {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const submit=async()=>{setLoading(true);setError('');try{await onLogin()}catch(reason){const code=typeof reason==='object'&&reason&&'code' in reason?String(reason.code):'';if(code!=='auth/popup-closed-by-user'&&code!=='auth/cancelled-popup-request')setError(code==='auth/unauthorized-domain'?'Este domínio ainda não foi autorizado no Firebase.':'Não foi possível entrar com o Google. Tente novamente.')}finally{setLoading(false)}};
  return <main className="login-page">
    <aside className="login-brand"><Logo/><p>Organize seus campeonatos<br/>em um só lugar.</p><small>Gestão simples, do início à final.</small></aside>
    <section className="login-panel"><div className="login-form">
      <div className="eyebrow">BEM-VINDO</div><h1>Acesse sua conta</h1><p className="muted">Entre com sua conta Google para organizar seus campeonatos.</p>
      <button className="google-button wide" type="button" onClick={()=>void submit()} disabled={loading||!firebaseReady}><GoogleIcon/><span>{loading?'Conectando…':'Continuar com Google'}</span></button>
      {error&&<p className="auth-error" role="alert">{error}</p>}
      {!firebaseReady&&<p className="auth-error" role="alert">A configuração do Firebase não foi encontrada.</p>}
      <p className="auth-note">Sua sessão ficará salva com segurança neste dispositivo.</p>
    </div></section>
  </main>;
}

const nav = [
  {id:'dashboard' as Page, label:'Início', icon:LayoutDashboard},
  {id:'tournaments' as Page, label:'Campeonatos', icon:Trophy},
  {id:'participants' as Page, label:'Participantes', icon:Users},
  {id:'settings' as Page, label:'Configurações', icon:Settings}
];

function Shell({ page, setPage, onLogout, currentUser, children }: { page:Page; setPage:(p:Page)=>void; onLogout:()=>void; currentUser:FirebaseUser; children:React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <aside className={`sidebar ${open?'open':''}`}><div className="side-top"><Logo/><button className="icon-button mobile-close" onClick={()=>setOpen(false)}><X/></button></div>
      <nav>{nav.map(n => <button key={n.id} className={(page===n.id || (page==='detail'&&n.id==='tournaments'))?'active':''} onClick={()=>{setPage(n.id);setOpen(false)}}><n.icon size={19}/><span>{n.label}</span></button>)}</nav>
      <div className="profile">{currentUser.photoURL?<img src={currentUser.photoURL} alt=""/>:<CircleUserRound/>}<div><strong>{currentUser.displayName||'Organizador'}</strong><span>{currentUser.email||'Conta Google'}</span></div><button className="icon-button" title="Sair" onClick={onLogout}><LogOut size={18}/></button></div>
    </aside>
    <div className="main"><header className="mobile-header"><button className="icon-button" onClick={()=>setOpen(true)}><Menu/></button><Logo compact/></header>{children}</div>
    {open && <button className="scrim" aria-label="Fechar menu" onClick={()=>setOpen(false)}/>} 
  </div>;
}

function Badge({ status }: { status:Status }) { return <span className={`badge ${status==='Em andamento'?'blue':status==='Finalizado'?'gray':''}`}><i/>{status}</span>; }

function Dashboard({ data, goTournaments, openTournament }: { data:Store; goTournaments:()=>void; openTournament:(id:string)=>void }) {
  const active = data.tournaments.filter(t=>t.status!=='Finalizado').length;
  const people = data.players.length;
  const next = data.matches.filter(m=>m.scoreA===undefined).slice(0,4);
  return <div className="page"><div className="page-head"><div><div className="eyebrow">QUARTA-FEIRA, 22 DE JULHO</div><h1>Visão geral</h1><p className="muted">Acompanhe seus campeonatos e próximos compromissos.</p></div><button className="primary" onClick={goTournaments}><Plus size={18}/> Criar campeonato</button></div>
    <div className="metrics"><article><span>Campeonatos ativos</span><strong>{active}</strong><Trophy/></article><article><span>Participantes</span><strong>{people}</strong><Users/></article><article><span>Partidas agendadas</span><strong>{next.length}</strong><CalendarDays/></article></div>
    <div className="dashboard-grid"><section className="card"><div className="card-head"><div><h2>Campeonatos recentes</h2><p>Últimos campeonatos criados</p></div><button className="link" onClick={goTournaments}>Ver todos <ChevronRight size={16}/></button></div>
      <div className="table-wrap"><table><thead><tr><th>Campeonato</th><th>Formato</th><th>Participantes</th><th>Status</th></tr></thead><tbody>{data.tournaments.slice(0,4).map(t=><tr key={t.id} onClick={()=>openTournament(t.id)}><td><strong>{t.name}</strong><small>{t.location}</small></td><td>{t.format}</td><td>{t.players.length}</td><td><Badge status={t.status}/></td></tr>)}</tbody></table></div></section>
      <section className="card events"><div className="card-head"><div><h2>Próximas partidas</h2><p>Agenda mais próxima</p></div></div>{next.length ? next.map(m=><article key={m.id}><div className="date-tile"><strong>{new Date(`${m.date}T12:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(`${m.date}T12:00`)).replace('.','')}</span></div><div><strong>{m.a} × {m.b}</strong><span><Clock3 size={13}/>{m.time} · {m.table}</span></div></article>) : <Empty text="Nenhuma partida agendada"/>}</section></div>
  </div>;
}

function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X/></button></div>{children}</section></div>; }

function TournamentForm({ initial, onSave, onClose }: { initial?:Tournament; onSave:(t:Tournament)=>void; onClose:()=>void }) {
  const [form, setForm] = useState<Tournament>(initial || {id:uid(),name:'',start:'2026-08-01',end:'2026-08-02',format:'Mata-mata',status:'Inscrições abertas',location:'',players:[]});
  const change = (key:keyof Tournament, value:string) => setForm({...form,[key]:value});
  return <Modal title={initial?'Editar campeonato':'Novo campeonato'} onClose={onClose}><form className="form-grid" onSubmit={e=>{e.preventDefault();onSave(form)}}><label className="full">Nome do campeonato<input required value={form.name} onChange={e=>change('name',e.target.value)} placeholder="Ex.: Copa Regional 2026"/></label><label>Data inicial<input type="date" required value={form.start} onChange={e=>change('start',e.target.value)}/></label><label>Data final<input type="date" required value={form.end} onChange={e=>change('end',e.target.value)}/></label><label>Formato<select value={form.format} onChange={e=>change('format',e.target.value)}><option>Mata-mata</option><option>Pontos corridos</option><option>Fase de grupos</option></select></label><label>Status<select value={form.status} onChange={e=>change('status',e.target.value as Status)}><option>Inscrições abertas</option><option>Em andamento</option><option>Finalizado</option></select></label><label className="full">Local<input required value={form.location} onChange={e=>change('location',e.target.value)} placeholder="Clube ou salão"/></label><div className="modal-actions full"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary">Salvar campeonato</button></div></form></Modal>;
}

function Tournaments({ data, setData, openTournament, startCreate=false }: { data:Store; setData:React.Dispatch<React.SetStateAction<Store>>; openTournament:(id:string)=>void; startCreate?:boolean }) {
  const [query,setQuery]=useState(''); const [filter,setFilter]=useState<'Todos'|Status>('Todos'); const [editing,setEditing]=useState<Tournament|null|undefined>(startCreate?null:undefined); const [menu,setMenu]=useState<string>();
  const list=data.tournaments.filter(t=>(filter==='Todos'||t.status===filter)&&t.name.toLowerCase().includes(query.toLowerCase()));
  const save=(item:Tournament)=>{setData(d=>({...d,tournaments:d.tournaments.some(t=>t.id===item.id)?d.tournaments.map(t=>t.id===item.id?item:t):[item,...d.tournaments]}));setEditing(undefined)};
  const remove=(id:string)=>{if(confirm('Excluir este campeonato?'))setData(d=>({...d,tournaments:d.tournaments.filter(t=>t.id!==id),matches:d.matches.filter(m=>m.tournamentId!==id)}));setMenu(undefined)};
  return <div className="page"><div className="page-head"><div><div className="eyebrow">ORGANIZAÇÃO</div><h1>Campeonatos</h1><p className="muted">Crie e acompanhe todos os seus campeonatos.</p></div><button className="primary" onClick={()=>setEditing(null)}><Plus size={18}/> Novo campeonato</button></div>
    <div className="toolbar"><div className="filters">{(['Todos','Inscrições abertas','Em andamento','Finalizado'] as const).map(f=><button className={filter===f?'selected':''} onClick={()=>setFilter(f)} key={f}>{f}</button>)}</div><label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar campeonato"/></label></div>
    <section className="card table-card"><div className="table-wrap"><table><thead><tr><th>Campeonato</th><th>Período</th><th>Formato</th><th>Participantes</th><th>Status</th><th/></tr></thead><tbody>{list.map(t=><tr key={t.id}><td onClick={()=>openTournament(t.id)}><strong>{t.name}</strong><small><MapPin size={12}/>{t.location}</small></td><td onClick={()=>openTournament(t.id)}>{fmtDate(t.start)} — {fmtDate(t.end)}</td><td>{t.format}</td><td>{t.players.length}</td><td><Badge status={t.status}/></td><td className="actions"><button className="icon-button" onClick={()=>setMenu(menu===t.id?undefined:t.id)}><MoreHorizontal/></button>{menu===t.id&&<div className="action-menu"><button onClick={()=>{setEditing(t);setMenu(undefined)}}><Pencil/>Editar</button><button className="danger" onClick={()=>remove(t.id)}><Trash2/>Excluir</button></div>}</td></tr>)}</tbody></table>{!list.length&&<Empty text="Nenhum campeonato encontrado"/>}</div><div className="table-footer">Mostrando {list.length} de {data.tournaments.length} campeonatos</div></section>
    {editing!==undefined&&<TournamentForm initial={editing||undefined} onSave={save} onClose={()=>setEditing(undefined)}/>}</div>;
}

function Empty({text}:{text:string}) { return <div className="empty"><Brackets/><strong>{text}</strong><span>As informações aparecerão aqui.</span></div>; }

function MatchForm({match,tables,onSave,onClose}:{match:Match;tables:PoolTable[];onSave:(m:Match)=>void;onClose:()=>void}) {
  const [form,setForm]=useState<Match>({...match,status:match.status||'Agendada'});
  const update=<K extends keyof Match>(key:K,value:Match[K])=>setForm(current=>({...current,[key]:value}));
  const finish=(status:MatchStatus)=>{
    const winner=form.scoreA===form.scoreB?undefined:(form.scoreA||0)>(form.scoreB||0)?form.a:form.b;
    setForm(current=>({...current,status,winner:status==='Concluída'?winner:current.winner,finishedAt:['Concluída','W.O.'].includes(status)?new Date().toISOString():current.finishedAt}));
  };
  return <Modal title="Operar partida" onClose={onClose}><form className="match-form" onSubmit={e=>{e.preventDefault();onSave(form)}}>
    <div className="versus"><div><span>{form.a||'A definir'}</span><input aria-label={`Placar de ${form.a}`} min="0" type="number" value={form.scoreA??0} onChange={e=>update('scoreA',Number(e.target.value))}/></div><strong>×</strong><div><span>{form.b||'A definir'}</span><input aria-label={`Placar de ${form.b}`} min="0" type="number" value={form.scoreB??0} onChange={e=>update('scoreB',Number(e.target.value))}/></div></div>
    <div className="status-actions"><button type="button" onClick={()=>update('status','Chamada')}><ListChecks/>Chamar</button><button type="button" onClick={()=>setForm(c=>({...c,status:'Em andamento',startedAt:c.startedAt||new Date().toISOString()}))}><Play/>Iniciar</button><button type="button" onClick={()=>update('status','Pausada')}><Pause/>Pausar</button><button type="button" onClick={()=>finish('Concluída')}><Check/>Concluir</button></div>
    <div className="form-grid compact"><label>Data<input type="date" value={form.date} onChange={e=>update('date',e.target.value)}/></label><label>Horário<input type="time" value={form.time} onChange={e=>update('time',e.target.value)}/></label><label>Mesa<select value={form.table} onChange={e=>update('table',e.target.value)}>{tables.map(t=><option key={t.id}>{t.name}</option>)}</select></label><label>Status<select value={form.status} onChange={e=>update('status',e.target.value as MatchStatus)}>{(['Agendada','Chamada','Em andamento','Pausada','Concluída','W.O.','Cancelada'] as MatchStatus[]).map(s=><option key={s}>{s}</option>)}</select></label><label className="full">Observações<input value={form.notes||''} onChange={e=>update('notes',e.target.value)} placeholder="Ocorrências e decisões da organização"/></label></div>
    <div className="wo-row"><span>Avanço excepcional</span><button type="button" onClick={()=>setForm(c=>({...c,status:'W.O.',winner:c.a,finishedAt:new Date().toISOString()}))}>W.O. para {form.a}</button><button type="button" onClick={()=>setForm(c=>({...c,status:'W.O.',winner:c.b,finishedAt:new Date().toISOString()}))}>W.O. para {form.b}</button></div>
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary"><Save size={16}/> Salvar partida</button></div>
  </form></Modal>;
}

function RulesForm({item,onSave,onClose}:{item:Tournament;onSave:(t:Tournament)=>void;onClose:()=>void}) {
  const [rules,setRules]=useState(item.rules||{modality:'8-Ball',raceTo:4,tiebreak:'Frame decisivo',timeLimit:60});
  return <Modal title="Regras do campeonato" onClose={onClose}><form className="form-grid" onSubmit={e=>{e.preventDefault();onSave({...item,rules})}}><label>Modalidade<select value={rules.modality} onChange={e=>setRules({...rules,modality:e.target.value})}><option>8-Ball</option><option>9-Ball</option><option>Sinuquinha</option><option>Sinuca brasileira</option></select></label><label>Melhor até<input type="number" min="1" value={rules.raceTo} onChange={e=>setRules({...rules,raceTo:Number(e.target.value)})}/></label><label>Desempate<input value={rules.tiebreak} onChange={e=>setRules({...rules,tiebreak:e.target.value})}/></label><label>Limite (min)<input type="number" min="0" value={rules.timeLimit} onChange={e=>setRules({...rules,timeLimit:Number(e.target.value)})}/></label><div className="modal-actions full"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary">Salvar regras</button></div></form></Modal>;
}

function TableManager({tables,setData}:{tables:PoolTable[];setData:React.Dispatch<React.SetStateAction<Store>>}) {
  const add=()=>setData(d=>({...d,tables:[...d.tables,{id:uid(),name:`Mesa ${String(d.tables.length+1).padStart(2,'0')}`,status:'Livre',notes:''}]}));
  return <section className="card table-manager"><div className="card-head"><div><h2>Mesas do evento</h2><p>Disponibilidade e observações operacionais</p></div><button className="secondary" onClick={add}><Plus size={16}/>Adicionar mesa</button></div><div className="table-grid">{tables.map(table=><article key={table.id}><Grid2X2/><input aria-label="Nome da mesa" value={table.name} onChange={e=>setData(d=>({...d,tables:d.tables.map(t=>t.id===table.id?{...t,name:e.target.value}:t)}))}/><select value={table.status} onChange={e=>setData(d=>({...d,tables:d.tables.map(t=>t.id===table.id?{...t,status:e.target.value as PoolTable['status']}:t)}))}><option>Livre</option><option>Em uso</option><option>Manutenção</option></select><button className="icon-button danger" onClick={()=>setData(d=>({...d,tables:d.tables.filter(t=>t.id!==table.id)}))}><Trash2 size={16}/></button></article>)}</div></section>;
}

function Detail({ item, data, setData, back }: { item:Tournament; data:Store; setData:React.Dispatch<React.SetStateAction<Store>>; back:()=>void }) {
  const [tab,setTab]=useState<'bracket'|'schedule'|'players'|'overview'|'ranking'|'public'>('overview'); const [adding,setAdding]=useState(false); const [selectedPlayers,setSelectedPlayers]=useState<string[]>(item.players); const [editingMatch,setEditingMatch]=useState<Match>(); const [editingRules,setEditingRules]=useState(false);
  const matches=data.matches.filter(m=>m.tournamentId===item.id);
  const removePlayer=(p:string)=>setData(d=>({...d,tournaments:d.tournaments.map(t=>t.id===item.id?{...t,players:t.players.filter(x=>x!==p)}:t)}));
  const movePlayer=(index:number,direction:-1|1)=>setData(d=>({...d,tournaments:d.tournaments.map(t=>{if(t.id!==item.id)return t;const players=[...t.players];const target=index+direction;if(target<0||target>=players.length)return t;[players[index],players[target]]=[players[target],players[index]];return {...t,players}})}));
  const saveAssociations=()=>{setData(d=>({...d,tournaments:d.tournaments.map(t=>t.id===item.id?{...t,players:selectedPlayers}:t)}));setAdding(false)};
  const generateBracket=()=>{if(item.players.length<2){alert('Associe pelo menos dois jogadores antes de gerar o chaveamento.');return}const names=[...item.players];const round=names.length<=2?'Final':names.length<=4?'Semifinais':names.length<=8?'Quartas de final':'Oitavas de final';const generated:Match[]=[];for(let i=0;i<names.length;i+=2){if(!names[i+1])continue;generated.push({id:uid(),tournamentId:item.id,round,a:names[i],b:names[i+1],position:generated.length,date:item.start,time:`${String(14+Math.floor(i/2)).padStart(2,'0')}:00`,table:`Mesa ${String((i/2)+1).padStart(2,'0')}`})}setData(d=>({...d,matches:[...d.matches.filter(m=>m.tournamentId!==item.id),...generated]}));};
  const advancePlayer=(matchId:string,winner:string)=>setData(d=>{
    const tournamentMatches=d.matches.filter(m=>m.tournamentId===item.id).map(m=>m.id===matchId?{...m,winner}:m);
    const selected=tournamentMatches.find(m=>m.id===matchId);
    if(!selected)return d;
    for(let roundIndex=bracketRounds.indexOf(selected.round);roundIndex<bracketRounds.length-1;roundIndex++){
      const current=tournamentMatches.filter(m=>m.round===bracketRounds[roundIndex]).sort((a,b)=>(a.position??tournamentMatches.indexOf(a))-(b.position??tournamentMatches.indexOf(b)));
      if(!current.length)break;
      const nextRound=bracketRounds[roundIndex+1];
      for(let position=0;position<Math.ceil(current.length/2);position++){
        const a=matchWinner(current[position*2])||'';
        const b=current[position*2+1]?matchWinner(current[position*2+1])||'':'';
        if(!a&&!b)continue;
        const nextMatches=tournamentMatches.filter(m=>m.round===nextRound);
        const existing=nextMatches.find(m=>m.position===position)||nextMatches[position];
        if(existing){
          const changed=existing.a!==a||existing.b!==b;
          Object.assign(existing,{a,b,position,...(changed?{winner:undefined,scoreA:undefined,scoreB:undefined}:{})});
        }else{
          tournamentMatches.push({id:uid(),tournamentId:item.id,round:nextRound,a,b,position,date:item.start,time:`${String(14+position).padStart(2,'0')}:00`,table:`Mesa ${String(position+1).padStart(2,'0')}`});
        }
      }
    }
    return {...d,matches:[...d.matches.filter(m=>m.tournamentId!==item.id),...tournamentMatches]};
  });
  const log=(message:string,type='Alteração')=>setData(d=>({...d,events:[{id:uid(),at:new Date().toISOString(),type,message,tournamentId:item.id},...d.events].slice(0,100)}));
  const saveTournament=(next:Tournament)=>{setData(d=>({...d,tournaments:d.tournaments.map(t=>t.id===next.id?next:t)}));log('Regras do campeonato atualizadas.');setEditingRules(false)};
  const saveMatch=(next:Match)=>{setData(d=>({...d,matches:d.matches.map(m=>m.id===next.id?next:m),events:[{id:uid(),at:new Date().toISOString(),type:'Partida',message:`${next.a} × ${next.b}: ${next.status}`,tournamentId:item.id},...d.events].slice(0,100)}));if(next.winner)advancePlayer(next.id,next.winner);setEditingMatch(undefined)};
  const checkIn=(name:string)=>setData(d=>({...d,tournaments:d.tournaments.map(t=>t.id===item.id?{...t,checkIns:{...t.checkIns,[name]:t.checkIns?.[name]?'':new Date().toISOString()}}:t),events:[{id:uid(),at:new Date().toISOString(),type:'Check-in',message:`Check-in de ${name} alterado.`,tournamentId:item.id},...d.events]}));
  const completed=matches.filter(m=>m.status==='Concluída'||m.status==='W.O.').length;
  return <div className="page detail-page" style={{'--event-color':item.theme?.color||'#136c46'} as React.CSSProperties}><button className="back" onClick={back}><ArrowLeft size={17}/> Campeonatos</button><div className="page-head"><div><h1>{item.name}</h1><div className="subline"><Badge status={item.status}/><span><MapPin size={14}/>{item.location}</span><span><CalendarDays size={14}/>{fmtDate(item.start)} — {fmtDate(item.end)}</span></div></div><div className="head-actions"><button className="secondary" onClick={()=>setEditingRules(true)}><Settings size={17}/> Regras</button><button className="secondary" onClick={generateBracket}><Shuffle size={17}/> Gerar chaveamento</button><button className="primary" onClick={()=>{setSelectedPlayers(item.players);setAdding(true)}}><Plus size={18}/> Associar jogadores</button></div></div>
    <div className="tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Operação</button><button className={tab==='bracket'?'active':''} onClick={()=>setTab('bracket')}>Chaveamento</button><button className={tab==='schedule'?'active':''} onClick={()=>setTab('schedule')}>Agenda</button><button className={tab==='players'?'active':''} onClick={()=>setTab('players')}>Inscrições <span>{item.players.length}</span></button><button className={tab==='ranking'?'active':''} onClick={()=>setTab('ranking')}>Ranking</button><button className={tab==='public'?'active':''} onClick={()=>setTab('public')}>Modo público</button></div>
    {tab==='overview'&&<div className="operation-grid"><section className="operation-metrics"><article><span>Progresso</span><strong>{matches.length?Math.round(completed/matches.length*100):0}%</strong><div className="progress"><i style={{width:`${matches.length?completed/matches.length*100:0}%`}}/></div></article><article><span>Em andamento</span><strong>{matches.filter(m=>m.status==='Em andamento').length}</strong><Play/></article><article><span>Mesas livres</span><strong>{data.tables.filter(t=>t.status==='Livre').length}</strong><Grid2X2/></article><article><span>Check-ins</span><strong>{Object.values(item.checkIns||{}).filter(Boolean).length}/{item.players.length}</strong><ClipboardCheck/></article></section><TableManager tables={data.tables} setData={setData}/><section className="card event-log"><div className="card-head"><div><h2>Histórico local</h2><p>Últimas ações críticas deste campeonato</p></div></div>{data.events.filter(e=>e.tournamentId===item.id).slice(0,8).map(e=><article key={e.id}><span>{e.type}</span><div><strong>{e.message}</strong><small>{new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(e.at))}</small></div></article>)}</section></div>}
    {tab==='bracket'&&<Bracket matches={matches} onAdvance={advancePlayer}/>} {tab==='schedule'&&<Schedule matches={matches} onEdit={setEditingMatch}/>} {tab==='ranking'&&<Ranking matches={matches} players={item.players}/>} {tab==='public'&&<PublicView item={item} matches={matches}/>} {tab==='players'&&<section className="card player-list"><div className="card-head"><div><h2>Inscrições e check-in</h2><p>A ordem define o seeding do chaveamento</p></div></div>{item.players.length?item.players.map((p,i)=><article key={p}><span className="seed-number">{i+1}</span><span className="avatar">{p.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><div><strong>{p}</strong><small>{item.enrollments?.[p]||'Confirmado'} · {data.players.find(x=>x.name===p)?.club||'Sem clube informado'}</small></div><button className={`checkin ${item.checkIns?.[p]?'checked':''}`} onClick={()=>checkIn(p)}><Check size={14}/>{item.checkIns?.[p]?'Presente':'Fazer check-in'}</button><div className="order-actions"><button className="icon-button" disabled={i===0} onClick={()=>movePlayer(i,-1)} title="Subir"><ArrowUp size={16}/></button><button className="icon-button" disabled={i===item.players.length-1} onClick={()=>movePlayer(i,1)} title="Descer"><ArrowDown size={16}/></button><button className="icon-button danger" onClick={()=>removePlayer(p)} title="Remover"><Trash2 size={17}/></button></div></article>):<Empty text="Nenhum jogador associado"/>}</section>}
    {adding&&<Modal title="Associar jogadores" onClose={()=>setAdding(false)}><p className="modal-copy">Selecione os jogadores que participarão deste campeonato.</p><div className="association-list">{data.players.map(p=><label key={p.id}><input type="checkbox" checked={selectedPlayers.includes(p.name)} onChange={e=>setSelectedPlayers(current=>e.target.checked?[...current,p.name]:current.filter(x=>x!==p.name))}/><span className="avatar">{p.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><span><strong>{p.name}</strong><small>{p.club||'Sem clube informado'}</small></span></label>)}</div><div className="modal-actions"><span className="selection-count">{selectedPlayers.length} selecionado(s)</span><button type="button" className="secondary" onClick={()=>setAdding(false)}>Cancelar</button><button className="primary" onClick={saveAssociations}>Salvar associações</button></div></Modal>}
    {editingMatch&&<MatchForm match={editingMatch} tables={data.tables} onSave={saveMatch} onClose={()=>setEditingMatch(undefined)}/>}
    {editingRules&&<RulesForm item={item} onSave={saveTournament} onClose={()=>setEditingRules(false)}/>}
  </div>;
}

function Bracket({matches,onAdvance}:{matches:Match[];onAdvance:(matchId:string,winner:string)=>void}) {
  const firstRound=bracketRounds.find(round=>matches.some(m=>m.round===round))||'Quartas de final';
  const rounds=bracketRounds.slice(bracketRounds.indexOf(firstRound));
  const final=matches.find(m=>m.round==='Final');
  const champion=final&&matchWinner(final);
  return <div className="bracket-area">{champion&&<section className="champion-banner"><span><Crown size={22}/></span><div><small>CAMPEÃO</small><strong>{champion}</strong></div></section>}<div className="bracket-tip"><Check size={16}/><span>Clique no jogador que avançou. Você pode alterar a escolha a qualquer momento.</span></div><section className="card bracket"><div className="bracket-scroll" style={{gridTemplateColumns:`repeat(${rounds.length}, minmax(220px, 1fr))`,minWidth:`${rounds.length*270}px`}}>{rounds.map((round,ri)=><div className={`round round-${ri}`} key={round}><h3>{round}</h3><div className="round-matches">{matches.filter(m=>m.round===round).length?matches.filter(m=>m.round===round).sort((a,b)=>(a.position??matches.indexOf(a))-(b.position??matches.indexOf(b))).map(m=>{const winner=matchWinner(m);return <article className="match" key={m.id}>{([['a','scoreA'],['b','scoreB']] as const).map(([playerKey,scoreKey])=>{const player=m[playerKey];const advanced=winner===player;return <button type="button" disabled={!player} className={advanced?'winner':''} onClick={()=>onAdvance(m.id,player)} key={playerKey}><span>{player||'A definir'}</span><strong>{advanced?<><Check size={14}/> Avançou</>:m[scoreKey]??'—'}</strong></button>})}</article>}):<article className="match placeholder"><span>A definir</span></article>}</div></div>)}</div></section></div>;
}

function Schedule({matches,onEdit}:{matches:Match[];onEdit:(m:Match)=>void}) {
  const conflicts=new Set(matches.filter((m,i)=>matches.some((other,j)=>i!==j&&m.date===other.date&&m.time===other.time&&(m.table===other.table||m.a===other.a||m.a===other.b||m.b===other.a||m.b===other.b))).map(m=>m.id));
  return <section className="card schedule"><div className="card-head"><div><h2>Agenda de partidas</h2><p>Horários, mesas e conflitos operacionais</p></div><button className="secondary" onClick={()=>window.print()}><Printer size={16}/>Imprimir</button></div>{matches.length?matches.sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).map(m=><article key={m.id} className={conflicts.has(m.id)?'has-conflict':''}><div className="date-tile"><strong>{new Date(`${m.date}T12:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(`${m.date}T12:00`))}</span></div><div className="schedule-main"><small>{m.round}</small><strong>{m.a} <span>×</span> {m.b}</strong>{conflicts.has(m.id)&&<em><AlertTriangle size={12}/>Conflito de horário ou mesa</em>}</div><span><Clock3 size={15}/>{m.time}</span><span>{m.table}</span><span className={`match-status status-${(m.status||'Agendada').replaceAll(' ','-')}`}>{m.status||'Agendada'}</span><button className="icon-button" onClick={()=>onEdit(m)} title="Operar partida"><Pencil size={16}/></button></article>):<Empty text="Nenhuma partida agendada"/>}</section>;
}

function Ranking({matches,players}:{matches:Match[];players:string[]}) {
  const rows=players.map(name=>{const played=matches.filter(m=>(m.status==='Concluída'||m.status==='W.O.')&&(m.a===name||m.b===name));const wins=played.filter(m=>matchWinner(m)===name).length;const scored=played.reduce((n,m)=>n+(m.a===name?(m.scoreA||0):(m.scoreB||0)),0);const conceded=played.reduce((n,m)=>n+(m.a===name?(m.scoreB||0):(m.scoreA||0)),0);return {name,played:played.length,wins,losses:played.length-wins,scored,conceded}}).sort((a,b)=>b.wins-a.wins||(b.scored-b.conceded)-(a.scored-a.conceded));
  return <section className="card ranking-card"><div className="card-head"><div><h2>Ranking e estatísticas</h2><p>Resultados calculados localmente a partir das partidas concluídas</p></div><button className="secondary" onClick={()=>window.print()}><Printer size={16}/>Imprimir</button></div><div className="table-wrap"><table><thead><tr><th>#</th><th>Jogador</th><th>J</th><th>V</th><th>D</th><th>Pró</th><th>Contra</th><th>Aproveitamento</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.name}><td>{i+1}</td><td><strong>{r.name}</strong></td><td>{r.played}</td><td>{r.wins}</td><td>{r.losses}</td><td>{r.scored}</td><td>{r.conceded}</td><td>{r.played?Math.round(r.wins/r.played*100):0}%</td></tr>)}</tbody></table></div></section>;
}

function PublicView({item,matches}:{item:Tournament;matches:Match[]}) {
  const current=matches.filter(m=>m.status==='Em andamento'||m.status==='Chamada');const next=matches.filter(m=>!m.status||m.status==='Agendada').slice(0,4);const final=matches.find(m=>m.round==='Final');const champion=final&&matchWinner(final);
  return <section className="public-view"><header><Logo/><div><small>ACOMPANHAMENTO LOCAL</small><h2>{item.theme?.shortName||item.name}</h2></div><button className="secondary" onClick={()=>document.documentElement.requestFullscreen?.()}><Monitor size={16}/>Tela cheia</button></header>{champion&&<div className="public-champion"><Crown/><span>Campeão</span><strong>{champion}</strong></div>}<div className="public-grid"><section><h3>Agora nas mesas</h3>{current.length?current.map(m=><article key={m.id}><span>{m.table}</span><strong>{m.a} <b>{m.scoreA??0}</b> × <b>{m.scoreB??0}</b> {m.b}</strong><small>{m.status}</small></article>):<Empty text="Nenhuma partida em andamento"/>}</section><section><h3>Próximas partidas</h3>{next.map(m=><article key={m.id}><span>{m.time} · {m.table}</span><strong>{m.a} × {m.b}</strong><small>{m.round}</small></article>)}</section></div></section>;
}

function PlayerForm({initial,onSave,onClose}:{initial?:Player;onSave:(p:Player)=>void;onClose:()=>void}) {
  const [form,setForm]=useState<Player>(initial?{...initial,email:normalizeEmail(initial.email),phone:maskPhone(initial.phone)}:{id:uid(),name:'',email:'',phone:'',club:''});
  const change=(key:keyof Player,value:string)=>setForm({...form,[key]:value});
  return <Modal title={initial?'Editar jogador':'Novo jogador'} onClose={onClose}><form className="form-grid" onSubmit={e=>{e.preventDefault();onSave({...form,email:normalizeEmail(form.email),phone:maskPhone(form.phone)})}}>
    <label className="full">Nome completo<input required autoComplete="name" value={form.name} onChange={e=>change('name',e.target.value)} placeholder="Nome do jogador"/></label>
    <label>E-mail<input type="email" inputMode="email" autoComplete="email" value={form.email} onChange={e=>change('email',normalizeEmail(e.target.value))} placeholder="jogador@email.com"/></label>
    <label>Telefone<input type="tel" inputMode="tel" autoComplete="tel-national" maxLength={15} pattern="\(\d{2}\) \d{4,5}-\d{4}" title="Informe o DDD e um telefone com 8 ou 9 dígitos" value={form.phone} onChange={e=>change('phone',maskPhone(e.target.value))} placeholder="(11) 99999-9999"/></label>
    <label className="full">Clube<input value={form.club} onChange={e=>change('club',e.target.value)} placeholder="Clube ou salão"/></label>
    <div className="modal-actions full"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary">Salvar jogador</button></div>
  </form></Modal>;
}

function Participants({data,setData}:{data:Store;setData:React.Dispatch<React.SetStateAction<Store>>}) { const [editing,setEditing]=useState<Player|null|undefined>();const [query,setQuery]=useState('');const list=useMemo(()=>data.players.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())||p.club.toLowerCase().includes(query.toLowerCase())),[data.players,query]);const save=(player:Player)=>{setData(d=>{const old=d.players.find(p=>p.id===player.id);return {...d,players:old?d.players.map(p=>p.id===player.id?player:p):[player,...d.players],tournaments:old&&old.name!==player.name?d.tournaments.map(t=>({...t,players:t.players.map(n=>n===old.name?player.name:n)})):d.tournaments,matches:old&&old.name!==player.name?d.matches.map(m=>({...m,a:m.a===old.name?player.name:m.a,b:m.b===old.name?player.name:m.b})):d.matches}});setEditing(undefined)};const remove=(player:Player)=>{if(!confirm(`Excluir ${player.name}?`))return;setData(d=>({...d,players:d.players.filter(p=>p.id!==player.id),tournaments:d.tournaments.map(t=>({...t,players:t.players.filter(n=>n!==player.name)})),matches:d.matches.filter(m=>m.a!==player.name&&m.b!==player.name)}))};return <div className="page"><div className="page-head"><div><div className="eyebrow">CADASTROS</div><h1>Jogadores</h1><p className="muted">Cadastre os jogadores antes de associá-los aos campeonatos.</p></div><button className="primary" onClick={()=>setEditing(null)}><Plus size={18}/> Novo jogador</button></div><div className="toolbar player-toolbar"><label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nome ou clube"/></label><span>{data.players.length} jogador(es) cadastrados</span></div><section className="card player-table"><div className="table-wrap"><table><thead><tr><th>Jogador</th><th>Contato</th><th>Clube</th><th>Campeonatos</th><th/></tr></thead><tbody>{list.map(p=><tr key={p.id}><td><div className="player-cell"><span className="avatar">{p.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><strong>{p.name}</strong></div></td><td><span>{p.email||'—'}</span><small>{p.phone||'Sem telefone'}</small></td><td>{p.club||'—'}</td><td>{data.tournaments.filter(t=>t.players.includes(p.name)).length}</td><td><div className="inline-actions"><button className="icon-button" onClick={()=>setEditing(p)} title="Editar"><Pencil size={16}/></button><button className="icon-button danger" onClick={()=>remove(p)} title="Excluir"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!list.length&&<Empty text="Nenhum jogador encontrado"/>}</div></section>{editing!==undefined&&<PlayerForm initial={editing||undefined} onSave={save} onClose={()=>setEditing(undefined)}/>}</div>; }

type DomainKey = 'users'|'players'|'tournaments'|'matches'|'tables'|'events';
type DomainItem = User|Player|Tournament|Match|PoolTable|AuditEvent;

const downloadJson = (filename:string,value:unknown) => { const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();URL.revokeObjectURL(url) };
const domainMeta:Record<DomainKey,{label:string;description:string;icon:React.ComponentType<{size?:number}>}> = {
  users:{label:'Usuários',description:'Contas administrativas e organizadores.',icon:UserRound},
  players:{label:'Jogadores',description:'Cadastros disponíveis para inscrição.',icon:Users},
  tournaments:{label:'Campeonatos',description:'Competições, períodos e participantes.',icon:Trophy},
  matches:{label:'Partidas',description:'Confrontos, horários, mesas e resultados.',icon:Brackets},
  tables:{label:'Mesas',description:'Mesas e disponibilidade operacional.',icon:Grid2X2},
  events:{label:'Histórico',description:'Log local das ações críticas.',icon:ListChecks}
};

function SettingsPage({data,setData,reset}:{data:Store;setData:React.Dispatch<React.SetStateAction<Store>>;reset:()=>void}) {
  const [openDomain,setOpenDomain]=useState<DomainKey|null>('users'); const [notice,setNotice]=useState('');
  const labelFor=(key:DomainKey,item:DomainItem)=>key==='users'||key==='players'||key==='tables'?(item as User|Player|PoolTable).name:key==='tournaments'?(item as Tournament).name:key==='events'?(item as AuditEvent).message:`${(item as Match).a} × ${(item as Match).b}`;
  const detailFor=(key:DomainKey,item:DomainItem)=>key==='users'?`${(item as User).email} · ${(item as User).role}`:key==='players'?`${(item as Player).club||'Sem clube'} · ${(item as Player).email||'Sem e-mail'}`:key==='tournaments'?`${(item as Tournament).format} · ${(item as Tournament).status}`:key==='tables'?`${(item as PoolTable).status} · ${(item as PoolTable).notes||'Sem observações'}`:key==='events'?`${(item as AuditEvent).type} · ${new Date((item as AuditEvent).at).toLocaleString('pt-BR')}`:`${(item as Match).round} · ${(item as Match).date} às ${(item as Match).time}`;
  const exportDomain=(key:DomainKey)=>downloadJson(`clube-da-chave-${key}.json`,{domain:key,exportedAt:new Date().toISOString(),data:data[key]});
  const exportItem=(key:DomainKey,item:DomainItem)=>downloadJson(`clube-da-chave-${key}-${item.id}.json`,{domain:key,exportedAt:new Date().toISOString(),data:[item]});
  const removeItems=(key:DomainKey,ids:string[])=>setData(current=>{if(key==='users')return {...current,users:current.users.filter(x=>!ids.includes(x.id))};if(key==='matches')return {...current,matches:current.matches.filter(x=>!ids.includes(x.id))};if(key==='tables')return {...current,tables:current.tables.filter(x=>!ids.includes(x.id))};if(key==='events')return {...current,events:current.events.filter(x=>!ids.includes(x.id))};if(key==='tournaments')return {...current,tournaments:current.tournaments.filter(x=>!ids.includes(x.id)),matches:current.matches.filter(x=>!ids.includes(x.tournamentId))};const removedNames=current.players.filter(x=>ids.includes(x.id)).map(x=>x.name);return {...current,players:current.players.filter(x=>!ids.includes(x.id)),tournaments:current.tournaments.map(t=>({...t,players:t.players.filter(n=>!removedNames.includes(n))})),matches:current.matches.filter(m=>!removedNames.includes(m.a)&&!removedNames.includes(m.b))}});
  const removeOne=(key:DomainKey,item:DomainItem)=>{if(confirm(`Apagar “${labelFor(key,item)}”? Esta ação não pode ser desfeita.`)){removeItems(key,[item.id]);setNotice('Registro apagado com sucesso.')}};
  const removeAll=(key:DomainKey)=>{if(confirm(`Apagar todos os registros de ${domainMeta[key].label.toLowerCase()}? Dados relacionados também poderão ser removidos.`)){removeItems(key,data[key].map(x=>x.id));setNotice(`${domainMeta[key].label} apagados.`)}};
  const importDomain=async(key:DomainKey,file:File)=>{try{const parsed=JSON.parse(await file.text()) as unknown;const payload=Array.isArray(parsed)?parsed:(parsed&&typeof parsed==='object'&&'data' in parsed?(parsed as {data:unknown}).data:null);if(!Array.isArray(payload)||payload.some(item=>!item||typeof item!=='object'||typeof (item as {id?:unknown}).id!=='string'))throw new Error('Formato inválido');if(!confirm(`Substituir todos os dados de ${domainMeta[key].label.toLowerCase()} pelos ${payload.length} registros deste arquivo?`))return;setData(current=>{if(key==='users')return {...current,users:payload as User[]};if(key==='tables')return {...current,tables:payload as PoolTable[]};if(key==='events')return {...current,events:payload as AuditEvent[]};if(key==='matches'){const tournamentIds=new Set(current.tournaments.map(t=>t.id));return {...current,matches:(payload as Match[]).filter(m=>tournamentIds.has(m.tournamentId))}}if(key==='tournaments'){const tournaments=payload as Tournament[];const ids=new Set(tournaments.map(t=>t.id));return {...current,tournaments,matches:current.matches.filter(m=>ids.has(m.tournamentId))}}const players=payload as Player[];const names=new Set(players.map(p=>p.name));return {...current,players,tournaments:current.tournaments.map(t=>({...t,players:t.players.filter(n=>names.has(n))})),matches:current.matches.filter(m=>names.has(m.a)&&names.has(m.b))}});setNotice(`${payload.length} registro(s) importado(s) em ${domainMeta[key].label}.`)}catch{setNotice('Não foi possível importar: o JSON está inválido ou não contém uma lista de registros.')}};
  return <div className="page settings-page"><div className="page-head"><div><div className="eyebrow">PREFERÊNCIAS</div><h1>Configurações</h1><p className="muted">Gerencie, transfira ou limpe os dados sincronizados do sistema.</p></div><button className="secondary" onClick={reset}><Database size={17}/> Restaurar demonstração</button></div>{notice&&<div className="data-notice" role="status"><Check size={16}/>{notice}<button className="icon-button" onClick={()=>setNotice('')}><X size={15}/></button></div>}<div className="data-summary">{(Object.keys(domainMeta) as DomainKey[]).map(key=><article key={key}><span>{domainMeta[key].label}</span><strong>{data[key].length}</strong></article>)}</div><div className="domain-stack">{(Object.keys(domainMeta) as DomainKey[]).map(key=>{const meta=domainMeta[key];const Icon=meta.icon;const items=data[key] as DomainItem[];const open=openDomain===key;return <section className={`card domain-card ${open?'open':''}`} key={key}><button className="domain-heading" onClick={()=>setOpenDomain(open?null:key)} aria-expanded={open}><span className="domain-icon"><Icon size={20}/></span><span><strong>{meta.label}</strong><small>{meta.description}</small></span><span className="domain-count">{items.length}</span><ChevronRight className="domain-chevron" size={18}/></button>{open&&<div className="domain-content"><div className="domain-actions"><button className="secondary" onClick={()=>exportDomain(key)} disabled={!items.length}><Download size={16}/> Exportar todos</button><label className="secondary data-action"><Upload size={16}/> Importar JSON<input type="file" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];if(file)void importDomain(key,file);e.target.value=''}}/></label><button className="secondary danger" onClick={()=>removeAll(key)} disabled={!items.length}><Trash2 size={16}/> Apagar todos</button></div><div className="domain-list">{items.length?items.map(item=><article key={item.id}><span className="file-icon"><FileJson size={17}/></span><span className="domain-item-copy"><strong>{labelFor(key,item)}</strong><small>{detailFor(key,item)}</small></span><button className="icon-button" onClick={()=>exportItem(key,item)} title="Exportar registro"><Download size={16}/></button><button className="icon-button danger" onClick={()=>removeOne(key,item)} title="Apagar registro"><Trash2 size={16}/></button></article>):<Empty text={`Nenhum registro em ${meta.label.toLowerCase()}`}/>}</div></div>}</section>})}</div><section className="danger-zone"><div><strong>Zona de risco</strong><p>Restaure todos os domínios para os dados originais da demonstração.</p></div><button className="secondary danger" onClick={reset}><Trash2 size={17}/> Restaurar todos os dados</button></section></div>;
}

function App() {
  const [currentUser,setCurrentUser]=useState<FirebaseUser|null>(null); const [authLoading,setAuthLoading]=useState(true); const [page,setPage]=useState<Page>('dashboard'); const [selected,setSelected]=useState<string>(); const [createOnOpen,setCreateOnOpen]=useState(false); const [data,setData]=useStore(currentUser);
  useEffect(()=>onAuthStateChanged(auth,user=>{setCurrentUser(user);setAuthLoading(false)}),[]);
  const login=async()=>{await loginWithGoogle()}; const logout=()=>{void logoutFromGoogle()};
  const openTournament=(id:string)=>{setSelected(id);setPage('detail')};
  if(authLoading)return <main className="auth-loading"><Logo/><span>Carregando sua sessão…</span></main>;
  if(!currentUser)return <Login onLogin={login}/>;
  const detail=data.tournaments.find(t=>t.id===selected);
  return <Shell page={page} setPage={p=>{setCreateOnOpen(false);setPage(p)}} onLogout={logout} currentUser={currentUser}>
    {page==='dashboard'&&<Dashboard data={data} goTournaments={()=>{setCreateOnOpen(true);setPage('tournaments')}} openTournament={openTournament}/>} 
    {page==='tournaments'&&<Tournaments data={data} setData={setData} openTournament={openTournament} startCreate={createOnOpen}/>} 
    {page==='detail'&&detail&&<Detail item={detail} data={data} setData={setData} back={()=>setPage('tournaments')}/>} 
    {page==='participants'&&<Participants data={data} setData={setData}/>} 
    {page==='settings'&&<SettingsPage data={data} setData={setData} reset={()=>{if(confirm('Restaurar todos os domínios para os dados de exemplo?'))setData(seed)}}/>}
  </Shell>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
