import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertCircle, ArrowRight, CheckCircle2, ChevronDown, ClipboardCheck,
  FileText, FlaskConical, History, Paperclip, Plus, RefreshCw, Send,
  ShieldCheck, Sparkles, UploadCloud, X
} from "lucide-react";
import {
  hydrateComplaint, resetComplaint, setLedger, setLedgerLoading,
  setSaved, setSaving, updateField
} from "./store";
import { analyzeComplaint, createComplaint, fetchLedger, runAITool } from "./api";

const demoComplaint =
  "Apollo Pharmacy reported discolored capsules in Amoxicillin Capsules 500 mg. Batch number AMX240602. Manufacturing date March 2026. Expiry date February 2028. Affected quantity is 12 capsules. Please log this complaint.";

function Field({ label, value, field, type="text", placeholder, options, onChange }) {
  return <label className="field"><span>{label}</span>
    {options ? <div className="select-wrap">
      <select value={value || ""} onChange={e => onChange(field, e.target.value)}>
        <option value="">Awaiting AI extraction...</option>
        {options.map(x => <option key={x}>{x}</option>)}
      </select><ChevronDown size={16}/>
    </div> : <input type={type} value={value || ""} placeholder={placeholder} onChange={e => onChange(field, e.target.value)}/>}
  </label>;
}

function TextField({ label, value, field, rows=4, placeholder, onChange }) {
  return <label className="field full"><span>{label}</span>
    <textarea rows={rows} value={value || ""} placeholder={placeholder} onChange={e => onChange(field, e.target.value)}/>
  </label>;
}

function SeverityPill({ value }) {
  return <span className={`severity ${(value || "empty").toLowerCase()}`}>{value || "Awaiting assessment"}</span>;
}

