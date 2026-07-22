import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft, CalendarDays, ChevronRight, CircleUserRound, LayoutDashboard,
  LogOut, Menu, MoreHorizontal, Plus, Search, Settings, Trophy, Users,
  X, Pencil, Trash2, MapPin, Clock3, Check, Brackets, ArrowUp, ArrowDown, Shuffle
} from 'lucide-react';
import './styles.css';

type Status = 'Inscrições abertas' | 'Em andamento' | 'Finalizado';
type Tournament = {
  id: string; name: string; start: string; end: string; format: string;
  status: Status; location: string; players: string[];
};
type Match = { id: string; tournamentId: string; round: string; a: string; b: string; scoreA?: number; scoreB?: number; date: string; time: string; table: string };
type Player = { id:string; name:string; email:string; phone:string; club:string };
type Store = { tournaments: Tournament[]; matches: Match[]; players: Player[] };
type Page = 'dashboard' | 'tournaments' | 'participants' | 'settings' | 'detail';

const seed: Store = {
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

function useStore() {
  const [data, setData] = useState<Store>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as Partial<Store>;
      const tournaments = saved.tournaments || seed.tournaments;
      const knownNames = Array.from(new Set(tournaments.flatMap(t=>t.players)));
      const players = saved.players || knownNames.map((name,i)=>({id:`migrado-${i}`,name,email:'',phone:'',club:''}));
      return { tournaments, matches:saved.matches || seed.matches, players };
    }
    catch { return seed; }
  });
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);
  return [data, setData] as const;
}

function Logo({ compact=false }: { compact?: boolean }) {
  return <div className="logo"><span className="logo-mark"><i/><i/><i/></span>{!compact && <strong>Clube da Chave</strong>}</div>;
}

function Login({ onLogin }: { onLogin: () => void }) {
  return <main className="login-page">
    <aside className="login-brand"><Logo/><p>Organize seus campeonatos<br/>em um só lugar.</p><small>Gestão simples, do início à final.</small></aside>
    <section className="login-panel"><form className="login-form" onSubmit={e => { e.preventDefault(); onLogin(); }}>
      <div className="eyebrow">BEM-VINDO</div><h1>Acesse sua conta</h1><p className="muted">Use qualquer e-mail e senha para entrar nesta demonstração.</p>
      <label>E-mail<input type="email" placeholder="seu@email.com" defaultValue="organizador@mesa.app"/></label>
      <label>Senha<input type="password" placeholder="Sua senha" defaultValue="12345678"/></label>
      <div className="login-options"><label className="check"><input type="checkbox"/> Manter conectado</label><button type="button" className="link">Esqueci minha senha</button></div>
      <button className="primary wide" type="submit">Entrar <ChevronRight size={18}/></button>
      <p className="signup">Ainda não tem uma conta? <button type="button" className="link">Criar conta</button></p>
    </form></section>
  </main>;
}

const nav = [
  {id:'dashboard' as Page, label:'Início', icon:LayoutDashboard},
  {id:'tournaments' as Page, label:'Campeonatos', icon:Trophy},
  {id:'participants' as Page, label:'Participantes', icon:Users},
  {id:'settings' as Page, label:'Configurações', icon:Settings}
];

