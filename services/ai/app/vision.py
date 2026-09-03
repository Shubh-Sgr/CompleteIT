from abc import ABC, abstractmethod
from .models import AnalyzeRequest, AnalysisResponse, DetectedObject

class VisionProvider(ABC):
    @abstractmethod
    def analyze(self, request: AnalyzeRequest) -> AnalysisResponse: ...

class MockVisionProvider(VisionProvider):
    def analyze(self, request: AnalyzeRequest) -> AnalysisResponse:
        if request.fixture == "desk-fixture":
            return AnalysisResponse(scene_type="study desk", category="Study desks", detected_objects=[
                DetectedObject(label="Laptop", category="laptops", confidence=.96, visible_attributes={"open": True}),
                DetectedObject(label="Desk", category="desks", confidence=.93, visible_attributes={}),
                DetectedObject(label="Mouse", category="mice", confidence=.91, visible_attributes={}),
            ], confidence=.94, suggested_outcomes=["Build a study setup", "Improve ergonomics"], missing_information=["Desk dimensions", "Laptop model number"], requires_manual_confirmation=False, truthfulness_notice="Known fixture matched predefined detections.")
        return AnalysisResponse(scene_type="unknown setup", category=None, detected_objects=[], confidence=.2, suggested_outcomes=[], missing_information=["Manual object confirmation", "Another image", "Model numbers", "Dimensions and specifications"], requires_manual_confirmation=True, truthfulness_notice="This arbitrary image was not recognized. Add and confirm objects manually; no detection claim is made.")

class LocalVisionProvider(VisionProvider):
    """Extension interface for an optional local multimodal model; not loaded by default."""
    def analyze(self, request: AnalyzeRequest) -> AnalysisResponse:
        raise RuntimeError("No local model configured. Use the truthful mock/manual workflow.")
