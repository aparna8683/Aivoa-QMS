import { configureStore, createSlice } from "@reduxjs/toolkit";

const emptyComplaint = {
  complaint_source: "", customer_name: "", product_name: "", product_strength: "",
  batch_number: "", manufacturing_date: "", expiry_date: "", quantity_affected: "",
  originating_site: "", impacted_materials: "", complaint_category: "",
  complaint_date: "", complaint_description: "", severity: "", priority: "",
  risk_assessment: "", suggested_action: "", ai_summary: ""
};

const complaintSlice = createSlice({
  name: "complaint",
  initialState: {
    data: emptyComplaint, confidence: 0, missingFields: [], sourceText: "",
    status: "Pending Triage", messages: [], saving: false, savedId: null
  },
  reducers: {
    updateField(state, action) { state.data[action.payload.field] = action.payload.value; },
    hydrateComplaint(state, action) {
      state.data = { ...emptyComplaint, ...action.payload.complaint };
      state.confidence = action.payload.confidence ?? 0;
      state.missingFields = action.payload.missing_fields ?? [];
      state.sourceText = action.payload.source_text ?? "";
      state.messages = action.payload.messages ?? [];
      state.status = "AI Extracted"; state.savedId = null;
    },
    resetComplaint(state) {
      state.data = { ...emptyComplaint }; state.confidence = 0;
      state.missingFields = []; state.sourceText = ""; state.messages = [];
      state.status = "Pending Triage"; state.savedId = null;
    },
    setSaving(state, action) { state.saving = action.payload; },
    setSaved(state, action) { state.saving = false; state.savedId = action.payload; state.status = "Logged"; }
  }
});

const ledgerSlice = createSlice({
  name: "ledger",
  initialState: { items: [], loading: false },
  reducers: {
    setLedger(state, action) { state.items = action.payload; },
    setLedgerLoading(state, action) { state.loading = action.payload; }
  }
});

export const { updateField, hydrateComplaint, resetComplaint, setSaving, setSaved } = complaintSlice.actions;
export const { setLedger, setLedgerLoading } = ledgerSlice.actions;

export const store = configureStore({
  reducer: { complaint: complaintSlice.reducer, ledger: ledgerSlice.reducer }
});
