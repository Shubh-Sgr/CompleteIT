from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_fixture_is_detected_truthfully():
    data=client.post("/v1/analyze",json={"fixture":"desk-fixture"}).json()
    assert [x["label"] for x in data["detected_objects"]] == ["Laptop","Desk","Mouse"]
    assert data["requires_manual_confirmation"] is False

def test_arbitrary_image_requires_manual_confirmation():
    data=client.post("/v1/analyze",json={"filename":"my-room.jpg"}).json()
    assert data["detected_objects"] == []
    assert data["requires_manual_confirmation"] is True

def test_completion_avoids_duplicates():
    data=client.post("/v1/complete",json={"outcome":"Build a study setup","budget":30000,"owned_categories":["laptops","power"],"slots":[{"name":"Computer","categories":["laptops"],"required":True,"priority":1},{"name":"Lighting","categories":["lighting"],"required":False,"priority":7}]}).json()
    assert next(x for x in data if x["category"]=="laptops")["section"] == "owned"
    assert any(x["section"]=="optional" for x in data)

def test_text_interpreter_uses_runtime_ontology():
    data=client.post("/v1/interpret",json={"text":"I own a sewing machine and need a quiet craft corner under ₹20,000, width 90 cm","outcomes":["Create a craft workspace","Organize a small room"],"categories":[{"slug":"sewing-machines","name":"Sewing Machines"},{"slug":"craft-storage","name":"Craft Storage"}]}).json()
    assert data["outcome"] == "Create a craft workspace"
    assert data["budget"] == 20000
    assert data["width_cm"] == 90
    assert "sewing-machines" in data["owned_categories"]

def test_text_interpreter_preserves_unknown_custom_goal_and_items():
    data=client.post("/v1/interpret",json={"text":"I already have an aquarium. Help me create a weekly fish-tank cleaning kit under ₹3,000.","outcomes":["Complete what I already have","Add useful extras"],"categories":[]}).json()
    assert "fish-tank cleaning" in data["outcome"].lower()
    assert "aquarium" in [item.lower() for item in data["owned_items"]]
    assert data["budget"] == 3000