function Shell({ page, setPage, onLogout, children }: { page:Page; setPage:(p:Page)=>void; onLogout:()=>void; children:React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <aside className={`sidebar ${open?'open':''}`}><div className="side-top"><Logo/><button className="icon-button mobile-close" onClick={()=>setOpen(false)}><X/></button></div>
      <nav>{nav.map(n => <button key={n.id} className={(page===n.id || (page==='detail'&&n.id==='tournaments'))?'active':''} onClick={()=>{setPage(n.id);setOpen(false)}}><n.icon size={19}/><span>{n.label}</span></button>)}</nav>
      <div className="profile"><CircleUserRound/><div><strong>Ricardo Martins</strong><span>Organizador</span></div><button className="icon-button" title="Sair" onClick={onLogout}><LogOut size={18}/></button></div>
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
  const generateBracket=()=>{if(item.players.length<2){alert('Associe pelo menos dois jogadores antes de gerar o chaveamento.');return}const names=[...item.players];const round=names.length<=2?'Final':names.length<=4?'Semifinais':names.length<=8?'Quartas de final':'Oitavas de final';const generated:Match[]=[];for(let i=0;i<names.length;i+=2){if(!names[i+1])continue;generated.push({id:uid(),tournamentId:item.id,round,a:names[i],b:names[i+1],date:item.start,time:`${String(14+Math.floor(i/2)).padStart(2,'0')}:00`,table:`Mesa ${String((i/2)+1).padStart(2,'0')}`})}setData(d=>({...d,matches:[...d.matches.filter(m=>m.tournamentId!==item.id),...generated]}));};
  return <div className="page detail-page"><button className="back" onClick={back}><ArrowLeft size={17}/> Campeonatos</button><div className="page-head"><div><h1>{item.name}</h1><div className="subline"><Badge status={item.status}/><span><MapPin size={14}/>{item.location}</span><span><CalendarDays size={14}/>{fmtDate(item.start)} — {fmtDate(item.end)}</span></div></div><div className="head-actions"><button className="secondary" onClick={generateBracket}><Shuffle size={17}/> Gerar chaveamento</button><button className="primary" onClick={()=>{setSelectedPlayers(item.players);setAdding(true)}}><Plus size={18}/> Associar jogadores</button></div></div>
    <div className="tabs"><button className={tab==='bracket'?'active':''} onClick={()=>setTab('bracket')}>Chaveamento</button><button className={tab==='schedule'?'active':''} onClick={()=>setTab('schedule')}>Agenda</button><button className={tab==='players'?'active':''} onClick={()=>setTab('players')}>Participantes <span>{item.players.length}</span></button></div>
    {tab==='bracket'&&<Bracket matches={matches}/>} {tab==='schedule'&&<Schedule matches={matches}/>} {tab==='players'&&<section className="card player-list"><div className="card-head"><div><h2>Jogadores associados</h2><p>A ordem abaixo define as posições no chaveamento</p></div></div>{item.players.length?item.players.map((p,i)=><article key={p}><span className="seed-number">{i+1}</span><span className="avatar">{p.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><div><strong>{p}</strong><small>{data.players.find(x=>x.name===p)?.club||'Sem clube informado'}</small></div><div className="order-actions"><button className="icon-button" disabled={i===0} onClick={()=>movePlayer(i,-1)} title="Subir"><ArrowUp size={16}/></button><button className="icon-button" disabled={i===item.players.length-1} onClick={()=>movePlayer(i,1)} title="Descer"><ArrowDown size={16}/></button><button className="icon-button danger" onClick={()=>removePlayer(p)} title="Remover"><Trash2 size={17}/></button></div></article>):<Empty text="Nenhum jogador associado"/>}</section>}
    {adding&&<Modal title="Associar jogadores" onClose={()=>setAdding(false)}><p className="modal-copy">Selecione os jogadores que participarão deste campeonato.</p><div className="association-list">{data.players.map(p=><label key={p.id}><input type="checkbox" checked={selectedPlayers.includes(p.name)} onChange={e=>setSelectedPlayers(current=>e.target.checked?[...current,p.name]:current.filter(x=>x!==p.name))}/><span className="avatar">{p.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><span><strong>{p.name}</strong><small>{p.club||'Sem clube informado'}</small></span></label>)}</div><div className="modal-actions"><span className="selection-count">{selectedPlayers.length} selecionado(s)</span><button type="button" className="secondary" onClick={()=>setAdding(false)}>Cancelar</button><button className="primary" onClick={saveAssociations}>Salvar associações</button></div></Modal>}
  </div>;
}

function Bracket({matches}:{matches:Match[]}) {
  const rounds=matches.some(m=>m.round==='Oitavas de final')?['Oitavas de final','Quartas de final','Semifinais','Final']:['Quartas de final','Semifinais','Final'];
  return <section className="card bracket"><div className="bracket-scroll" style={{gridTemplateColumns:`repeat(${rounds.length}, minmax(220px, 1fr))`,minWidth:`${rounds.length*270}px`}}>{rounds.map((round,ri)=><div className={`round round-${ri}`} key={round}><h3>{round}</h3><div className="round-matches">{matches.filter(m=>m.round===round).length?matches.filter(m=>m.round===round).map(m=><article className="match" key={m.id}><div className={(m.scoreA??0)>(m.scoreB??0)?'winner':''}><span>{m.a}</span><strong>{m.scoreA??'—'}</strong></div><div className={(m.scoreB??0)>(m.scoreA??0)?'winner':''}><span>{m.b}</span><strong>{m.scoreB??'—'}</strong></div></article>):<article className="match placeholder"><span>A definir</span></article>}</div></div>)}</div></section>;
}

function Schedule({matches}:{matches:Match[]}) { return <section className="card schedule"><div className="card-head"><div><h2>Agenda de partidas</h2><p>Horários e mesas programadas</p></div></div>{matches.length?matches.map(m=><article key={m.id}><div className="date-tile"><strong>{new Date(`${m.date}T12:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(`${m.date}T12:00`))}</span></div><div className="schedule-main"><small>{m.round}</small><strong>{m.a} <span>×</span> {m.b}</strong></div><span><Clock3 size={15}/>{m.time}</span><span>{m.table}</span>{m.scoreA!==undefined&&<span className="done"><Check/>Concluída</span>}</article>):<Empty text="Nenhuma partida agendada"/>}</section>; }

function PlayerForm({initial,onSave,onClose}:{initial?:Player;onSave:(p:Player)=>void;onClose:()=>void}) { const [form,setForm]=useState<Player>(initial||{id:uid(),name:'',email:'',phone:'',club:''});const change=(key:keyof Player,value:string)=>setForm({...form,[key]:value});return <Modal title={initial?'Editar jogador':'Novo jogador'} onClose={onClose}><form className="form-grid" onSubmit={e=>{e.preventDefault();onSave(form)}}><label className="full">Nome completo<input required value={form.name} onChange={e=>change('name',e.target.value)} placeholder="Nome do jogador"/></label><label>E-mail<input type="email" value={form.email} onChange={e=>change('email',e.target.value)} placeholder="jogador@email.com"/></label><label>Telefone<input value={form.phone} onChange={e=>change('phone',e.target.value)} placeholder="(11) 99999-9999"/></label><label className="full">Clube<input value={form.club} onChange={e=>change('club',e.target.value)} placeholder="Clube ou salão"/></label><div className="modal-actions full"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary">Salvar jogador</button></div></form></Modal>}

function Participants({data,setData}:{data:Store;setData:React.Dispatch<React.SetStateAction<Store>>}) { const [editing,setEditing]=useState<Player|null|undefined>();const [query,setQuery]=useState('');const list=useMemo(()=>data.players.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())||p.club.toLowerCase().includes(query.toLowerCase())),[data.players,query]);const save=(player:Player)=>{setData(d=>{const old=d.players.find(p=>p.id===player.id);return {...d,players:old?d.players.map(p=>p.id===player.id?player:p):[player,...d.players],tournaments:old&&old.name!==player.name?d.tournaments.map(t=>({...t,players:t.players.map(n=>n===old.name?player.name:n)})):d.tournaments,matches:old&&old.name!==player.name?d.matches.map(m=>({...m,a:m.a===old.name?player.name:m.a,b:m.b===old.name?player.name:m.b})):d.matches}});setEditing(undefined)};const remove=(player:Player)=>{if(!confirm(`Excluir ${player.name}?`))return;setData(d=>({...d,players:d.players.filter(p=>p.id!==player.id),tournaments:d.tournaments.map(t=>({...t,players:t.players.filter(n=>n!==player.name)})),matches:d.matches.filter(m=>m.a!==player.name&&m.b!==player.name)}))};return <div className="page"><div className="page-head"><div><div className="eyebrow">CADASTROS</div><h1>Jogadores</h1><p className="muted">Cadastre os jogadores antes de associá-los aos campeonatos.</p></div><button className="primary" onClick={()=>setEditing(null)}><Plus size={18}/> Novo jogador</button></div><div className="toolbar player-toolbar"><label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nome ou clube"/></label><span>{data.players.length} jogador(es) cadastrados</span></div><section className="card player-table"><div className="table-wrap"><table><thead><tr><th>Jogador</th><th>Contato</th><th>Clube</th><th>Campeonatos</th><th/></tr></thead><tbody>{list.map(p=><tr key={p.id}><td><div className="player-cell"><span className="avatar">{p.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><strong>{p.name}</strong></div></td><td><span>{p.email||'—'}</span><small>{p.phone||'Sem telefone'}</small></td><td>{p.club||'—'}</td><td>{data.tournaments.filter(t=>t.players.includes(p.name)).length}</td><td><div className="inline-actions"><button className="icon-button" onClick={()=>setEditing(p)} title="Editar"><Pencil size={16}/></button><button className="icon-button danger" onClick={()=>remove(p)} title="Excluir"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!list.length&&<Empty text="Nenhum jogador encontrado"/>}</div></section>{editing!==undefined&&<PlayerForm initial={editing||undefined} onSave={save} onClose={()=>setEditing(undefined)}/>}</div>; }

function SettingsPage({reset}:{reset:()=>void}) { return <div className="page"><div className="page-head"><div><div className="eyebrow">PREFERÊNCIAS</div><h1>Configurações</h1><p className="muted">Configurações locais desta demonstração.</p></div></div><section className="card settings-card"><h2>Dados da demonstração</h2><p>Todos os campeonatos, participantes e partidas ficam salvos apenas neste navegador.</p><button className="secondary danger" onClick={reset}><Trash2 size={17}/> Restaurar dados de exemplo</button></section></div>; }

function App() {
  const [logged,setLogged]=useState(()=>sessionStorage.getItem('mesa.logged')==='1'); const [page,setPage]=useState<Page>('dashboard'); const [selected,setSelected]=useState<string>(); const [createOnOpen,setCreateOnOpen]=useState(false); const [data,setData]=useStore();
  const login=()=>{sessionStorage.setItem('mesa.logged','1');setLogged(true)}; const logout=()=>{sessionStorage.removeItem('mesa.logged');setLogged(false)};
  const openTournament=(id:string)=>{setSelected(id);setPage('detail')};
  if(!logged)return <Login onLogin={login}/>;
  const detail=data.tournaments.find(t=>t.id===selected);
  return <Shell page={page} setPage={p=>{setCreateOnOpen(false);setPage(p)}} onLogout={logout}>
    {page==='dashboard'&&<Dashboard data={data} goTournaments={()=>{setCreateOnOpen(true);setPage('tournaments')}} openTournament={openTournament}/>} 
    {page==='tournaments'&&<Tournaments data={data} setData={setData} openTournament={openTournament} startCreate={createOnOpen}/>} 
    {page==='detail'&&detail&&<Detail item={detail} data={data} setData={setData} back={()=>setPage('tournaments')}/>} 
    {page==='participants'&&<Participants data={data} setData={setData}/>} 
    {page==='settings'&&<SettingsPage reset={()=>{if(confirm('Restaurar todos os dados de exemplo?'))setData(seed)}}/>}
  </Shell>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
