import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import {
  ArrowLeft, CalendarDays, ChevronRight, CircleUserRound, LayoutDashboard,
  LogOut, Menu, MoreHorizontal, Plus, Search, Settings, Trophy, Users,
  X, Pencil, Trash2, MapPin, Clock3, Check, Brackets, ArrowUp, ArrowDown, Shuffle,
  Download, Upload, Database, UserRound, FileJson, Crown
} from 'lucide-react';
import { auth, firebaseReady, loginWithGoogle, logoutFromGoogle } from './firebase';
import './styles.css';

type Status = 'Inscrições abertas' | 'Em andamento' | 'Finalizado';
type Tournament = {
  id: string; name: string; start: string; end: string; format: string;
  status: Status; location: string; players: string[];
};
type Match = { id: string; tournamentId: string; round: string; a: string; b: string; scoreA?: number; scoreB?: number; date: string; time: string; table: string; winner?: string; position?: number };
type Player = { id:string; name:string; email:string; phone:string; club:string };
type User = { id:string; name:string; email:string; role:'Administrador'|'Organizador' };
type Store = { tournaments: Tournament[]; matches: Match[]; players: Player[]; users: User[] };
type Page = 'dashboard' | 'tournaments' | 'participants' | 'settings' | 'detail';

const seed: Store = {
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
    { id: 'copa-paulista', name: 'Copa Paulista 2026', start: '2026-08-15', end: '2026-08-17', format: 'Mata-mata', status: 'Inscrições abertas', location: 'Clube Central', players: ['Lucas Almeida', 'Bruno Santos', 'Rafael Lima', 'Diego Costa', 'Marcos Rocha', 'André Gomes', 'Felipe Araújo', 'João Vitor'] },
    { id: 'torneio-inverno', name: 'Torneio de Inverno', start: '2026-07-05', end: '2026-07-26', format: 'Mata-mata', status: 'Em andamento', location: 'Arena Norte', players: ['Carlos Henrique', 'Paulo Mendes', 'Tiago Ribeiro', 'Renato Alves'] },
    { id: 'liga-central', name: 'Liga do Clube Central', start: '2026-03-15', end: '2026-08-30', format: 'Pontos corridos', status: 'Em andamento', location: 'Clube Central', players: ['Gustavo Nunes', 'Leonardo Braga', 'Eduardo Lima', 'Matheus Silva', 'Vinícius Costa', 'Rodrigo Martins'] },
    { id: 'desafio-8-ball', name: 'Desafio 8-Ball', start: '2026-02-20', end: '2026-02-21', format: 'Mata-mata', status: 'Finalizado', location: 'Salão Vitória', players: ['Bruno Santos', 'Lucas Almeida', 'Diego Costa', 'Rafael Lima'] }
  ],
  matches: [
    { id:'m1', tournamentId:'copa-paulista', round:'Quartas de final', a:'Lucas Almeida', b:'Bruno Santos', scoreA:4, scoreB:2, date:'2026-08-15', time:'14:00', table:'Mesa 01' },
    { id:'m2', tournamentId:'copa-paulista', round:'Quartas de final', a:'Rafael Lima', b:'Diego Costa', scoreA:4, scoreB:1, date:'2026-08-15', time:'16:00', table:'Mesa 02' },
    { id:'m3', tournamentId:'copa-paulista', round:'Semifinais', a:'Lucas Almeida', b:'Rafael Lima', date:'2026-08-16', time:'14:00', table:'Mesa 01' },
    { id:'m4', tournamentId:'copa-paulista', round:'Semifinais', a:'Marcos Rocha', b:'André Gomes', date:'2026-08-16', time:'16:00', table:'Mesa 02' }
  ]
};

