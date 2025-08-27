import React, { useMemo, useState } from "react";

// Single-file React mockup of a gated implant registry MVP (reworked)
// Tailwind classes are used for styling. No external UI libs required.

// --- utils ---
function uuidv4() {
  // RFC4122 v4
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const toHex = (n) => n.toString(16).padStart(2, "0");
  const b = Array.from(bytes).map(toHex).join("");
  return `${b.slice(0,8)}-${b.slice(8,12)}-${b.slice(12,16)}-${b.slice(16,20)}-${b.slice(20)}`;
}

async function sha256Hex(input) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function truncate(str, n = 10) {
  if (!str) return "";
  if (str.length <= n) return str;
  return str.slice(0, Math.max(4, Math.floor(n/2))) + "…" + str.slice(-4);
}

function Section({ title, children, right }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={
        "w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
        (props.className || "")
      }
    />
  );
}

function Button({ children, variant = "primary", className = "", ...rest }) {
  const base =
    "px-4 py-2 rounded-xl text-sm font-medium transition active:translate-y-[1px]";
  const styles = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500",
    ghost:
      "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    indigo: "bg-indigo-100 text-indigo-800",
    amber: "bg-amber-100 text-amber-800",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>;
}

export default function App() {
  const [tab, setTab] = useState("register");

  // --- providers ---
  // {id: uuid, name, licenseId, office, active, createdAt}
  const [providers, setProviders] = useState([]);
  const [current, setCurrent] = useState(null); // provider id

  const currentProvider = useMemo(
    () => providers.find(p => p.id === current) || null,
    [providers, current]
  );

  // --- patients ---
  // {id: uuid, name, dob, email, createdAt, createdBy}
  const [patients, setPatients] = useState([]);
  // index key = sha256(lower(name)|dob|lower(email)) -> patientId
  const [patientIndex, setPatientIndex] = useState({});

  // profiles (for research)
  // profiles[patientId] = { age, sex, history }
  const [patientProfiles, setPatientProfiles] = useState({});

  // --- records (placements & removals) ---
  // {patientId, kind:'PLACEMENT'|'REMOVAL', payload, providerId, timestamp}
  const [records, setRecords] = useState([]);

  // --- audits ---
  // {type:'SEARCH'|'PLACEMENT'|'REMOVAL', providerId, patientId, patientName?, location?, timestamp}
  const [audits, setAudits] = useState([]);

  // --- register form ---
  const [pName, setPName] = useState("");
  const [pLicense, setPLicense] = useState("");
  const [pOffice, setPOffice] = useState("");

  function demoProvider() {
    setPName("Dr. Jane Doe");
    setPLicense("ABC-12345");
    setPOffice("220 King St W, Toronto");
  }

  function handleRegister() {
    if (!pName || !pLicense || !pOffice) return alert("Fill all fields");
    const provider = {
      id: uuidv4(),
      name: pName.trim(),
      licenseId: pLicense.trim(),
      office: pOffice.trim(),
      active: true,
      createdAt: Date.now(),
    };
    setProviders(prev => [provider, ...prev]);
    setPName(""); setPLicense(""); setPOffice("");
    setCurrent(provider.id);
    setTab("log");
  }

  function toggleProviderActive(id) {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  }

  // --- log page state ---
  const [logMode, setLogMode] = useState("PLACEMENT");
  const [usePID, setUsePID] = useState(false);
  // identifiers path
  const [ptName, setPtName] = useState("");
  const [ptDOB, setPtDOB] = useState("");
  const [ptEmail, setPtEmail] = useState("");
  // patientId path
  const [ptPID, setPtPID] = useState("");
  const [foundPatient, setFoundPatient] = useState(null); // patient object
  const [expectedPID, setExpectedPID] = useState(""); // if identifiers matched an existing person, we ask for PID

  // placement fields
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [lot, setLot] = useState("");
  const [diameter, setDiameter] = useState("");
  const [length, setLength] = useState("");
  const [location, setLocation] = useState("");
  const [placementDate, setPlacementDate] = useState(new Date().toISOString().slice(0,10));
  const [entryMethod, setEntryMethod] = useState("manual");

  // removal fields
  const [rLocation, setRLocation] = useState("");
  const [removalDate, setRemovalDate] = useState(new Date().toISOString().slice(0,10));
  const [rReason, setRReason] = useState("Peri-implantitis");

  // post-log panel
  const [lastLoggedPID, setLastLoggedPID] = useState("");

  function loggedInBadge() {
    if (!currentProvider) return <span className="text-sm text-slate-500">Not logged in</span>;
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2.5 h-2.5 rounded-full ${currentProvider.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        <span className="text-slate-700 truncate max-w-[12rem]">{currentProvider.name}</span>
        <code className="text-xs text-slate-500">{truncate(currentProvider.id, 16)}</code>
        <Button variant="ghost" onClick={() => setCurrent(null)}>Log out</Button>
      </div>
    );
  }

  async function idKey(name, dob, email) {
    return sha256Hex(`${name.trim().toLowerCase()}|${dob.trim()}|${email.trim().toLowerCase()}`);
  }

  async function findByIdentifiers(name, dob, email) {
    const key = await idKey(name, dob, email);
    const pid = patientIndex[key];
    if (!pid) return null;
    return patients.find(p => p.id === pid) || null;
  }

  async function handleFindPatient() {
    setFoundPatient(null); setExpectedPID(""); setLastLoggedPID("");
    if (!currentProvider || !currentProvider.active) { alert("Login as an active provider"); return; }

    if (usePID) {
      if (!ptPID || !ptEmail) return alert("Enter Patient ID and email");
      const p = patients.find(x => x.id === ptPID && x.email.trim().toLowerCase() === ptEmail.trim().toLowerCase());
      if (!p) { alert("No match for Patient ID + email"); return; }
      setFoundPatient(p);
      return;
    }

    if (!ptName || !ptDOB || !ptEmail) return alert("Enter name, DOB, and email");
    const existing = await findByIdentifiers(ptName, ptDOB, ptEmail);
    if (existing) {
      setExpectedPID(existing.id);
      alert("Existing patient found. Enter their Patient ID to confirm.");
      return;
    }
    // allow creation
    const ok = confirm("No patient found. Create new patient?");
    if (!ok) return;
    const newId = uuidv4();
    const now = Date.now();
    const p = { id: newId, name: ptName.trim(), dob: ptDOB.trim(), email: ptEmail.trim(), createdAt: now, createdBy: currentProvider.id };
    setPatients(prev => [p, ...prev]);
    const key = await idKey(ptName, ptDOB, ptEmail);
    setPatientIndex(prev => ({ ...prev, [key]: newId }));
    setFoundPatient(p);
    setPtPID(newId);
  }

  function confirmPID() {
    if (!ptPID) return alert("Enter Patient ID");
    if (ptPID !== expectedPID) return alert("Patient ID does not match");
    const p = patients.find(x => x.id === ptPID);
    if (!p) return alert("Patient not found");
    setFoundPatient(p);
    setExpectedPID("");
  }

  function mockScanFill() {
    const today = new Date().toISOString().slice(0,10);
    setBrand("Straumann");
    setModel("BLT");
    setLot("LOT-" + Math.random().toString(36).slice(2,7).toUpperCase());
    setDiameter("4.1");
    setLength("10");
    setLocation("UR 2.5");
    setPlacementDate(today);
    setEntryMethod("scanned");
  }

  function autofillRemoval() {
    setRLocation("UR 2.5");
    setRemovalDate(new Date().toISOString().slice(0,10));
    setRReason("Fracture");
  }

  function afterWrite(pid, type, loc) {
    setAudits(prev => [{ type, providerId: currentProvider.id, patientId: pid, patientName: foundPatient?.name || ptName, location: loc, timestamp: Date.now() }, ...prev]);
    setLastLoggedPID(pid);
  }

  function handleLogPlacement() {
    if (!foundPatient) return alert("Find or create the patient first");
    if (!brand || !model || !lot || !diameter || !length || !location || !placementDate) return alert("Fill all fields");
    const payload = { brand, model, lot, diameter, length, location, placementDate, entryMethod };
    setRecords(prev => [{ patientId: foundPatient.id, kind: 'PLACEMENT', payload, providerId: currentProvider.id, timestamp: Date.now() }, ...prev]);
    afterWrite(foundPatient.id, 'PLACEMENT', location);
    alert("Implant logged");
  }

  function handleLogPlacementAnother() {
    const ok = brand && model && lot && diameter && length && location && placementDate && foundPatient;
    if (!ok) return handleLogPlacement();
    handleLogPlacement();
    setBrand(""); setModel(""); setLot(""); setDiameter(""); setLength(""); setLocation(""); setEntryMethod("manual");
  }

  function handleLogRemoval() {
    if (!foundPatient) return alert("Find or create the patient first");
    if (!rLocation || !removalDate || !rReason) return alert("Fill all required fields");
    const payload = { location: rLocation, removalDate, reason: rReason };
    setRecords(prev => [{ patientId: foundPatient.id, kind: 'REMOVAL', payload, providerId: currentProvider.id, timestamp: Date.now() }, ...prev]);
    afterWrite(foundPatient.id, 'REMOVAL', rLocation);
    alert("Removal logged");
  }

  function goToPatientPortal(pid) {
    setTab("patient-portal");
    setPPPID(pid);
    setReferred({ by: currentProvider?.name || "", pid });
  }

  function copyPID(pid) {
    navigator.clipboard.writeText(pid).then(() => alert("Copied"));
  }

  // --- search page state ---
  const [sUsePID, setSUsePID] = useState(false);
  const [sPID, setSPID] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sName, setSName] = useState("");
  const [sDOB, setSDOB] = useState("");
  const [searchRes, setSearchRes] = useState(null); // { status, list, selected }

  async function handleSearch() {
    setSearchRes(null);
    if (!currentProvider || !currentProvider.active) { alert("Login as an active provider"); return; }

    let pid = ""; let p = null;
    if (sUsePID) {
      if (!sPID || !sEmail) return alert("Enter Patient ID and email");
      p = patients.find(x => x.id === sPID && x.email.trim().toLowerCase() === sEmail.trim().toLowerCase());
      if (!p) { setSearchRes({ status: 'NOT_FOUND' }); setAudits(prev => [{ type: 'SEARCH', providerId: currentProvider.id, patientId: sPID, timestamp: Date.now() }, ...prev]); return; }
      pid = p.id;
    } else {
      if (!sName || !sDOB || !sEmail) return alert("Enter name, DOB, and email");
      p = await findByIdentifiers(sName, sDOB, sEmail);
      if (!p) { setSearchRes({ status: 'NOT_FOUND' }); return; }
      pid = p.id;
    }

    const list = records.filter(r => r.patientId === pid);
    setSearchRes({ status: 'OK', list, selected: -1, patient: p });
    setAudits(prev => [{ type: 'SEARCH', providerId: currentProvider.id, patientId: pid, patientName: p?.name || '', timestamp: Date.now() }, ...prev]);
  }

  // --- patient portal ---
  const [ppPID, setPPPID] = useState("");
  const [ppEmail, setPPEmail] = useState("");
  const [ppAuthed, setPPAuthed] = useState(false);
  const [ppTab, setPPTab] = useState("history");
  const [ppSelected, setPPSelected] = useState(-1);
  const [ppEditing, setPPEditing] = useState(false);
  const [referred, setReferred] = useState(null); // {by, pid}

  function ppSignIn() {
    const p = patients.find(x => x.id === ppPID && x.email.trim().toLowerCase() === ppEmail.trim().toLowerCase());
    if (!p) return alert("No match for Patient ID + email");
    setPPAuthed(true);
    if (referred && referred.pid === ppPID) {
      alert(`You have been sent here by ${referred.by}. Please confirm.`);
      setReferred(null);
    }
  }

  function savePatientProfile() {
    if (!ppAuthed) return;
    const age = parseInt((document.getElementById('pp-age')?.value || '').toString(), 10);
    const sex = (document.getElementById('pp-sex')?.value || 'unknown').toString();
    const history = (document.getElementById('pp-history')?.value || '').toString();
    setPatientProfiles(prev => ({ ...prev, [ppPID]: { age: isNaN(age) ? undefined : age, sex, history } }));
    alert("Saved");
    setPPEditing(false);
  }

  // --- derived views ---
  const providerHistory = useMemo(() => {
    if (!currentProvider) return [];
    return audits.filter(a => a.providerId === currentProvider.id);
  }, [audits, currentProvider]);

  const patientHistory = useMemo(() => records.filter(r => r.patientId === ppPID), [records, ppPID]);

  // --- small display helpers ---
  function KindBadge({ kind }) {
    const tone = kind === 'PLACEMENT' ? 'indigo' : 'amber';
    return <Pill tone={tone}>{kind}</Pill>;
  }

  function QR({ pid, onClick }) {
    // Simple placeholder QR
    return (
      <button onClick={onClick} className="w-28 h-28 rounded-lg border border-slate-300 bg-[conic-gradient(at_20%_20%,_#000_25%,_#fff_0_50%,_#000_0_75%,_#fff_0)] bg-[length:12px_12px]" title="Open patient portal" />
    );
  }

  // --- UI ---
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Implant Registry MVP</div>
          {loggedInBadge()}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Section title="Navigation">
            <div className="grid gap-2">
              {[
                ["register", "Register dentist"],
                ["log", "Log"],
                ["search", "Search implant"],
                ["provider-history", "Provider history"],
                ["patient-portal", "Patient portal"],
                ["research", "Research portal"],
              ].map(([k, label]) => (
                <Button key={k} variant={tab === k ? "primary" : "ghost"} onClick={() => setTab(k)}>
                  {label}
                </Button>
              ))}
            </div>
          </Section>

          <Section title="Providers">
            <div>
              {providers.length === 0 ? (
                <div className="text-sm text-slate-500">No providers yet</div>
              ) : (
                providers.map(p => (
                  <div key={p.id} className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-start py-3">
                    <div className="sm:col-span-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`w-2.5 h-2.5 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="font-medium truncate">{p.name}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">License {p.licenseId}</div>
                      <div className="text-xs text-slate-600">Office {p.office}</div>
                      <code className="text-xs text-slate-500 break-all">{p.id}</code>
                    </div>
                    <div className="sm:col-span-1 flex sm:justify-end gap-2 flex-wrap">
                      <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setCurrent(p.id)}>Login</Button>
                      <Button variant={p.active ? 'danger' : 'primary'} className="px-3 py-1.5 text-xs" onClick={() => toggleProviderActive(p.id)}>{p.active ? 'Suspend' : 'Activate'}</Button>
                    </div>
                    <div className="border-b border-slate-200 sm:col-span-3" />
                  </div>
                ))
              )}
            </div>
          </Section>
        </div>

        <div className="lg:col-span-3 grid gap-6">
          {tab === 'register' && (
            <Section title="Register a new dentist" right={<Button variant="ghost" onClick={demoProvider}>Use demo data</Button>}>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Full name">
                  <Input value={pName} onChange={e => setPName(e.target.value)} placeholder="Dr. Jane Doe" />
                </Field>
                <Field label="License ID">
                  <Input value={pLicense} onChange={e => setPLicense(e.target.value)} placeholder="ABC-12345" />
                </Field>
                <Field label="Office address">
                  <Input value={pOffice} onChange={e => setPOffice(e.target.value)} placeholder="123 Main St, City" />
                </Field>
              </div>
              <div className="mt-4">
                <Button onClick={handleRegister}>Register and login</Button>
              </div>
              <p className="mt-4 text-sm text-slate-600">Provider IDs are UUIDs. No wallets in this demo.</p>
            </Section>
          )}

          {tab === 'log' && (
            <Section title="Log implant or removal" right={<div className="text-sm text-slate-500">Writes require a logged-in active provider</div>}>
              {!currentProvider ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">Login as a registered provider first.</div>
              ) : !currentProvider.active ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm">Provider is suspended.</div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Button variant={logMode === 'PLACEMENT' ? 'primary' : 'ghost'} onClick={() => setLogMode('PLACEMENT')}>Placement</Button>
                    <Button variant={logMode === 'REMOVAL' ? 'primary' : 'ghost'} onClick={() => setLogMode('REMOVAL')}>Removal</Button>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-medium">Find or create patient</span>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={usePID} onChange={e => setUsePID(e.target.checked)} /> Use Patient ID</label>
                    </div>
                    {usePID ? (
                      <div className="grid md:grid-cols-3 gap-4">
                        <Field label="Patient ID"><Input value={ptPID} onChange={e => setPtPID(e.target.value)} placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" /></Field>
                        <Field label="Email"><Input value={ptEmail} onChange={e => setPtEmail(e.target.value)} placeholder="name@email.com" /></Field>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-3 gap-4">
                        <Field label="Full name"><Input value={ptName} onChange={e => setPtName(e.target.value)} placeholder="John Smith" /></Field>
                        <Field label="DOB"><Input type="date" value={ptDOB} onChange={e => setPtDOB(e.target.value)} /></Field>
                        <Field label="Email"><Input value={ptEmail} onChange={e => setPtEmail(e.target.value)} placeholder="name@email.com" /></Field>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button variant="ghost" onClick={handleFindPatient}>Find patient</Button>
                      {expectedPID && (
                        <>
                          <Field label="Confirm Patient ID"><Input value={ptPID} onChange={e => setPtPID(e.target.value)} placeholder="Enter Patient ID" /></Field>
                          <Button onClick={confirmPID}>Confirm</Button>
                        </>
                      )}
                      {foundPatient && <Pill tone="indigo">Found: {foundPatient.name} · {truncate(foundPatient.id,16)}</Pill>}
                    </div>
                  </div>

                  {foundPatient && logMode === 'PLACEMENT' && (
                    <>
                      <div className="grid md:grid-cols-3 gap-4 mt-2">
                        <Field label="Brand"><Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Straumann" /></Field>
                        <Field label="Model"><Input value={model} onChange={e => setModel(e.target.value)} placeholder="BLT" /></Field>
                        <Field label="Lot number"><Input value={lot} onChange={e => setLot(e.target.value)} placeholder="ABC123" /></Field>
                        <Field label="Diameter (mm)"><Input value={diameter} onChange={e => setDiameter(e.target.value)} placeholder="4.1" /></Field>
                        <Field label="Length (mm)"><Input value={length} onChange={e => setLength(e.target.value)} placeholder="10" /></Field>
                        <Field label="Placement date"><Input type="date" value={placementDate} onChange={e => setPlacementDate(e.target.value)} /></Field>
                        <Field label="Location (tooth/region)"><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="UR 2.5 or upper right" /></Field>
                      </div>
                      <div className="mt-4 flex gap-3 flex-wrap">
                        <Button onClick={handleLogPlacement}>Log implant</Button>
                        <Button variant="ghost" onClick={handleLogPlacementAnother}>Log implant + another</Button>
                        <Button variant="ghost" onClick={mockScanFill}>Scan barcode</Button>
                      </div>
                    </>
                  )}

                  {foundPatient && logMode === 'REMOVAL' && (
                    <>
                      <div className="grid md:grid-cols-3 gap-4 mt-2">
                        <Field label="Removal date"><Input type="date" value={removalDate} onChange={e => setRemovalDate(e.target.value)} /></Field>
                        <Field label="Location (tooth/region)"><Input value={rLocation} onChange={e => setRLocation(e.target.value)} placeholder="UR 2.5 or upper right" /></Field>
                        <Field label="Reason for extraction">
                          <select className="px-3 py-2 rounded-xl border border-slate-300 w-full" value={rReason} onChange={e => setRReason(e.target.value)}>
                            <option>Peri-implantitis</option>
                            <option>Fracture</option>
                            <option>Other</option>
                          </select>
                        </Field>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button onClick={handleLogRemoval}>Log removal</Button>
                        <Button variant="ghost" onClick={autofillRemoval}>Demo fill</Button>
                      </div>
                    </>
                  )}

                  {lastLoggedPID && (
                    <div className="mt-6 p-4 border border-slate-200 rounded-xl">
                      <div className="text-sm font-medium mb-2">Share with patient</div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <QR pid={lastLoggedPID} onClick={() => goToPatientPortal(lastLoggedPID)} />
                        <div>
                          <div className="text-sm">URL</div>
                          <button onClick={() => goToPatientPortal(lastLoggedPID)} className="text-indigo-600 underline">implantregistry.com/{lastLoggedPID}</button>
                          <div className="mt-2 text-sm flex items-center gap-2">
                            <span>Patient ID</span>
                            <code className="px-2 py-1 bg-slate-100 rounded">{lastLoggedPID}</code>
                            <Button variant="ghost" className="px-2 py-1" onClick={() => copyPID(lastLoggedPID)}>Copy</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Section>
          )}

          {tab === 'search' && (
            <Section title="Search implant" right={<div className="text-sm text-slate-500">Reads require a logged-in active provider</div>}>
              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sUsePID} onChange={e => setSUsePID(e.target.checked)} /> Use Patient ID</label>
              </div>
              {sUsePID ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Patient ID"><Input value={sPID} onChange={e => setSPID(e.target.value)} placeholder="uuid" /></Field>
                  <Field label="Email"><Input value={sEmail} onChange={e => setSEmail(e.target.value)} placeholder="name@email.com" /></Field>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  <Field label="Full name"><Input value={sName} onChange={e => setSName(e.target.value)} placeholder="John Smith" /></Field>
                  <Field label="DOB"><Input type="date" value={sDOB} onChange={e => setSDOB(e.target.value)} /></Field>
                  <Field label="Email"><Input value={sEmail} onChange={e => setSEmail(e.target.value)} placeholder="name@email.com" /></Field>
                </div>
              )}
              <div className="mt-3"><Button onClick={handleSearch}>Search</Button></div>

              {searchRes && (
                <div className="mt-4">
                  {searchRes.status === 'NOT_FOUND' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">No records found.</div>
                  )}
                  {searchRes.status === 'OK' && (
                    <div className="grid gap-2">
                      {searchRes.list.map((rec, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <KindBadge kind={rec.kind} />
                              {rec.kind === 'PLACEMENT' ? (
                                <>
                                  <div><span className="text-slate-500">Date</span> <span className="font-medium">{rec.payload.placementDate}</span></div>
                                  <div className="ml-4"><span className="text-slate-500">Location</span> <span className="font-medium">{rec.payload.location}</span></div>
                                </>
                              ) : (
                                <>
                                  <div><span className="text-slate-500">Date</span> <span className="font-medium">{rec.payload.removalDate}</span></div>
                                  <div className="ml-4"><span className="text-slate-500">Location</span> <span className="font-medium">{rec.payload.location}</span></div>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {rec.kind === 'PLACEMENT' && (
                                <Button variant="ghost" onClick={() => { setTab('log'); setLogMode('REMOVAL'); setFoundPatient(searchRes.patient); setPtPID(searchRes.patient.id); setUsePID(true); setPtEmail(searchRes.patient.email); }}>Add extraction</Button>
                              )}
                              <Button variant="ghost" onClick={() => setSearchRes(prev => ({ ...prev, selected: prev.selected === idx ? -1 : idx }))}>{searchRes.selected === idx ? 'Hide' : 'View'}</Button>
                            </div>
                          </div>
                          {searchRes.selected === idx && (
                            <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                              {rec.kind === 'PLACEMENT' ? (
                                <>
                                  <div><span className="text-slate-500">Brand</span><div className="font-medium">{rec.payload.brand}</div></div>
                                  <div><span className="text-slate-500">Model</span><div className="font-medium">{rec.payload.model}</div></div>
                                  <div><span className="text-slate-500">Lot</span><div className="font-medium">{rec.payload.lot}</div></div>
                                  <div><span className="text-slate-500">Diameter</span><div className="font-medium">{rec.payload.diameter} mm</div></div>
                                  <div><span className="text-slate-500">Length</span><div className="font-medium">{rec.payload.length} mm</div></div>
                                  <div><span className="text-slate-500">Entry method</span><div className="font-medium capitalize">{rec.payload.entryMethod}</div></div>
                                </>
                              ) : (
                                <>
                                  <div><span className="text-slate-500">Reason</span><div className="font-medium">{rec.payload.reason}</div></div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

          {tab === 'provider-history' && (
            <Section title="Provider history">
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 mb-2">
                <div className="col-span-3">Type</div>
                <div className="col-span-4">Patient</div>
                <div className="col-span-3">Location</div>
                <div className="col-span-2 text-right">Date</div>
              </div>
              <div className="divide-y">
                {providerHistory.length === 0 ? (
                  <div className="text-sm text-slate-500">No events yet</div>
                ) : (
                  providerHistory.map((a, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 py-2 items-center">
                      <div className="col-span-3 text-sm">
                        {a.type === 'SEARCH' ? <Pill>Search</Pill> : a.type === 'PLACEMENT' ? <Pill tone='indigo'>Placement</Pill> : <Pill tone='amber'>Removal</Pill>}
                      </div>
                      <div className="col-span-4 text-sm">{a.patientName || '-'}</div>
                      <div className="col-span-3 text-sm">{a.location || '-'}</div>
                      <div className="col-span-2 text-right text-xs text-slate-600">{new Date(a.timestamp).toLocaleDateString()}</div>
                    </div>
                  ))
                )}
              </div>
            </Section>
          )}

          {tab === 'patient-portal' && (
            <Section title="Patient portal">
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Patient ID"><Input value={ppPID} onChange={e => setPPPID(e.target.value)} placeholder="uuid" /></Field>
                <Field label="Email"><Input value={ppEmail} onChange={e => setPPEmail(e.target.value)} placeholder="name@email.com" /></Field>
              </div>
              <div className="mt-3"><Button variant="ghost" onClick={ppSignIn}>Sign in</Button></div>

              {ppAuthed ? (
                <>
                  <div className="flex items-center gap-2 mt-6">
                    <Button variant={ppTab === 'history' ? 'primary' : 'ghost'} onClick={() => setPPTab('history')}>History</Button>
                    <Button variant={ppTab === 'profile' ? 'primary' : 'ghost'} onClick={() => setPPTab('profile')}>Personal info</Button>
                    <Button variant={ppTab === 'audit' ? 'primary' : 'ghost'} onClick={() => setPPTab('audit')}>Audit log</Button>
                  </div>

                  {ppTab === 'history' && (
                    <div className="mt-4 grid gap-2">
                      {patientHistory.length === 0 ? (
                        <div className="text-sm text-slate-500">No records</div>
                      ) : (
                        patientHistory.map((rec, idx) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm">
                                <KindBadge kind={rec.kind} />
                                {rec.kind === 'PLACEMENT' ? (
                                  <>
                                    <div className="mt-1"><span className="text-slate-500">Placement date</span> <span className="font-medium">{rec.payload.placementDate}</span></div>
                                    <div><span className="text-slate-500">Location</span> <span className="font-medium">{rec.payload.location}</span></div>
                                  </>
                                ) : (
                                  <>
                                    <div className="mt-1"><span className="text-slate-500">Removal date</span> <span className="font-medium">{rec.payload.removalDate}</span></div>
                                    <div><span className="text-slate-500">Location</span> <span className="font-medium">{rec.payload.location}</span></div>
                                    <div><span className="text-slate-500">Reason</span> <span className="font-medium">{rec.payload.reason}</span></div>
                                  </>
                                )}
                              </div>
                              <Button variant="ghost" onClick={() => setPPSelected(ppSelected === idx ? -1 : idx)}>{ppSelected === idx ? 'Hide' : 'View'}</Button>
                            </div>
                            {ppSelected === idx && (
                              <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                                {rec.kind === 'PLACEMENT' ? (
                                  <>
                                    <div><span className="text-slate-500">Brand</span><div className="font-medium">{rec.payload.brand}</div></div>
                                    <div><span className="text-slate-500">Model</span><div className="font-medium">{rec.payload.model}</div></div>
                                    <div><span className="text-slate-500">Lot</span><div className="font-medium">{rec.payload.lot}</div></div>
                                    <div><span className="text-slate-500">Diameter</span><div className="font-medium">{rec.payload.diameter} mm</div></div>
                                    <div><span className="text-slate-500">Length</span><div className="font-medium">{rec.payload.length} mm</div></div>
                                    <div><span className="text-slate-500">Entry method</span><div className="font-medium capitalize">{rec.payload.entryMethod}</div></div>
                                  </>
                                ) : (
                                  <>
                                    <div><span className="text-slate-500">Provider</span><div className="font-medium">{truncate((providers.find(p => p.id === rec.providerId)?.name) || '—', 22)}</div></div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {ppTab === 'profile' && (
                    <div className="mt-4">
                      {patientProfiles[ppPID] && !ppEditing ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
                          <div><span className="text-slate-500">Age</span> <span className="font-medium">{patientProfiles[ppPID].age ?? '—'}</span></div>
                          <div><span className="text-slate-500">Sex</span> <span className="font-medium capitalize">{patientProfiles[ppPID].sex ?? 'unknown'}</span></div>
                          <div><span className="text-slate-500">Medical history</span> <span className="font-medium">{patientProfiles[ppPID].history || '—'}</span></div>
                          <div className="mt-3"><Button variant="ghost" onClick={() => setPPEditing(true)}>Edit</Button></div>
                        </div>
                      ) : (
                        <>
                          <div className="grid md:grid-cols-3 gap-4">
                            <Field label="Age"><Input id="pp-age" type="number" min="0" placeholder="42" defaultValue={patientProfiles[ppPID]?.age ?? ''} /></Field>
                            <Field label="Sex">
                              <select id="pp-sex" defaultValue={patientProfiles[ppPID]?.sex ?? 'unknown'} className="px-3 py-2 rounded-xl border border-slate-300">
                                <option value="unknown">Prefer not to say</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="other">Other</option>
                              </select>
                            </Field>
                            <Field label="Medical history / conditions"><Input id="pp-history" placeholder="e.g., diabetes" defaultValue={patientProfiles[ppPID]?.history ?? ''} /></Field>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button onClick={savePatientProfile}>Save</Button>
                            <Button variant="ghost" onClick={() => setPPEditing(false)}>Cancel</Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {ppTab === 'audit' && (
                    <div className="mt-4">
                      <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 mb-2">
                        <div className="col-span-4">Type</div>
                        <div className="col-span-4">Provider</div>
                        <div className="col-span-4 text-right">Date</div>
                      </div>
                      <div className="divide-y">
                        {audits.filter(a => a.patientId === ppPID).map((a, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 py-2 items-center">
                            <div className="col-span-4 text-sm">{a.type === 'SEARCH' ? <Pill>Search</Pill> : a.type === 'PLACEMENT' ? <Pill tone='indigo'>Placement</Pill> : <Pill tone='amber'>Removal</Pill>}</div>
                            <div className="col-span-4 text-sm">{providers.find(p => p.id === a.providerId)?.name || 'Unknown'}</div>
                            <div className="col-span-4 text-right text-xs text-slate-600">{new Date(a.timestamp).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-600">Sign in to view your history.</p>
              )}
            </Section>
          )}

          {tab === 'research' && (
            <Section title="Research portal">
              <div className="text-sm text-slate-600 mb-3">Anonymized placements and removals. Provider IDs are UUIDs. Each row includes Patient ID. Use More info to see age, sex, and medical history.</div>
              <div className="grid gap-2">
                {records.length === 0 ? (
                  <div className="text-sm text-slate-500">No data yet</div>
                ) : (
                  records.map((r, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <KindBadge kind={r.kind} />
                          <div><span className="text-slate-500">Patient</span> <code className="font-medium">{truncate(r.patientId, 16)}</code></div>
                          {r.kind === 'PLACEMENT' ? (
                            <>
                              <div className="ml-4"><span className="text-slate-500">Date</span> <span className="font-medium">{r.payload.placementDate}</span></div>
                              <div className="ml-4"><span className="text-slate-500">Location</span> <span className="font-medium">{r.payload.location}</span></div>
                            </>
                          ) : (
                            <>
                              <div className="ml-4"><span className="text-slate-500">Date</span> <span className="font-medium">{r.payload.removalDate}</span></div>
                              <div className="ml-4"><span className="text-slate-500">Location</span> <span className="font-medium">{r.payload.location}</span></div>
                              <div className="ml-4"><span className="text-slate-500">Reason</span> <span className="font-medium">{r.payload.reason}</span></div>
                            </>
                          )}
                          <div className="ml-4"><span className="text-slate-500">Provider</span> <code className="font-medium">{truncate(r.providerId, 16)}</code></div>
                        </div>
                        <Button variant="ghost" onClick={() => r.__open ? r.__open = false : r.__open = true && setRecords([...records])}>{r.__open ? 'Hide' : 'More info'}</Button>
                      </div>
                      {r.__open && (
                        <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                          <div><span className="text-slate-500">Age</span> <div className="font-medium">{patientProfiles[r.patientId]?.age ?? '—'}</div></div>
                          <div><span className="text-slate-500">Sex</span> <div className="font-medium capitalize">{patientProfiles[r.patientId]?.sex ?? 'unknown'}</div></div>
                          <div><span className="text-slate-500">Medical history</span> <div className="font-medium">{patientProfiles[r.patientId]?.history || '—'}</div></div>
                          {r.kind === 'PLACEMENT' && (
                            <>
                              <div><span className="text-slate-500">Brand</span> <div className="font-medium">{r.payload.brand}</div></div>
                              <div><span className="text-slate-500">Model</span> <div className="font-medium">{r.payload.model}</div></div>
                              <div><span className="text-slate-500">Lot</span> <div className="font-medium">{r.payload.lot}</div></div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Section>
          )}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-slate-500">
        This mock uses UUID provider IDs, email as an identifier, Patient ID based access, a patient audit log, and a de-identified research view.
      </footer>
    </div>
  );
}
