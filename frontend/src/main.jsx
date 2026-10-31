import React, { useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import { createRoot } from 'react-dom/client';
import './style.css';

const icons = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  database: <><ellipse cx="12" cy="5" rx="8.5" ry="3"/><path d="M3.5 5v14c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3V5"/><path d="M3.5 12c0 1.7 3.8 3 8.5 3s8.5-1.3 8.5-3"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  chevron: <><path d="m9 18 6-6-6-6"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  sparkle: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  bolt: <><path d="m13 2-3 8h7L9 22l3-9H5l8-11Z"/></>
};
function Icon({name,size=18}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>; }
async function api(path, options={}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
const initials = name => name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();
const colors = ['sage','blue','peach','lavender','mint'];
function App() {
  const [page,setPage] = useState('workspace');
  const [overview,setOverview] = useState({candidateCount:0,skillCount:0,jobCount:0,recentJobs:[]});
  const [candidates,setCandidates] = useState([]);
  const [skillCatalog,setSkillCatalog] = useState([]);
  const [skillsText,setSkillsText] = useState('');
  const [match,setMatch] = useState(null);
  const [jobTitle,setJobTitle] = useState('');
  const [description,setDescription] = useState('');
  const [modal,setModal] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [modalError,setModalError] = useState('');
  const [notice,setNotice] = useState('');
  const [query,setQuery] = useState('');
  const [selectedMetric,setSelectedMetric] = useState(null);
  const [databaseTables,setDatabaseTables] = useState([]);
  const [databaseLoading,setDatabaseLoading] = useState(false);
  const [databaseError,setDatabaseError] = useState('');
  const [historyDeleting,setHistoryDeleting] = useState(false);
  const descriptionRef = useRef(null);

  async function refresh() {
    try {
      const [stats,profiles,catalog] = await Promise.all([api('/api/overview'),api('/api/candidates'),api('/api/skills')]);
      setOverview(stats); setCandidates(profiles.candidates); setSkillCatalog(catalog.skills);
    } catch (e) { setError(e.message); }
  }
  useEffect(()=>{refresh();},[]);
  useEffect(()=>{
    if(!selectedMetric) return;
    const closeOnEscape=event=>{if(event.key==='Escape')setSelectedMetric(null);};
    window.addEventListener('keydown',closeOnEscape);
    return ()=>window.removeEventListener('keydown',closeOnEscape);
  },[selectedMetric]);
  const filtered = useMemo(()=>candidates.filter(c=>`${c.name} ${c.email} ${c.skills.join(' ')}`.toLowerCase().includes(query.toLowerCase())),[candidates,query]);
  const skillGroups = useMemo(()=>skillCatalog.reduce((groups,skill)=>{(groups[skill.category] ||= []).push(skill.name);return groups;},{}),[skillCatalog]);
  const skillUsage = useMemo(()=>{
    const counts=new Map();
    candidates.forEach(candidate=>candidate.skills.forEach(skill=>counts.set(skill,(counts.get(skill)||0)+1)));
    return [...counts.entries()].map(([name,count])=>({name,count,category:skillCatalog.find(skill=>skill.name===name)?.category||'Other'})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
  },[candidates,skillCatalog]);

  function addCatalogSkill(skill) {
    const current=skillsText.split(',').map(value=>value.trim()).filter(Boolean);
    if(!current.some(value=>value.toLowerCase()===skill.toLowerCase())) setSkillsText([...current,skill].join(', '));
  }

  function focusDescription() { descriptionRef.current?.focus(); }

  async function loadDatabaseTables() {
    setDatabaseLoading(true); setDatabaseError('');
    try { const result=await api('/api/database/tables'); setDatabaseTables(result.tables||[]); }
    catch(e) { setDatabaseError(e.message); }
    finally { setDatabaseLoading(false); }
  }
  function openDatabaseTables() { setPage('database'); loadDatabaseTables(); }
  async function clearSearchHistory() {
    if(!overview.jobCount) return;
    const confirmed=window.confirm(`Delete all ${overview.jobCount} saved job searches and their extracted skill links? Candidate profiles and skills will remain.`);
    if(!confirmed) return;
    setHistoryDeleting(true); setError(''); setNotice('');
    try {
      const result=await api('/api/jobs',{method:'DELETE'});
      setMatch(null);
      setNotice(`Search history cleared. Removed ${result.deletedJobs} job searches and ${result.deletedSkillLinks} extracted skill links.`);
      await refresh();
      await loadDatabaseTables();
    } catch(e) { setError(e.message); }
    finally { setHistoryDeleting(false); }
  }

  async function addCandidate(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const skills = skillsText.split(',').map(s=>s.trim()).filter(Boolean);
    setBusy(true); setError(''); setModalError('');
    try { await api('/api/candidates',{method:'POST',body:JSON.stringify({name:form.get('name'),email:form.get('email'),skills})}); setModal(false); setSkillsText(''); setMatch(null); setNotice('Candidate profile added'); await refresh(); }
    catch(e){setModalError(e.message);} finally{setBusy(false);}
  }
  async function analyze(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { const result=await api('/api/match',{method:'POST',body:JSON.stringify({title:jobTitle,description})}); setMatch(result); setNotice('Analysis complete — shortlist updated'); await refresh(); }
    catch(e){setError(e.message);} finally{setBusy(false);}
  }
  async function removeCandidate(id) {
    if(!window.confirm('Remove this candidate profile?')) return;
    setError(''); try { await api(`/api/candidates/${id}`,{method:'DELETE'}); setMatch(null); setNotice('Candidate profile removed. Run a new analysis to refresh extracted skills.'); await refresh(); }
    catch(e){setError(e.message);}
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Icon name="target" size={22}/></div><span>skillspring<span className="brand-dot">.</span></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        <button className={page==='workspace'?'active':''} onClick={()=>setPage('workspace')} aria-label="Overview"><Icon name="grid"/><span>Overview</span></button>
        <button className={page==='candidates'?'active':''} onClick={()=>setPage('candidates')} aria-label="Candidate profiles"><Icon name="users"/><span>Candidate profiles</span><span className="nav-count">{candidates.length}</span></button>
        <button className={page==='database'?'active':''} onClick={openDatabaseTables} aria-label="DBMS Tables"><Icon name="database"/><span>DBMS Tables</span><span className="nav-count">6</span></button>
      </nav>
      <div className="sidebar-bottom">
        <div className="tip-card"><div className="tip-icon"><Icon name="sparkle" size={17}/></div><strong>Better signals.<br/>Better shortlists.</strong><p>Skills are extracted from descriptions using your candidate skill library.</p></div>
        <div className="local-status"><span className="status-led"/><div><strong>Local workspace</strong><small>Connected to MySQL</small></div></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb"><span>Talent tools</span><Icon name="chevron" size={14}/><strong>{page==='workspace'?'Overview':page==='candidates'?'Candidates':'DBMS Tables'}</strong></div><div className="top-actions"><span className="today"><span className="status-led"/>All systems ready</span><button className="avatar avatar-self" aria-label="Local workspace">S</button></div></header>
      <div className="content-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> {page==='database'?'DATABASE BROWSER':'YOUR RECRUITING WORKSPACE'}</div><h1>{page==='workspace'?'Find the right skills.':page==='candidates'?'Your candidate library.':'Database tables.'}</h1><p>{page==='workspace'?'Turn a job description into a clear, skill-based shortlist.':page==='candidates'?'Build a searchable roster of skills and candidate profiles.':'Browse the live contents of every table used by this project.'}</p></div>{page==='database'?<div className="database-actions"><button className="button button-secondary" onClick={loadDatabaseTables} disabled={databaseLoading}><Icon name="database" size={16}/>{databaseLoading?'Loading…':'Refresh tables'}</button><button className="button button-danger" onClick={clearSearchHistory} disabled={!overview.jobCount||historyDeleting}>{historyDeleting?'Deleting…':'Delete search history'}</button></div>:<button className="button button-primary" onClick={()=>{setModalError('');setSkillsText('');setModal(true);}}><Icon name="plus" size={17}/> Add candidate</button>}</section>
        {error&&<div className="alert alert-error"><span>{error}</span><button onClick={()=>setError('')}><Icon name="close" size={16}/></button></div>}
        {notice&&<div className="alert alert-success"><Icon name="check" size={16}/><span>{notice}</span><button onClick={()=>setNotice('')}><Icon name="close" size={16}/></button></div>}
        {page!=='database'&&<section className="metric-row" aria-label="Workspace summary">
          <Metric icon="users" label="Candidate profiles" value={overview.candidateCount} note="Click to view profiles" tone="green" onClick={()=>setSelectedMetric('candidates')}/>
          <Metric icon="bolt" label="Skills indexed" value={overview.skillCount} note="Click to view active skills" tone="amber" onClick={()=>setSelectedMetric('skills')}/>
          <Metric icon="briefcase" label="Jobs analyzed" value={overview.jobCount} note="Click to view recent analyses" tone="blue" onClick={()=>setSelectedMetric('jobs')}/>
          <button type="button" className="metric-card metric-highlight metric-highlight-action" onClick={()=>setSelectedMetric('matching')} aria-label="Open job matching explanation" title="Open job matching explanation"><div className="highlight-orbit orbit-one"/><div className="highlight-orbit orbit-two"/><div className="highlight-content"><div className="highlight-icon"><Icon name="target" size={20}/></div><div><strong>Skill-based matches</strong><p>See the skills behind every candidate score.</p></div></div><span className="highlight-arrow"><Icon name="arrow" size={17}/></span></button>
        </section>}
        {page==='workspace' ? <>
          <section className="analysis-grid">
            <div className="panel analyzer-panel">
              <div className="panel-head"><div><div className="panel-kicker"><span className="kicker-icon"><Icon name="sparkle" size={15}/></span> SKILL ANALYZER</div><h2>Analyze a job description</h2><p>Paste the role details. We’ll identify known skills and rank your candidates.</p></div></div>
              <form onSubmit={analyze} className="job-form">
                <label className="field"><span>ROLE TITLE</span><input name="title" placeholder="e.g. Junior Java Developer" value={jobTitle} onChange={e=>setJobTitle(e.target.value)} required/></label>
                <label className="field"><span>JOB DESCRIPTION <small>{description.length} characters</small></span><textarea ref={descriptionRef} placeholder="Paste the responsibilities and qualifications here..." value={description} onChange={e=>setDescription(e.target.value)} required minLength={20}/></label>
                <div className="form-bottom"><div className="helper-note"><span className="helper-dot">i</span> Skills are matched against your candidate library.</div><button className="button button-primary" type="submit" disabled={busy||!candidates.length}><span>{busy?'Analyzing…':'Analyze & match'}</span><Icon name="arrow" size={17}/></button></div>
                {!candidates.length&&<div className="inline-hint">Add a candidate profile first so the analyzer has skills to recognize.</div>}
              </form>
            </div>
            <div className="panel skills-panel">
              <div className="side-panel-title"><div className="panel-kicker">HOW IT WORKS</div><span className="live-pill"><i/> LIVE</span></div>
              <h3>From words to a<br/><em>clear shortlist.</em></h3>
              <p className="side-copy">A simple, transparent workflow that keeps the matching logic easy to understand.</p>
              <div className="process-list">
                <Process number="01" title="Read the role" text="Paste the job description and add a title." done={!!match}/>
                <Process number="02" title="Extract known skills" text="We find skill names already in your database." done={!!match}/>
                <Process number="03" title="Rank candidates" text="Scores reflect matched skills, not a black box." done={!!match}/>
              </div>
              <div className="privacy-note"><span className="privacy-icon"><Icon name="check" size={14}/></span><span>Local by design <small>Your candidate data stays in your MySQL database.</small></span></div>
            </div>
          </section>
          <section className="results-section">
            <div className="section-title-row"><div><div className="eyebrow"><span className="eyebrow-line"/> SHORTLIST</div><h2>{match?match.title:'Candidate matches'}</h2><p>{match?'Ranked by skills found in the job description.':'Your results will appear here after an analysis.'}</p></div>{match&&<span className="result-count"><Icon name="users" size={15}/>{match.matches.length} profiles ranked</span>}</div>
            {match ? <div className="results-card"><div className="results-card-head"><div><span className="results-label">EXTRACTED SKILLS</span><div className="skill-chips">{match.extractedSkills.map(skill=><span className="skill-chip found" key={skill}><Icon name="check" size={13}/>{skill}</span>)}</div></div><div className="result-meta"><span className="match-spark"><Icon name="sparkle" size={15}/></span><span>Analysis #{String(match.jobId).padStart(3,'0')}</span></div></div>
                {match.matches.length ? <div className="match-list">{match.matches.map((candidate,index)=><MatchRow key={candidate.id} candidate={candidate} index={index}/>)}</div>:<Empty title="No candidate profiles yet" detail="Add profiles with relevant skills to see your shortlist."/>}
              </div> : <div className="empty-results empty-results-action" role="button" tabIndex={0} aria-label="Go to job description" onClick={focusDescription} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();focusDescription();}}}><div className="empty-art"><div className="empty-ring ring-a"/><div className="empty-ring ring-b"/><div className="empty-target"><Icon name="target" size={28}/></div><span className="spark spark-a">✳</span><span className="spark spark-b">✦</span></div><div><strong>Your shortlist starts here</strong><p>Analyze a job description to see the strongest skill matches.</p></div></div>}
          </section>
          <CandidateSection candidates={candidates.slice(0,4)} all={() => setPage('candidates')} remove={removeCandidate}/>
        </> : page==='candidates' ? <CandidateSection candidates={filtered} all={null} query={query} setQuery={setQuery} remove={removeCandidate} full/> : <DatabaseTablesPage tables={databaseTables} loading={databaseLoading} error={databaseError} retry={loadDatabaseTables}/>}
        <footer className="footer"><span>SkillSpring <b>·</b> Java + MySQL course project</span><span>Transparent keyword matching <i>•</i> Local database</span></footer>
      </div>
    </main>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><div className="modal-symbol"><Icon name="users" size={20}/></div><button className="icon-button" onClick={()=>setModal(false)} aria-label="Close"><Icon name="close"/></button></div><div className="eyebrow"><span className="eyebrow-line"/> NEW PROFILE</div><h2 id="modal-title">Add a candidate</h2><p className="modal-copy">Build a simple skill profile to include in future matches.</p><form onSubmit={addCandidate} className="candidate-form"><label className="field"><span>FULL NAME</span><input name="name" placeholder="e.g. Asha Kumar" required maxLength={100}/></label><label className="field"><span>EMAIL ADDRESS</span><input type="email" name="email" placeholder="asha@example.com" required maxLength={150}/></label><label className="field"><span>SKILLS <small>COMMA SEPARATED</small></span><textarea name="skills" value={skillsText} onChange={e=>setSkillsText(e.target.value)} placeholder="Select below or enter exact catalog names" required rows="3"/><small className="catalog-help">Only approved catalog skills are accepted. Unknown names and typos are rejected.</small></label><details className="skill-library"><summary>Browse approved skills <span>{skillCatalog.length} skills</span></summary><div className="catalog-groups">{Object.entries(skillGroups).map(([category,names])=><div className="catalog-group" key={category}><strong>{category}</strong><div>{names.map(skill=><button type="button" className={`catalog-chip ${skillsText.split(',').some(value=>value.trim().toLowerCase()===skill.toLowerCase())?'selected':''}`} key={skill} onClick={()=>addCatalogSkill(skill)}>{skill}</button>)}</div></div>)}</div></details>{modalError&&<div className="alert alert-error modal-alert" role="alert">{modalError}</div>}<div className="modal-foot"><span><Icon name="check" size={14}/> Stored in your local database</span><button className="button button-primary" disabled={busy}>{busy?'Saving…':'Save profile'}<Icon name="arrow" size={16}/></button></div></form></section></div>}
    {selectedMetric&&<MetricDetails type={selectedMetric} overview={overview} candidates={candidates} skillUsage={skillUsage} onClose={()=>setSelectedMetric(null)}/>}
  </div>;
}
function Metric({icon,label,value,note,tone,onClick}) { return <button type="button" className="metric-card metric-clickable" onClick={onClick} aria-label={`View ${label.toLowerCase()} details`}><div className={`metric-icon ${tone}`}><Icon name={icon} size={19}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}<span className="metric-trend"><Icon name="arrow" size={12}/></span></div><div className="metric-note">{note}</div></button>; }
function MetricDetails({type,overview,candidates,skillUsage,onClose}) {
  const copy={
    candidates:{icon:'users',title:'Candidate profiles',summary:`${overview.candidateCount} profiles are saved in your candidate library.`,detail:'Each profile includes contact information and approved skills used in job matching.'},
    skills:{icon:'bolt',title:'Skills indexed',summary:`${overview.skillCount} distinct approved skills are attached to current candidate profiles.`,detail:'A skill stays active while at least one candidate profile uses it.'},
    jobs:{icon:'briefcase',title:'Jobs analyzed',summary:`${overview.jobCount} job descriptions have been analyzed and saved.`,detail:'Here are the latest analyses recorded in your workspace.'},
    matching:{icon:'target',title:'How job matching works',summary:'The shortlist is based on approved skills found in the job description.',detail:'The analyzer checks the description against the skill catalog used by candidate profiles. Candidates are ranked by how many of those skills match; the percentage shows matched skills compared with the skills extracted for that job.'}
  }[type];
  return <div className="detail-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div className="modal-top"><div className="detail-heading"><div className="modal-symbol"><Icon name={copy.icon} size={20}/></div><div><span className="panel-kicker">WORKSPACE DETAILS</span><h2 id="detail-title">{copy.title}</h2></div></div><button className="icon-button" onClick={onClose} aria-label="Close details"><Icon name="close"/></button></div><p className="detail-summary">{copy.summary}</p><p className="detail-copy">{copy.detail}</p><div className="detail-body">
    {type==='candidates'&&(candidates.length?<div className="detail-list">{candidates.map(candidate=><article className="detail-row candidate-detail" key={candidate.id}><div className="detail-row-head"><div className="avatar candidate-avatar sage">{initials(candidate.name)}</div><div className="detail-person"><strong>{candidate.name}</strong><span>{candidate.email}</span></div><span className="detail-count">{candidate.skills.length} skills</span></div><div className="skill-chips detail-skills">{candidate.skills.length?candidate.skills.map(skill=><span className="skill-chip" key={skill}>{skill}</span>):<span className="detail-empty-inline">No skills added yet</span>}</div></article>)}</div>:<DetailEmpty text="No candidate profiles yet. Add a profile to start your library."/>)}
    {type==='skills'&&(skillUsage.length?<div className="detail-list">{skillUsage.map(skill=><article className="detail-row skill-detail" key={skill.name}><div><strong>{skill.name}</strong><span>{skill.category}</span></div><span className="detail-count">Used by {skill.count} {skill.count===1?'profile':'profiles'}</span></article>)}</div>:<DetailEmpty text="No active skills yet. Add approved skills to a candidate profile."/>)}
    {type==='jobs'&&(overview.recentJobs.length?<div className="detail-list">{overview.recentJobs.map(job=><article className="detail-row job-detail" key={job.id}><div className="job-detail-icon"><Icon name="briefcase" size={16}/></div><div><strong>{job.title}</strong><span>Analysis #{String(job.id).padStart(3,'0')} · {formatDate(job.createdAt)}</span></div></article>)}</div>:<DetailEmpty text="No job descriptions analyzed yet. Results will appear here after your first analysis."/>)}
    {type==='matching'&&<div className="detail-list"><article className="detail-row"><div><strong>1. Read the description</strong><span>Find known skill names from the approved catalog.</span></div></article><article className="detail-row"><div><strong>2. Compare candidate profiles</strong><span>Check each profile for the extracted skills.</span></div></article><article className="detail-row"><div><strong>3. Rank by match</strong><span>Show matched skills and a percentage for each candidate.</span></div></article></div>}
    </div><div className="detail-foot"><span><Icon name="check" size={14}/> Up to date with your local database</span><button className="button button-primary" onClick={onClose}>Done</button></div></section></div>;
}
function DetailEmpty({text}) { return <div className="detail-empty"><Icon name="sparkle" size={18}/><p>{text}</p></div>; }
function formatDate(value) { const date=new Date(value); return Number.isNaN(date.getTime())?value:date.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}); }
function Process({number,title,text,done}) { return <div className={`process-item ${done?'complete':''}`}><div className="process-number">{done?<Icon name="check" size={13}/>:number}</div><div><strong>{title}</strong><p>{text}</p></div><span className="process-state">{done?'DONE':'READY'}</span></div>; }
function MatchRow({candidate,index}) { return <div className="match-row"><div className={`rank-number ${index===0?'top':''}`}>{String(index+1).padStart(2,'0')}</div><div className={`avatar candidate-avatar ${colors[index%colors.length]}`}>{initials(candidate.name)}</div><div className="match-person"><strong>{candidate.name}</strong><span><Icon name="mail" size={13}/>{candidate.email}</span></div><div className="matched-skills">{candidate.matchedSkills.length?candidate.matchedSkills.map(skill=><span key={skill}>{skill}</span>):<small>No matching skills</small>}</div><div className="score-wrap"><div className="score-track"><span style={{width:`${candidate.score}%`}}/></div><strong>{candidate.score}%</strong></div></div>; }
function CandidateSection({candidates,all,remove,query,setQuery,full=false}) { return <section className={`candidate-section ${full?'full':''}`}><div className="section-title-row compact"><div><div className="eyebrow"><span className="eyebrow-line"/> TALENT POOL</div><h2>{full?'Candidate profiles':'Recently added'}</h2><p>{full?'Every profile contributes skills to the extraction library.':'A quick look at the latest profiles in your workspace.'}</p></div>{all&&<button className="text-link" onClick={all}>View all profiles <Icon name="arrow" size={15}/></button>}{full&&<label className="search-box"><Icon name="search" size={16}/><input placeholder="Search names or skills" value={query} onChange={e=>setQuery(e.target.value)}/></label>}</div>
  {candidates.length ? <div className="profiles-grid">{candidates.map((c,i)=><article className="profile-card" key={c.id}><div className="profile-head"><div className={`avatar candidate-avatar ${colors[i%colors.length]}`}>{initials(c.name)}</div><button className="remove-button" title="Remove candidate" onClick={()=>remove(c.id)}><Icon name="close" size={15}/></button></div><h3>{c.name}</h3><p className="profile-email"><Icon name="mail" size={13}/>{c.email}</p><div className="profile-divider"/><div className="profile-skill-label">SKILLS <span>{c.skills.length}</span></div><div className="skill-chips profile-chips">{c.skills.map(skill=><span className="skill-chip" key={skill}>{skill}</span>)}</div></article>)}</div> : <div className="no-profiles"><div className="no-profiles-icon"><Icon name="users" size={22}/></div><div><strong>{query?'No profiles match that search':'Your talent pool is ready to grow'}</strong><p>{query?'Try a different name, email or skill.':'Add a candidate and their skills to make your first match.'}</p></div></div>}
</section>; }
function DatabaseTablesPage({tables,loading,error,retry}) {
  const rowTotal=tables.reduce((total,table)=>total+table.rowCount,0);
  return <section className="database-page">
    <div className="database-summary"><div className="database-summary-icon"><Icon name="database" size={20}/></div><div className="database-summary-copy"><strong>Project database</strong><p>Read-only view of the tables backing candidate profiles and job matching.</p></div><div className="database-summary-count"><strong>{tables.length}</strong><span>tables</span><i/><strong>{rowTotal}</strong><span>rows</span></div></div>
    {loading?<div className="database-message">Loading table contents…</div>:error?<div className="database-message database-message-error"><span>{error}</span><button className="button button-primary" onClick={retry}>Try again</button></div>:tables.map(table=><DatabaseTable key={table.name} table={table}/>)}
  </section>;
}
function DatabaseTable({table}) {
  return <article className="database-table-card"><div className="database-table-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> TABLE</div><h2>{table.name}</h2></div><span className="database-row-count">{table.rowCount} {table.rowCount===1?'row':'rows'} · {table.columns.length} columns</span></div><div className="database-table-scroll"><table className="database-table"><thead><tr>{table.columns.map(column=><th key={column.name}>{column.name}<small>{column.type}</small></th>)}</tr></thead><tbody>{table.rows.length?table.rows.map((row,index)=><tr key={`${table.name}-${index}`}>{table.columns.map(column=>{const value=row[column.name];return <td key={column.name}>{value===null?<span className="database-null">NULL</span>:<span className="database-cell-value" title={String(value)}>{String(value)}</span>}</td>;})}</tr>):<tr><td className="database-no-rows" colSpan={Math.max(1,table.columns.length)}>No records in this table yet.</td></tr>}</tbody></table></div></article>;
}
function Empty({title,detail}) { return <div className="empty-state"><div className="empty-state-icon"><Icon name="users" size={20}/></div><strong>{title}</strong><p>{detail}</p></div>; }

createRoot(document.getElementById('root')).render(<App/>);