const STORAGE_KEY = 'clube-da-chave.app.v1';
const fmtDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${value}T12:00:00`));
const uid = () => Math.random().toString(36).slice(2, 9);
const bracketRounds = ['Oitavas de final', 'Quartas de final', 'Semifinais', 'Final'];
const matchWinner = (match:Match) => match.winner || (match.scoreA!==undefined && match.scoreB!==undefined && match.scoreA!==match.scoreB ? (match.scoreA>match.scoreB?match.a:match.b) : undefined);

function useStore() {
  const [data, setData] = useState<Store>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as Partial<Store>;
      const tournaments = saved.tournaments || seed.tournaments;
      const knownNames = Array.from(new Set(tournaments.flatMap(t=>t.players)));
      const players = saved.players || knownNames.map((name,i)=>({id:`migrado-${i}`,name,email:'',phone:'',club:''}));
      return { tournaments, matches:saved.matches || seed.matches, players, users:saved.users || seed.users };
    }
    catch { return seed; }
  });
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);
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

function Detail({ item, data, setData, back }: { item:Tournament; data:Store; setData:React.Dispatch<React.SetStateAction<Store>>; back:()=>void }) {
  const [tab,setTab]=useState<'bracket'|'schedule'|'players'>('bracket'); const [adding,setAdding]=useState(false); const [selectedPlayers,setSelectedPlayers]=useState<string[]>(item.players);
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
  return <div className="page detail-page"><button className="back" onClick={back}><ArrowLeft size={17}/> Campeonatos</button><div className="page-head"><div><h1>{item.name}</h1><div className="subline"><Badge status={item.status}/><span><MapPin size={14}/>{item.location}</span><span><CalendarDays size={14}/>{fmtDate(item.start)} — {fmtDate(item.end)}</span></div></div><div className="head-actions"><button className="secondary" onClick={generateBracket}><Shuffle size={17}/> Gerar chaveamento</button><button className="primary" onClick={()=>{setSelectedPlayers(item.players);setAdding(true)}}><Plus size={18}/> Associar jogadores</button></div></div>
    <div className="tabs"><button className={tab==='bracket'?'active':''} onClick={()=>setTab('bracket')}>Chaveamento</button><button className={tab==='schedule'?'active':''} onClick={()=>setTab('schedule')}>Agenda</button><button className={tab==='players'?'active':''} onClick={()=>setTab('players')}>Participantes <span>{item.players.length}</span></button></div>
    {tab==='bracket'&&<Bracket matches={matches} onAdvance={advancePlayer}/>} {tab==='schedule'&&<Schedule matches={matches}/>} {tab==='players'&&<section className="card player-list"><div className="card-head"><div><h2>Jogadores associados</h2><p>A ordem abaixo define as posições no chaveamento</p></div></div>{item.players.length?item.players.map((p,i)=><article key={p}><span className="seed-number">{i+1}</span><span className="avatar">{p.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><div><strong>{p}</strong><small>{data.players.find(x=>x.name===p)?.club||'Sem clube informado'}</small></div><div className="order-actions"><button className="icon-button" disabled={i===0} onClick={()=>movePlayer(i,-1)} title="Subir"><ArrowUp size={16}/></button><button className="icon-button" disabled={i===item.players.length-1} onClick={()=>movePlayer(i,1)} title="Descer"><ArrowDown size={16}/></button><button className="icon-button danger" onClick={()=>removePlayer(p)} title="Remover"><Trash2 size={17}/></button></div></article>):<Empty text="Nenhum jogador associado"/>}</section>}
    {adding&&<Modal title="Associar jogadores" onClose={()=>setAdding(false)}><p className="modal-copy">Selecione os jogadores que participarão deste campeonato.</p><div className="association-list">{data.players.map(p=><label key={p.id}><input type="checkbox" checked={selectedPlayers.includes(p.name)} onChange={e=>setSelectedPlayers(current=>e.target.checked?[...current,p.name]:current.filter(x=>x!==p.name))}/><span className="avatar">{p.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><span><strong>{p.name}</strong><small>{p.club||'Sem clube informado'}</small></span></label>)}</div><div className="modal-actions"><span className="selection-count">{selectedPlayers.length} selecionado(s)</span><button type="button" className="secondary" onClick={()=>setAdding(false)}>Cancelar</button><button className="primary" onClick={saveAssociations}>Salvar associações</button></div></Modal>}
  </div>;
}

function Bracket({matches,onAdvance}:{matches:Match[];onAdvance:(matchId:string,winner:string)=>void}) {
  const firstRound=bracketRounds.find(round=>matches.some(m=>m.round===round))||'Quartas de final';
  const rounds=bracketRounds.slice(bracketRounds.indexOf(firstRound));
  const final=matches.find(m=>m.round==='Final');
  const champion=final&&matchWinner(final);
  return <div className="bracket-area">{champion&&<section className="champion-banner"><span><Crown size={22}/></span><div><small>CAMPEÃO</small><strong>{champion}</strong></div></section>}<div className="bracket-tip"><Check size={16}/><span>Clique no jogador que avançou. Você pode alterar a escolha a qualquer momento.</span></div><section className="card bracket"><div className="bracket-scroll" style={{gridTemplateColumns:`repeat(${rounds.length}, minmax(220px, 1fr))`,minWidth:`${rounds.length*270}px`}}>{rounds.map((round,ri)=><div className={`round round-${ri}`} key={round}><h3>{round}</h3><div className="round-matches">{matches.filter(m=>m.round===round).length?matches.filter(m=>m.round===round).sort((a,b)=>(a.position??matches.indexOf(a))-(b.position??matches.indexOf(b))).map(m=>{const winner=matchWinner(m);return <article className="match" key={m.id}>{([['a','scoreA'],['b','scoreB']] as const).map(([playerKey,scoreKey])=>{const player=m[playerKey];const advanced=winner===player;return <button type="button" disabled={!player} className={advanced?'winner':''} onClick={()=>onAdvance(m.id,player)} key={playerKey}><span>{player||'A definir'}</span><strong>{advanced?<><Check size={14}/> Avançou</>:m[scoreKey]??'—'}</strong></button>})}</article>}):<article className="match placeholder"><span>A definir</span></article>}</div></div>)}</div></section></div>;
}

function Schedule({matches}:{matches:Match[]}) { return <section className="card schedule"><div className="card-head"><div><h2>Agenda de partidas</h2><p>Horários e mesas programadas</p></div></div>{matches.length?matches.map(m=><article key={m.id}><div className="date-tile"><strong>{new Date(`${m.date}T12:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(`${m.date}T12:00`))}</span></div><div className="schedule-main"><small>{m.round}</small><strong>{m.a} <span>×</span> {m.b}</strong></div><span><Clock3 size={15}/>{m.time}</span><span>{m.table}</span>{m.scoreA!==undefined&&<span className="done"><Check/>Concluída</span>}</article>):<Empty text="Nenhuma partida agendada"/>}</section>; }