export default function App() {
  const dispatch = useDispatch();
  const complaint = useSelector(s => s.complaint);
  const ledger = useSelector(s => s.ledger.items);
  const [copilotInput, setCopilotInput] = useState("");
  const [activeTab, setActiveTab] = useState("complaint");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [aiToolResult, setAIToolResult] = useState(null);
  const fileRef = useRef(null);
  const data = complaint.data;

  useEffect(() => { loadLedger(); }, []);

  async function loadLedger() {
    dispatch(setLedgerLoading(true));
    try { dispatch(setLedger(await fetchLedger())); } catch {}
    finally { dispatch(setLedgerLoading(false)); }
  }

  const change = (field, value) => dispatch(updateField({ field, value }));

  async function analyze(text="", file=null) {
    setBusy(true); setToast("");
    try {
      dispatch(hydrateComplaint(await analyzeComplaint({ text, file })));
      setCopilotInput(""); setToast("Complaint analyzed and form updated.");
    } catch (e) { setToast(e.message); }
    finally { setBusy(false); }
  }

  async function submitCopilot(e) {
    e.preventDefault();
    if (copilotInput.trim()) await analyze(copilotInput.trim());
  }

  async function saveComplaint() {
    setBusy(true); dispatch(setSaving(true));
    try {
      const saved = await createComplaint(data);
      dispatch(setSaved(saved.id)); await loadLedger(); setActiveTab("ledger");
      setToast(`Complaint #${saved.id} committed to the QMS Ledger.`);
    } catch (e) { setToast(e.message); }
    finally { setBusy(false); dispatch(setSaving(false)); }
  }

  async function runTool(tool) {
    if (!complaint.savedId) { setToast("Commit the complaint to the ledger first."); return; }
    try { setAIToolResult(await runAITool(complaint.savedId, tool)); }
    catch (e) { setToast(e.message); }
  }

  const statusLabel = useMemo(() => complaint.savedId ? "Logged" : complaint.confidence ? "AI Extracted" : "Pending Triage", [complaint.confidence, complaint.savedId]);

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><FlaskConical size={18}/></div>
        <div><div className="brand-name">AIVOA</div><div className="brand-sub">Quality Operations</div></div>
      </div>
      <nav className="topnav">
        <button className={activeTab === "complaint" ? "nav-active" : ""} onClick={() => setActiveTab("complaint")}><ClipboardCheck size={16}/> Complaint</button>
        <button className={activeTab === "ledger" ? "nav-active" : ""} onClick={() => setActiveTab("ledger")}><History size={16}/> QMS Ledger <span className="nav-count">{ledger.length}</span></button>
      </nav>
      <div className="topbar-right"><span className="system-dot"/> System online <div className="avatar">AO</div></div>
    </header>

    {activeTab === "complaint" ? <main className="workspace">
      <section className="form-pane">
        <div className="page-head">
          <div><div className="eyebrow">CUSTOMER COMPLAINT / NEW RECORD</div><h1>Log Customer Complaint</h1><p>Capture the complaint, review AI extraction, then commit the verified record to QMS.</p></div>
          <div className={`status-badge ${statusLabel.toLowerCase().replace(" ","-")}`}><span/> {statusLabel}</div>
        </div>

        {toast && <div className="toast"><AlertCircle size={16}/><span>{toast}</span><button onClick={() => setToast("")}><X size={15}/></button></div>}

        <div className="form-card">
          <SectionTitle number="01" title="Customer & Source"/>
          <div className="grid-2">
            <Field label="Complaint Source" field="complaint_source" value={data.complaint_source} placeholder="e.g. Pharmacy, email, incoming inspection" onChange={change}/>
            <Field label="Customer Name" field="customer_name" value={data.customer_name} placeholder="Awaiting AI extraction..." onChange={change}/>
          </div>

          <SectionTitle number="02" title="Product & Batch Identification"/>
          <div className="grid-2">
            <Field label="Product Name (API/FDF)" field="product_name" value={data.product_name} placeholder="Awaiting AI extraction..." onChange={change}/>
            <Field label="Product Strength / Grade" field="product_strength" value={data.product_strength} placeholder="e.g. 500 mg / USP" onChange={change}/>
            <Field label="Batch / Lot Number" field="batch_number" value={data.batch_number} placeholder="Awaiting AI extraction..." onChange={change}/>
            <Field label="Manufacturing Date" field="manufacturing_date" type="date" value={data.manufacturing_date} onChange={change}/>
            <Field label="Expiry Date" field="expiry_date" type="date" value={data.expiry_date} onChange={change}/>
            <Field label="Quantity Affected" field="quantity_affected" value={data.quantity_affected} placeholder="e.g. 12 capsules" onChange={change}/>
          </div>

          <SectionTitle number="03" title="Facility & Material Impact"/>
          <div className="grid-2">
            <Field label="Originating Site / Block" field="originating_site" value={data.originating_site} placeholder="Awaiting AI classification..." onChange={change}/>
            <Field label="Impacted Non-Product Materials (NPM)" field="impacted_materials" value={data.impacted_materials} placeholder="e.g. Primary packaging" onChange={change}/>
          </div>

          <SectionTitle number="04" title="Defect Analysis"/>
          <div className="grid-2">
            <Field label="Complaint Category" field="complaint_category" value={data.complaint_category} placeholder="Awaiting AI classification..." onChange={change}/>
            <Field label="Complaint Date" field="complaint_date" type="date" value={data.complaint_date} onChange={change}/>
          </div>
          <TextField label="Detailed Complaint Description" field="complaint_description" value={data.complaint_description} rows={4} placeholder="AI will synthesize the complaint into a formal QMS description..." onChange={change}/>

          <SectionTitle number="05" title="Initial Assessment & Priority"/>
          <div className="grid-2">
            <Field label="Initial Severity" field="severity" value={data.severity} options={["Minor","Major","Critical"]} onChange={change}/>
            <Field label="Priority" field="priority" value={data.priority} options={["Low","Medium","High"]} onChange={change}/>
          </div>

          <div className="assessment-box">
            <div className="assessment-head"><div className="assessment-title"><ShieldCheck size={17}/> AI Copilot Risk Assessment</div><span className="suggested-label">SUGGESTED — REVIEW REQUIRED</span></div>
            <div className="assessment-grid">
              <div><span className="mini-label">Severity</span><SeverityPill value={data.severity}/></div>
              <div><span className="mini-label">Suggested next action</span><div className="assessment-value">{data.suggested_action || "Awaiting analysis..."}</div></div>
            </div>
            <div className="risk-copy"><span className="mini-label">Initial risk assessment</span><p>{data.risk_assessment || "AI-generated risk reasoning will appear here after complaint analysis."}</p></div>
          </div>

          {complaint.missingFields.length > 0 && <div className="missing-note"><AlertCircle size={16}/><div><strong>{complaint.missingFields.length} field{complaint.missingFields.length > 1 ? "s" : ""} need review:</strong> {complaint.missingFields.join(", ")}</div></div>}

          <div className="form-actions">
            <button className="secondary-btn" onClick={() => dispatch(resetComplaint())}><RefreshCw size={16}/> Reset form</button>
            <button className="primary-btn" onClick={saveComplaint} disabled={busy || !data.complaint_description}><CheckCircle2 size={17}/> {busy ? "Saving..." : "Commit to QMS Ledger"} <ArrowRight size={16}/></button>
          </div>
        </div>
      </section>

      <aside className="copilot-pane">
        <div className="copilot-header">
          <div className="copilot-title"><div className="copilot-icon"><Sparkles size={17}/></div><div><strong>AI Complaint Copilot</strong><span>Extraction & initial risk support</span></div></div>
          <span className="beta">BETA</span>
        </div>

        <div className="copilot-body">
          <div className="assistant-message"><div className="message-icon"><Sparkles size={15}/></div><p>Paste a customer complaint or upload a PDF/email. I’ll extract the complaint fields and prepare an initial risk assessment for review.</p></div>

          <div className="upload-box" onClick={() => fileRef.current?.click()}>
            <UploadCloud size={24}/><strong>Drop a complaint document</strong><span>PDF, TXT or EML · click to browse</span>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.eml" hidden onChange={e => e.target.files?.[0] && analyze("", e.target.files[0])}/>
          </div>

          <div className="or-line"><span>OR</span></div>
          <button className="paste-btn" onClick={() => setCopilotInput(demoComplaint)}><FileText size={16}/> Paste complaint text</button>
          <div className="supported"><strong>Suggested format</strong><span>Customer · Product · Batch/Lot · Dates · Affected quantity · Defect</span></div>

          {complaint.confidence > 0 && <div className="progress-card">
            <div className="progress-row"><div><strong>Extraction complete</strong><span>{complaint.messages.at(-1) || "AI processing finished."}</span></div><strong>{complaint.confidence}%</strong></div>
            <div className="progress-track"><div style={{width: `${complaint.confidence}%`}}/></div>
          </div>}

          <div className="chat-history">
            {complaint.sourceText && <>
              <div className="chat-user"><span className="chat-avatar user">U</span><div>{complaint.sourceText}</div></div>
              <div className="chat-assistant"><span className="chat-avatar ai"><CheckCircle2 size={13}/></span><div>Complaint parsed successfully. I extracted the product, batch information and defect details, then generated an initial risk assessment. Please review the form before committing it to QMS.</div></div>
            </>}
          </div>

          <div className="copilot-spacer"/>
          <div className="copilot-tools">
            <div className="tool-label">After logging</div>
            <div className="tool-row">{["completeness","duplicate","root_cause","capa"].map(tool =>
              <button key={tool} onClick={() => runTool(tool)}>{tool === "completeness" ? "Completeness" : tool === "duplicate" ? "Duplicate" : tool === "root_cause" ? "Root cause" : "CAPA"}</button>
            )}</div>
            {aiToolResult && <div className="tool-result"><strong>{aiToolResult.tool.replace("_"," ")}</strong><p>{aiToolResult.result}</p></div>}
          </div>

          <form className="copilot-input" onSubmit={submitCopilot}><Paperclip size={17}/><input value={copilotInput} onChange={e => setCopilotInput(e.target.value)} placeholder="Type or paste a complaint..."/><button disabled={busy || !copilotInput.trim()}><Send size={16}/></button></form>
          <div className="powered">LANGGRAPH · GROQ</div>
        </div>
      </aside>
    </main> : <Ledger ledger={ledger} onNew={() => { dispatch(resetComplaint()); setActiveTab("complaint"); }}/>}
  </div>;
}

