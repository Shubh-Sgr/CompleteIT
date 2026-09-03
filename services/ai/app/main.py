from fastapi import FastAPI
from .models import AnalyzeRequest, AnalysisResponse, CompletionRequest, CompletionItem, TextInterpretRequest, TextInterpretResponse
from .vision import MockVisionProvider
from .rules import complete
from .text import interpret_text

app = FastAPI(title="CompleteIt AI", version="0.1.0", description="Deterministic text interpretation and completion rules. Production image recognition is orchestrated by the API service.")
provider = MockVisionProvider()

@app.get("/health")
def health(): return {"status": "ok", "text_interpreter": "local", "completion_rules": "local", "fixture_vision": "mock", "offline": True}

@app.post("/v1/analyze", response_model=AnalysisResponse)
def analyze(request: AnalyzeRequest): return provider.analyze(request)

@app.post("/v1/complete", response_model=list[CompletionItem])
def completion(request: CompletionRequest): return complete(request)

@app.post("/v1/interpret", response_model=TextInterpretResponse)
def interpret(request: TextInterpretRequest): return interpret_text(request)
