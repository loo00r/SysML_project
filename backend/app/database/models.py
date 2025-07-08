from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from pgvector.sqlalchemy import Vector

from app.db.base import Base

# SQLAlchemy Database Models
class DiagramEmbedding(Base):
    __tablename__ = "diagram_embeddings"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    raw_text = Column(Text, nullable=False)
    diagram_type = Column(String, nullable=False)
    diagram_json = Column(JSON, nullable=False)
    embedding = Column(Vector(1536), nullable=True)  # OpenAI embedding dimension

class SysMLTemplate(Base):
    __tablename__ = "sysml_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    template_name = Column(String, nullable=False)
    template_description = Column(Text, nullable=True)
    template_type = Column(String, nullable=False)
    template_json = Column(JSON, nullable=False)

class UAVComponent(Base):
    __tablename__ = "uav_components"
    
    id = Column(Integer, primary_key=True, index=True)
    component_name = Column(String, nullable=False)
    component_type = Column(String, nullable=False)
    component_description = Column(Text, nullable=True)
    properties = Column(JSON, nullable=True)

# Pydantic Models for API
class DiagramEmbeddingCreate(BaseModel):
    name: str
    description: Optional[str] = None
    raw_text: str
    diagram_type: str
    diagram_json: Dict[str, Any]

class DiagramEmbeddingResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    diagram_type: str
    created_at: datetime
    
    class Config:
        orm_mode = True

class TemplateResponse(BaseModel):
    id: int
    template_name: str
    template_description: Optional[str] = None
    template_type: str
    template_json: Dict[str, Any]
    
    class Config:
        orm_mode = True

class ComponentResponse(BaseModel):
    id: int
    component_name: str
    component_type: str
    component_description: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    
    class Config:
        orm_mode = True

class SimilarDiagramRequest(BaseModel):
    query_text: str
    limit: int = 5
    diagram_type: Optional[str] = None
