from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Complaint
from ..schemas import AIToolResponse, AnalysisResponse, ComplaintData, ComplaintResponse
from ..services.ai_workflow import analyze_complaint
from ..services.parser import extract_document

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(text: str = Form(default=""), file: UploadFile | None = File(default=None)):
    source_text = text.strip()

    if file:
        content = await file.read()
        try:
            source_text = extract_document(file.filename or "document.txt", content)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    if not source_text:
        raise HTTPException(status_code=400, detail="Paste a complaint or upload a document.")

    complaint, confidence, missing, messages = analyze_complaint(source_text)
    return AnalysisResponse(
        complaint=complaint,
        confidence=confidence,
        missing_fields=missing,
        source_text=source_text,
        messages=messages,
    )

@router.post("", response_model=ComplaintResponse)
def create_complaint(payload: ComplaintData, db: Session = Depends(get_db)):
    item = Complaint(**payload.model_dump(), status="Pending Investigation")
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("", response_model=list[ComplaintResponse])
def list_complaints(db: Session = Depends(get_db)):
    return db.scalars(select(Complaint).order_by(desc(Complaint.created_at))).all()

@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    item = db.get(Complaint, complaint_id)
    if not item:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return item

@router.post("/{complaint_id}/ai-check", response_model=AIToolResponse)
def ai_check(complaint_id: int, tool: str = "summary", db: Session = Depends(get_db)):
    item = db.get(Complaint, complaint_id)
    if not item:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    if tool == "completeness":
        fields = {"Customer": item.customer_name, "Product": item.product_name, "Batch": item.batch_number, "Description": item.complaint_description, "Severity": item.severity}
        missing = [name for name, value in fields.items() if not value]
        result = "All core complaint fields are present." if not missing else "Missing: " + ", ".join(missing)
    elif tool == "duplicate":
        matches = db.scalars(select(Complaint).where(Complaint.batch_number == item.batch_number, Complaint.id != item.id)).all()
        result = "No duplicate batch complaint found in the current ledger." if not matches else f"Potential duplicate: {len(matches)} existing complaint(s) share batch {item.batch_number}."
    elif tool == "root_cause":
        result = "Suggested investigation paths: review manufacturing batch records, packaging integrity, environmental controls and retained samples. These are investigation prompts, not confirmed root cause."
    elif tool == "capa":
        result = "Potential CAPA areas: strengthen incoming inspection controls, verify packaging/seal integrity controls, review training and add a recurrence check where appropriate."
    else:
        result = item.ai_summary or "No AI summary is available."

    return AIToolResponse(tool=tool, result=result)