function PlayerForm({initial,onSave,onClose}:{initial?:Player;onSave:(p:Player)=>void;onClose:()=>void}) { const [form,setForm]=useState<Player>(initial||{id:uid(),name:'',email:'',phone:'',club:''});const change=(key:keyof Player,value:string)=>setForm({...form,[key]:value});return <Modal title={initial?'Editar jogador':'Novo jogador'} onClose={onClose}><form className="form-grid" onSubmit={e=>{e.preventDefault();onSave(form)}}><label className="full">Nome completo<input required value={form.name} onChange={e=>change('name',e.target.value)} placeholder="Nome do jogador"/></label><label>E-mail<input type="email" value={form.email} onChange={e=>change('email',e.target.value)} placeholder="jogador@email.com"/></label><label>Telefone<input value={form.phone} onChange={e=>change('phone',e.target.value)} placeholder="(11) 99999-9999"/></label><label className="full">Clube<input value={form.club} onChange={e=>change('club',e.target.value)} placeholder="Clube ou salão"/></label><div className="modal-actions full"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary">Salvar jogador</button></div></form></Modal>}

function Participants({data,setData}:{data:Store;setData:React.Dispatch<React.SetStateAction<Store>>}) { const [editing,setEditing]=useState<Player|null|undefined>();const [query,setQuery]=useState('');const list=useMemo(()=>data.players.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())||p.club.toLowerCase().includes(query.toLowerCase())),[data.players,query]);const save=(player:Player)=>{setData(d=>{const old=d.players.find(p=>p.id===player.id);return {...d,players:old?d.players.map(p=>p.id===player.id?player:p):[player,...d.players],tournaments:old&&old.name!==player.name?d.tournaments.map(t=>({...t,players:t.players.map(n=>n===old.name?player.name:n)})):d.tournaments,matches:old&&old.name!==player.name?d.matches.map(m=>({...m,a:m.a===old.name?player.name:m.a,b:m.b===old.name?player.name:m.b})):d.matches}});setEditing(undefined)};const remove=(player:Player)=>{if(!confirm(`Excluir ${player.name}?`))return;setData(d=>({...d,players:d.players.filter(p=>p.id!==player.id),tournaments:d.tournaments.map(t=>({...t,players:t.players.filter(n=>n!==player.name)})),matches:d.matches.filter(m=>m.a!==player.name&&m.b!==player.name)}))};return <div className="page"><div className="page-head"><div><div className="eyebrow">CADASTROS</div><h1>Jogadores</h1><p className="muted">Cadastre os jogadores antes de associá-los aos campeonatos.</p></div><button className="primary" onClick={()=>setEditing(null)}><Plus size={18}/> Novo jogador</button></div><div className="toolbar player-toolbar"><label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nome ou clube"/></label><span>{data.players.length} jogador(es) cadastrados</span></div><section className="card player-table"><div className="table-wrap"><table><thead><tr><th>Jogador</th><th>Contato</th><th>Clube</th><th>Campeonatos</th><th/></tr></thead><tbody>{list.map(p=><tr key={p.id}><td><div className="player-cell"><span className="avatar">{p.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><strong>{p.name}</strong></div></td><td><span>{p.email||'—'}</span><small>{p.phone||'Sem telefone'}</small></td><td>{p.club||'—'}</td><td>{data.tournaments.filter(t=>t.players.includes(p.name)).length}</td><td><div className="inline-actions"><button className="icon-button" onClick={()=>setEditing(p)} title="Editar"><Pencil size={16}/></button><button className="icon-button danger" onClick={()=>remove(p)} title="Excluir"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!list.length&&<Empty text="Nenhum jogador encontrado"/>}</div></section>{editing!==undefined&&<PlayerForm initial={editing||undefined} onSave={save} onClose={()=>setEditing(undefined)}/>}</div>; }