function SectionTitle({number,title}) {
  return <div className="section-title"><span>{number}</span><strong>{title}</strong><div/></div>;
}

function Ledger({ledger,onNew}) {
  return <main className="ledger-page">
    <div className="ledger-head"><div><div className="eyebrow">QUALITY MANAGEMENT SYSTEM</div><h1>Complaint Ledger</h1><p>Verified complaint records committed from the intake workflow.</p></div><button className="primary-btn" onClick={onNew}><Plus size={17}/> New complaint</button></div>
    <div className="ledger-stats">
      <Stat label="Total complaints" value={ledger.length}/>
      <Stat label="Critical" value={ledger.filter(x=>x.severity==="Critical").length}/>
      <Stat label="Major" value={ledger.filter(x=>x.severity==="Major").length}/>
      <Stat label="Pending investigation" value={ledger.filter(x=>x.status==="Pending Investigation").length}/>
    </div>
    <div className="ledger-card">
      <div className="table-toolbar"><div><strong>Complaint records</strong><span>{ledger.length} records</span></div><button onClick={() => location.reload()}><RefreshCw size={15}/> Refresh</button></div>
      {ledger.length === 0 ? <div className="empty-ledger"><History size={28}/><strong>No complaints logged yet</strong><span>Analyze a complaint and commit the reviewed record to see it here.</span></div> :
      <div className="table-wrap"><table><thead><tr><th>ID</th><th>Customer</th><th>Product</th><th>Batch / Lot</th><th>Category</th><th>Severity</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>{ledger.map(item => <tr key={item.id}>
        <td className="mono">CC-{String(item.id).padStart(4,"0")}</td><td>{item.customer_name || "—"}</td>
        <td><strong>{item.product_name || "—"}</strong><small>{item.product_strength}</small></td>
        <td className="mono">{item.batch_number || "—"}</td><td>{item.complaint_category || "—"}</td>
        <td><SeverityPill value={item.severity}/></td><td>{new Date(item.created_at).toLocaleDateString("en-IN")}</td>
        <td><span className="status-text"><span/>{item.status}</span></td>
      </tr>)}</tbody></table></div>}
    </div>
  </main>;
}

function Stat({label,value}) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>; }
