'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [aircraft, setAircraft] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [radiusMi, setRadiusMi] = useState<number | ''>('');
  const [minLevel, setMinLevel] = useState('C');
  const [instrument, setInstrument] = useState(true);
  const [multi, setMulti] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sugs, setSugs] = useState<{label:string;codes:string[]}[]>([]);
  const [showSugs, setShowSugs] = useState(false);
  const [meta, setMeta] = useState<{lastModifiedMs:number|null}>({lastModifiedMs:null});

  useEffect(() => { (async () => { try { const r=await fetch('/api/meta'); const j=await r.json(); setMeta(j); } catch {} })(); }, []);

  async function onAircraftChange(v: string) {
    setAircraft(v);
    if (v.length >= 2) {
      try { const r=await fetch('/api/suggest?q='+encodeURIComponent(v)); const j=await r.json(); setSugs(j.suggestions||[]); setShowSugs(true); }
      catch { setSugs([]); setShowSugs(false); }
    } else { setSugs([]); setShowSugs(false); }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setResults([]);
    const params = new URLSearchParams({ aircraft, state, city, radiusMi: String(radiusMi||''), minLevel, instrument: String(instrument), multi: String(multi) });
    const res = await fetch('/api/search?' + params.toString());
    const json = await res.json();
    setResults(json.results || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Find a qualified pilot</h1>
      <div className="text-xs text-gray-600">Dataset last modified: {meta.lastModifiedMs ? new Date(meta.lastModifiedMs).toLocaleString() : '—'}</div>

      <form onSubmit={search} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        <label className="col-span-2">
          <div className="text-sm font-medium">Aircraft (model or type rating)</div>
          <div className="relative">
            <input value={aircraft} onChange={e=>onAircraftChange(e.target.value)} placeholder="e.g., Citation M2 or CE-525S" className="w-full border rounded px-3 py-2" onFocus={()=>{ if(sugs.length) setShowSugs(true); }} onBlur={()=>setTimeout(()=>setShowSugs(false), 150)} />
            {showSugs && sugs.length > 0 && (
              <div className="absolute z-10 mt-1 w-full border bg-white rounded shadow">
                {sugs.map((s,i)=> (
                  <button key={i} type="button" onMouseDown={()=>{ setAircraft(s.label); setShowSugs(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-gray-600">codes: {s.codes.join(', ')}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>
        <label>
          <div className="text-sm font-medium">State (optional)</div>
          <input value={state} onChange={e=>setState(e.target.value.toUpperCase())} placeholder="FL" maxLength={2} className="w-full border rounded px-3 py-2"/>
        </label>
        <label>
          <div className="text-sm font-medium">City (optional)</div>
          <input value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g., Fort Lauderdale" className="w-full border rounded px-3 py-2"/>
        </label>
        <label>
          <div className="text-sm font-medium">Radius (mi, optional)</div>
          <input value={radiusMi} onChange={e=>setRadiusMi(e.target.value ? Number(e.target.value) : '')} placeholder="250" className="w-full border rounded px-3 py-2" />
        </label>
        <label>
          <div className="text-sm font-medium">Min cert level</div>
          <select value={minLevel} onChange={e=>setMinLevel(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="S">Student</option>
            <option value="T">Sport</option>
            <option value="V">Recreational</option>
            <option value="P">Private</option>
            <option value="C">Commercial</option>
            <option value="A">ATP</option>
          </select>
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2"><input type="checkbox" checked={instrument} onChange={e=>setInstrument(e.target.checked)}/> Instrument</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={multi} onChange={e=>setMulti(e.target.checked)}/> Multiengine</label>
          <button type="submit" className="ml-auto px-4 py-2 rounded bg-black text-white">{loading ? 'Searching…' : 'Search'}</button>
        </div>
      </form>

      <div className="text-xs text-gray-500">Not a verification source. Always confirm via FAA PRD & operator checks.</div>

      <ul className="divide-y">
        {results.map((r, i) => (
          <li key={i} className="py-3">
            <div className="font-medium">{r.firstName} {r.lastName} {r.state ? <span className="text-gray-500">· {r.city}, {r.state}</span> : null}</div>
            <div className="text-sm text-gray-700">Levels: {r.certificateLevels?.join(', ') || '—'} · Ratings: {r.ratings?.slice(0,6).join(', ')}</div>
            {r.typeRatings?.length ? <div className="text-sm">Type ratings: {r.typeRatings.slice(0,8).join(', ')}{r.typeRatings.length>8?'…':''}</div> : null}
            <div className="text-xs mt-1"><a className="underline" href="https://amsrvs.registry.faa.gov/airmeninquiry/" target="_blank" rel="noreferrer">Open FAA Airmen Inquiry</a></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