type DomainKey = 'users'|'players'|'tournaments'|'matches';
type DomainItem = User|Player|Tournament|Match;

const downloadJson = (filename:string,value:unknown) => { const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();URL.revokeObjectURL(url) };
const domainMeta:Record<DomainKey,{label:string;description:string;icon:React.ComponentType<{size?:number}>}> = {
  users:{label:'Usuários',description:'Contas administrativas e organizadores.',icon:UserRound},
  players:{label:'Jogadores',description:'Cadastros disponíveis para inscrição.',icon:Users},
  tournaments:{label:'Campeonatos',description:'Competições, períodos e participantes.',icon:Trophy},
  matches:{label:'Partidas',description:'Confrontos, horários, mesas e resultados.',icon:Brackets}
};

function SettingsPage({data,setData,reset}:{data:Store;setData:React.Dispatch<React.SetStateAction<Store>>;reset:()=>void}) {
  const [openDomain,setOpenDomain]=useState<DomainKey|null>('users'); const [notice,setNotice]=useState('');
  const labelFor=(key:DomainKey,item:DomainItem)=>key==='users'||key==='players'?(item as User|Player).name:key==='tournaments'?(item as Tournament).name:`${(item as Match).a} × ${(item as Match).b}`;
  const detailFor=(key:DomainKey,item:DomainItem)=>key==='users'?`${(item as User).email} · ${(item as User).role}`:key==='players'?`${(item as Player).club||'Sem clube'} · ${(item as Player).email||'Sem e-mail'}`:key==='tournaments'?`${(item as Tournament).format} · ${(item as Tournament).status}`:`${(item as Match).round} · ${(item as Match).date} às ${(item as Match).time}`;
  const exportDomain=(key:DomainKey)=>downloadJson(`clube-da-chave-${key}.json`,{domain:key,exportedAt:new Date().toISOString(),data:data[key]});
  const exportItem=(key:DomainKey,item:DomainItem)=>downloadJson(`clube-da-chave-${key}-${item.id}.json`,{domain:key,exportedAt:new Date().toISOString(),data:[item]});
  const removeItems=(key:DomainKey,ids:string[])=>setData(current=>{if(key==='users')return {...current,users:current.users.filter(x=>!ids.includes(x.id))};if(key==='matches')return {...current,matches:current.matches.filter(x=>!ids.includes(x.id))};if(key==='tournaments')return {...current,tournaments:current.tournaments.filter(x=>!ids.includes(x.id)),matches:current.matches.filter(x=>!ids.includes(x.tournamentId))};const removedNames=current.players.filter(x=>ids.includes(x.id)).map(x=>x.name);return {...current,players:current.players.filter(x=>!ids.includes(x.id)),tournaments:current.tournaments.map(t=>({...t,players:t.players.filter(n=>!removedNames.includes(n))})),matches:current.matches.filter(m=>!removedNames.includes(m.a)&&!removedNames.includes(m.b))}});
  const removeOne=(key:DomainKey,item:DomainItem)=>{if(confirm(`Apagar “${labelFor(key,item)}”? Esta ação não pode ser desfeita.`)){removeItems(key,[item.id]);setNotice('Registro apagado com sucesso.')}};
  const removeAll=(key:DomainKey)=>{if(confirm(`Apagar todos os registros de ${domainMeta[key].label.toLowerCase()}? Dados relacionados também poderão ser removidos.`)){removeItems(key,data[key].map(x=>x.id));setNotice(`${domainMeta[key].label} apagados.`)}};
  const importDomain=async(key:DomainKey,file:File)=>{try{const parsed=JSON.parse(await file.text()) as unknown;const payload=Array.isArray(parsed)?parsed:(parsed&&typeof parsed==='object'&&'data' in parsed?(parsed as {data:unknown}).data:null);if(!Array.isArray(payload)||payload.some(item=>!item||typeof item!=='object'||typeof (item as {id?:unknown}).id!=='string'))throw new Error('Formato inválido');if(!confirm(`Substituir todos os dados de ${domainMeta[key].label.toLowerCase()} pelos ${payload.length} registros deste arquivo?`))return;setData(current=>{if(key==='users')return {...current,users:payload as User[]};if(key==='matches'){const tournamentIds=new Set(current.tournaments.map(t=>t.id));return {...current,matches:(payload as Match[]).filter(m=>tournamentIds.has(m.tournamentId))}}if(key==='tournaments'){const tournaments=payload as Tournament[];const ids=new Set(tournaments.map(t=>t.id));return {...current,tournaments,matches:current.matches.filter(m=>ids.has(m.tournamentId))}}const players=payload as Player[];const names=new Set(players.map(p=>p.name));return {...current,players,tournaments:current.tournaments.map(t=>({...t,players:t.players.filter(n=>names.has(n))})),matches:current.matches.filter(m=>names.has(m.a)&&names.has(m.b))}});setNotice(`${payload.length} registro(s) importado(s) em ${domainMeta[key].label}.`)}catch{setNotice('Não foi possível importar: o JSON está inválido ou não contém uma lista de registros.')}};
  return <div className="page settings-page"><div className="page-head"><div><div className="eyebrow">PREFERÊNCIAS</div><h1>Configurações</h1><p className="muted">Gerencie, transfira ou limpe os dados salvos neste navegador.</p></div><button className="secondary" onClick={reset}><Database size={17}/> Restaurar demonstração</button></div>{notice&&<div className="data-notice" role="status"><Check size={16}/>{notice}<button className="icon-button" onClick={()=>setNotice('')}><X size={15}/></button></div>}<div className="data-summary">{(Object.keys(domainMeta) as DomainKey[]).map(key=><article key={key}><span>{domainMeta[key].label}</span><strong>{data[key].length}</strong></article>)}</div><div className="domain-stack">{(Object.keys(domainMeta) as DomainKey[]).map(key=>{const meta=domainMeta[key];const Icon=meta.icon;const items=data[key] as DomainItem[];const open=openDomain===key;return <section className={`card domain-card ${open?'open':''}`} key={key}><button className="domain-heading" onClick={()=>setOpenDomain(open?null:key)} aria-expanded={open}><span className="domain-icon"><Icon size={20}/></span><span><strong>{meta.label}</strong><small>{meta.description}</small></span><span className="domain-count">{items.length}</span><ChevronRight className="domain-chevron" size={18}/></button>{open&&<div className="domain-content"><div className="domain-actions"><button className="secondary" onClick={()=>exportDomain(key)} disabled={!items.length}><Download size={16}/> Exportar todos</button><label className="secondary data-action"><Upload size={16}/> Importar JSON<input type="file" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];if(file)void importDomain(key,file);e.target.value=''}}/></label><button className="secondary danger" onClick={()=>removeAll(key)} disabled={!items.length}><Trash2 size={16}/> Apagar todos</button></div><div className="domain-list">{items.length?items.map(item=><article key={item.id}><span className="file-icon"><FileJson size={17}/></span><span className="domain-item-copy"><strong>{labelFor(key,item)}</strong><small>{detailFor(key,item)}</small></span><button className="icon-button" onClick={()=>exportItem(key,item)} title="Exportar registro"><Download size={16}/></button><button className="icon-button danger" onClick={()=>removeOne(key,item)} title="Apagar registro"><Trash2 size={16}/></button></article>):<Empty text={`Nenhum registro em ${meta.label.toLowerCase()}`}/>}</div></div>}</section>})}</div><section className="danger-zone"><div><strong>Zona de risco</strong><p>Restaure todos os domínios para os dados originais da demonstração.</p></div><button className="secondary danger" onClick={reset}><Trash2 size={17}/> Restaurar todos os dados</button></section></div>;
}

function App() {
  const [currentUser,setCurrentUser]=useState<FirebaseUser|null>(null); const [authLoading,setAuthLoading]=useState(true); const [page,setPage]=useState<Page>('dashboard'); const [selected,setSelected]=useState<string>(); const [createOnOpen,setCreateOnOpen]=useState(false); const [data,setData]=useStore();
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
