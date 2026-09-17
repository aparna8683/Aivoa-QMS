from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

class ComplaintData(BaseModel):
    complaint_source: str = ""
    customer_name: str = ""
    product_name: str = ""
    product_strength: str = ""
    batch_number: str = ""
    manufacturing_date: date | None = None
    expiry_date: date | None = None
    quantity_affected: str = ""
    originating_site: str = ""
    impacted_materials: str = ""
    complaint_category: str = ""
    complaint_date: date | None = None
    complaint_description: str = ""
    severity: str = ""
    priority: str = ""
    risk_assessment: str = ""
    suggested_action: str = ""
    ai_summary: str = ""

class AnalysisResponse(BaseModel):
    complaint: ComplaintData
    confidence: int = Field(default=90, ge=0, le=100)
    missing_fields: list[str] = []
    source_text: str = ""
    messages: list[str] = []

class ComplaintResponse(ComplaintData):
    id: int
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AIToolResponse(BaseModel):
    tool: str
    result: str
