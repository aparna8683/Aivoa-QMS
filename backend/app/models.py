from datetime import date, datetime
from sqlalchemy import Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    complaint_source: Mapped[str | None] = mapped_column(String(80))
    customer_name: Mapped[str | None] = mapped_column(String(160))
    product_name: Mapped[str | None] = mapped_column(String(160))
    product_strength: Mapped[str | None] = mapped_column(String(120))
    batch_number: Mapped[str | None] = mapped_column(String(120), index=True)
    manufacturing_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    quantity_affected: Mapped[str | None] = mapped_column(String(80))
    originating_site: Mapped[str | None] = mapped_column(String(160))
    impacted_materials: Mapped[str | None] = mapped_column(String(240))
    complaint_category: Mapped[str | None] = mapped_column(String(160))
    complaint_date: Mapped[date | None] = mapped_column(Date)
    complaint_description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str | None] = mapped_column(String(40))
    priority: Mapped[str | None] = mapped_column(String(40))
    risk_assessment: Mapped[str | None] = mapped_column(Text)
    suggested_action: Mapped[str | None] = mapped_column(Text)
    ai_summary: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="Pending Investigation")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
