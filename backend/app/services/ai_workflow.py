import json
import re
from datetime import date
from typing import TypedDict

from langgraph.graph import END, StateGraph
from langchain_groq import ChatGroq

from ..config import get_settings
from ..schemas import ComplaintData

class ComplaintState(TypedDict, total=False):
    text: str
    complaint: dict
    missing_fields: list[str]
    confidence: int
    messages: list[str]

def clean_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    return json.loads(text)

def demo_extract(text: str) -> dict:
    t = text.lower()
    foreign = "foreign" in t or "dark foreign particles" in t or "contamination" in t

    if foreign:
        return {
            "complaint_source": "Customer / Incoming Inspection",
            "customer_name": "ABC Formulations Ltd.",
            "product_name": "Metformin API",
            "product_strength": "",
            "batch_number": "BMX240602",
            "manufacturing_date": None,
            "expiry_date": None,
            "quantity_affected": "48 capsules",
            "originating_site": "API Manufacturing Site",
            "impacted_materials": "HDPE drum",
            "complaint_category": "Foreign Matter Contamination",
            "complaint_date": None,
            "complaint_description": "ABC Formulations Ltd. reported multiple dark foreign particles inside one sealed HDPE drum during incoming quality inspection. The drum had no visible external damage. Material quarantined.",
            "severity": "Critical",
            "priority": "High",
            "risk_assessment": "Potential foreign matter contamination with a high impact on API quality. Manufacturing and laboratory investigation is required before material disposition.",
            "suggested_action": "Quarantine affected material and route to laboratory investigation & manufacturing records review.",
            "ai_summary": "Foreign matter was reported in a sealed API drum during incoming inspection. The material has been quarantined pending investigation.",
        }

    return {
        "complaint_source": "Pharmacy / Customer",
        "customer_name": "Apollo Pharmacy",
        "product_name": "Amoxicillin Capsules",
        "product_strength": "500 mg",
        "batch_number": "AMX240602",
        "manufacturing_date": date(2026, 3, 1).isoformat(),
        "expiry_date": date(2028, 2, 1).isoformat(),
        "quantity_affected": "12 capsules",
        "originating_site": "FDF Manufacturing Site",
        "impacted_materials": "Primary packaging",
        "complaint_category": "Product Defect - Discoloration",
        "complaint_date": None,
        "complaint_description": "Apollo Pharmacy reported 12 discolored capsules in a sealed bottle. Requesting investigation and replacement.",
        "severity": "Major",
        "priority": "Medium",
        "risk_assessment": "Potential moisture ingress or primary packaging seal failure leading to capsule discoloration. Requires QA investigation.",
        "suggested_action": "Route to QA Investigation & Issue Replacement.",
        "ai_summary": "Customer reported discolored capsules in a sealed bottle. Batch and product details were identified for QA investigation.",
    }

def build_graph():
    settings = get_settings()

    def extract_node(state: ComplaintState):
        if settings.ai_mode.lower() == "demo" or not settings.groq_api_key:
            return {"complaint": demo_extract(state["text"]), "messages": ["Complaint parsed using the local demo extractor."]}

        llm = ChatGroq(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            temperature=0,
        )
        prompt = f"""
You are an assistant inside a pharmaceutical Quality Management System.
Extract structured customer complaint information from the text below.

Return ONLY valid JSON with these keys:
complaint_source, customer_name, product_name, product_strength,
batch_number, manufacturing_date, expiry_date, quantity_affected,
originating_site, impacted_materials, complaint_category,
complaint_date, complaint_description.

Use ISO dates (YYYY-MM-DD) when a date is present, otherwise null.
Do not invent values. Use an empty string for unknown text fields.

Complaint:
{state["text"]}
"""
        result = llm.invoke(prompt)
        return {"complaint": clean_json(result.content), "messages": ["Groq extracted complaint fields."]}

    def classify_node(state: ComplaintState):
        c = state["complaint"]
        text = state["text"].lower()

        if "foreign" in text or "contamination" in text:
            category, severity, priority = "Foreign Matter Contamination", "Critical", "High"
        elif "discolor" in text:
            category, severity, priority = "Product Defect - Discoloration", "Major", "Medium"
        elif "leak" in text or "broken" in text or "damaged" in text:
            category, severity, priority = "Packaging / Physical Defect", "Major", "High"
        else:
            category, severity, priority = "General Product Complaint", "Minor", "Low"

        c.update({
            "complaint_category": c.get("complaint_category") or category,
            "severity": c.get("severity") or severity,
            "priority": c.get("priority") or priority,
        })
        return {"complaint": c, "messages": state.get("messages", []) + ["Complaint category and severity were assessed."]}

    def risk_node(state: ComplaintState):
        c = state["complaint"]
        severity = c.get("severity") or "Minor"

        if severity == "Critical":
            risk = c.get("risk_assessment") or "Potential critical quality impact. Quarantine and complete laboratory/manufacturing investigation before disposition."
            action = c.get("suggested_action") or "Quarantine material and route to laboratory investigation and manufacturing records review."
        elif severity == "Major":
            risk = c.get("risk_assessment") or "Potential product quality impact. QA investigation is required to establish scope and probable cause."
            action = c.get("suggested_action") or "Route to QA investigation and assess replacement / market impact."
        else:
            risk = c.get("risk_assessment") or "Low initial quality risk based on the information currently available. Confirm complaint details and monitor recurrence."
            action = c.get("suggested_action") or "Review complaint details and determine whether further investigation is required."

        c.update({"risk_assessment": risk, "suggested_action": action})
        required = [
            ("customer_name", "Customer name"),
            ("product_name", "Product name"),
            ("batch_number", "Batch / Lot number"),
            ("complaint_description", "Complaint description"),
        ]
        missing = [label for key, label in required if not c.get(key)]

        return {
            "complaint": c,
            "missing_fields": missing,
            "confidence": max(72, 96 - len(missing) * 8),
            "messages": state.get("messages", []) + ["Initial risk assessment generated."],
        }

    def final_node(state: ComplaintState):
        return state

    graph = StateGraph(ComplaintState)
    graph.add_node("extract", extract_node)
    graph.add_node("classify", classify_node)
    graph.add_node("risk", risk_node)
    graph.add_node("finalize", final_node)
    graph.set_entry_point("extract")
    graph.add_edge("extract", "classify")
    graph.add_edge("classify", "risk")
    graph.add_edge("risk", "finalize")
    graph.add_edge("finalize", END)
    return graph.compile()

workflow = build_graph()

def analyze_complaint(text: str):
    result = workflow.invoke({"text": text, "messages": []})
    return (
        ComplaintData(**result.get("complaint", {})),
        result.get("confidence", 90),
        result.get("missing_fields", []),
        result.get("messages", []),
    )
