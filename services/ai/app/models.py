from typing import Any, Literal
from pydantic import BaseModel, Field

class DetectedObject(BaseModel):
    label: str
    category: str
    possible_brand: str | None = None
    possible_model: str | None = None
    visible_attributes: dict[str, Any] = {}
    confidence: float = Field(ge=0, le=1)

class AnalysisResponse(BaseModel):
    provider: str = "mock"
    scene_type: str
    category: str | None
    detected_objects: list[DetectedObject]
    confidence: float
    suggested_outcomes: list[str]
    missing_information: list[str]
    requires_manual_confirmation: bool
    truthfulness_notice: str

class AnalyzeRequest(BaseModel):
    fixture: str | None = None
    filename: str | None = None

class SlotInput(BaseModel):
    name: str
    categories: list[str]
    required: bool = False
    priority: int = 1

class CompletionRequest(BaseModel):
    outcome: str
    budget: int = Field(gt=0)
    owned_categories: list[str]
    width_cm: float | None = None
    slots: list[SlotInput]

class CompletionItem(BaseModel):
    category: str
    slot: str
    section: Literal["owned", "missing-essential", "useful", "optional", "avoid", "incompatible"]
    reason: str
    confidence: float
    compatibility: str

class OntologyItem(BaseModel):
    slug: str
    name: str
    aliases: list[str] = []

class TextInterpretRequest(BaseModel):
    text: str = Field(min_length=10, max_length=3000)
    outcomes: list[str]
    categories: list[OntologyItem]
    current_budget: int | None = None

class TextInterpretResponse(BaseModel):
    provider: str = "local-text-interpreter"
    outcome: str
    outcome_confidence: float
    budget: int
    width_cm: float | None = None
    depth_cm: float | None = None
    owned_categories: list[str]
    desired_categories: list[str]
    owned_items: list[str]
    desired_items: list[str]
    constraints: list[str]
    style: str | None = None
    preference: Literal["NEW", "USED", "EITHER"] = "EITHER"
    clarifying_questions: list[str]
    interpretation: list[str]
