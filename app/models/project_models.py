from pydantic import BaseModel
from typing import List, Optional, Union, Any

class PreviewRequest(BaseModel):
    source_type: Union[str, List[str], dict]
    path: Union[str, dict]
    items: Union[List[str], dict]
    business_context: Optional[str] = ""

class PipelineConfig(BaseModel):
    id: str
    source_type: Union[str, List[str], dict]
    source_path: Union[str, dict]
    selected_tables: Union[List[str], dict]
    business_context: str
    column_context: dict
    final_goal: str
    schemas: Optional[dict] = {}
    feedback_history: Optional[List[str]] = []
    file_formats: Optional[dict] = {}

class RelationshipItem(BaseModel):
    source_table: str
    source_key: Optional[str] = ""
    target_table: str
    target_key: Optional[str] = ""
    relationship_type: Optional[str] = ""
    description: Optional[str] = ""

class DeriveRequest(BaseModel):
    project_id: str
    feedback: Optional[str] = ""
    existing_relationships: Optional[str] = ""

class EDARequest(BaseModel):
    project_id: str
    feedback: Optional[str] = ""
    existing_eda: Optional[str] = ""

class ERDRequest(BaseModel):
    project_id: str
    relationships: Optional[List[RelationshipItem]] = []
    feedback: Optional[str] = ""
    schemas: Optional[dict] = {}
    eda_context: Optional[str] = ""
    existing_mermaid: Optional[str] = ""

class MedallionRequest(BaseModel):
    project_id: str
    feedback: Optional[str] = ""

class FeedbackRequest(BaseModel):
    project_id: str
    feedback: str

class SuggestToolsRequest(BaseModel):
    project_id: str
    feedback: Optional[str] = ""
    current_selections: Optional[dict] = {}

class SaveToolsRequest(BaseModel):
    project_id: str
    selected_tools: dict



class InitRepoRequest(BaseModel):
    project_id: str

class SaveConfigRequest(BaseModel):
    project_id: str
    yaml_content: str
