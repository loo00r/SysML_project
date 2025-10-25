from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, UniqueConstraint
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

class BDDBlock(Base):
    __tablename__ = "bdd_blocks"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    parent_bdd_diagram_id = Column(Integer, ForeignKey("diagram_embeddings.id"), nullable=False, index=True)
    block_id = Column(String, nullable=False, index=True)
    block_name = Column(String, nullable=False)
    block_type = Column(String, nullable=True)
    block_description = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("parent_bdd_diagram_id", "block_id", name="uq_bdd_block_parent_block"),
    )

class BDDBlockCreate(BaseModel):
    parent_bdd_diagram_id: int
    block_id: str
    block_name: str
    block_type: Optional[str] = None
    block_description: Optional[str] = None

class BDDBlockResponse(BaseModel):
    id: int
    parent_bdd_diagram_id: int
    block_id: str
    block_name: str
    block_type: Optional[str] = None
    block_description: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True

class InternalBlockDiagram(Base):
    __tablename__ = "internal_block_diagrams"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Foreign key to the parent BDD diagram in the diagram_embeddings table
    parent_bdd_diagram_id = Column(Integer, ForeignKey("diagram_embeddings.id"), nullable=False)
    
    # ID of the block within the parent BDD (e.g., "block-1", "processor-a")
    parent_block_id = Column(String, nullable=False, index=True)
    parent_block_ref_id = Column(Integer, ForeignKey("bdd_blocks.id"), nullable=True, index=True)

    # The actual IBD data
    nodes = Column(JSON, nullable=False)
    edges = Column(JSON, nullable=False)
    
    # To track if it was created by AI or manually (e.g., 'ai' or 'manual')
    source = Column(String, default='ai', nullable=False)

class InternalBlockDiagramCreate(BaseModel):
    parent_bdd_diagram_id: int
    parent_block_id: str
    parent_block_ref_id: Optional[int] = None
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    source: str = 'ai'

class InternalBlockDiagramResponse(BaseModel):
    id: int
    parent_bdd_diagram_id: int
    parent_block_id: str
    parent_block_ref_id: Optional[int] = None
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    source: str
    created_at: datetime
    
    class Config:
        orm_mode = True

class StateMachineDiagram(Base):
    __tablename__ = "state_machine_diagrams"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    parent_bdd_diagram_id = Column(Integer, ForeignKey("diagram_embeddings.id"), nullable=False, index=True)
    parent_block_id = Column(String, nullable=False, index=True)
    parent_block_ref_id = Column(Integer, ForeignKey("bdd_blocks.id"), nullable=True, index=True)
    parent_block_name = Column(String, nullable=True)
    states = Column(JSON, nullable=False)
    transitions = Column(JSON, nullable=False)
    source = Column(String, default='ai', nullable=False)

class StateMachineDiagramCreate(BaseModel):
    parent_bdd_diagram_id: int
    parent_block_id: str
    parent_block_ref_id: Optional[int] = None
    parent_block_name: Optional[str] = None
    states: List[Dict[str, Any]]
    transitions: List[Dict[str, Any]]
    source: str = 'ai'

class StateMachineDiagramResponse(BaseModel):
    id: int
    parent_bdd_diagram_id: int
    parent_block_id: str
    parent_block_ref_id: Optional[int] = None
    parent_block_name: Optional[str] = None
    states: List[Dict[str, Any]]
    transitions: List[Dict[str, Any]]
    source: str
    created_at: datetime

    class Config:
        orm_mode = True
