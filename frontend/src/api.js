const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function analyzeComplaint({ text, file }) {
  const body = new FormData();
  if (text) body.append("text", text);
  if (file) body.append("file", file);
  const response = await fetch(`${API_URL}/api/complaints/analyze`, { method: "POST", body });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to analyze complaint.");
  return data;
}

export async function createComplaint(complaint) {
  const response = await fetch(`${API_URL}/api/complaints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(complaint)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to save complaint.");
  return data;
}

export async function fetchLedger() {
  const response = await fetch(`${API_URL}/api/complaints`);
  if (!response.ok) throw new Error("Unable to load QMS ledger.");
  return response.json();
}

export async function runAITool(id, tool) {
  const response = await fetch(`${API_URL}/api/complaints/${id}/ai-check?tool=${tool}`, { method: "POST" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "AI tool failed.");
  return data;
}
