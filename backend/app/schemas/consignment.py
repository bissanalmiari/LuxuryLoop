from pydantic import BaseModel
from typing import Optional, List

class ConsignmentDocumentIn(BaseModel):
    document_type: str  # "image" | "invoice" | "certificate" | "other"
    file_url: str

class ConsignmentCreate(BaseModel):
    category_id: Optional[str] = None
    brand_id: Optional[str] = None
    model: Optional[str] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    serial_reference: Optional[str] = None
    documents: List[ConsignmentDocumentIn] = []

class ConsignmentDocumentOut(BaseModel):
    id: str
    document_type: str
    file_url: str

class ConsignmentOut(BaseModel):
    id: str
    category_id: Optional[str] = None
    category_name: str = ""
    brand_id: Optional[str] = None
    brand_name: str = ""
    model: Optional[str] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    serial_reference: Optional[str] = None
    status: str
    submitted_at: str
    documents: List[ConsignmentDocumentOut] = []

class ConsignmentListResponse(BaseModel):
    consignments: List[ConsignmentOut]