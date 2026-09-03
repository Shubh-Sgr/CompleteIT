import re
from .models import TextInterpretRequest, TextInterpretResponse

STOP_WORDS = {"a","an","and","for","the","to","my","i","in","of","with","set","setup","collection","create","build","want","need"}
UNIVERSAL_ACTIONS = {"complete what i already have","add useful extras","start something from scratch","replace or upgrade items","organize and store items","protect or maintain items","make it portable","spend less"}

def tokens(value: str) -> set[str]:
    return {x for x in re.findall(r"[a-z0-9]+", value.lower()) if x not in STOP_WORDS and len(x) > 1}

def parse_money(text: str, fallback: int | None) -> int:
    normalized = text.lower().replace(",", "")
    patterns = [
        (r"(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k|thousand)?", 1),
        (r"(?:under|below|budget(?: of)?|within|spend)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k|thousand)?", 1),
    ]
    for pattern, _ in patterns:
        match = re.search(pattern, normalized)
        if match:
            amount = float(match.group(1))
            suffix = match.group(2) or ""
            if suffix in {"lakh", "lac"}: amount *= 100000
            elif suffix in {"k", "thousand"}: amount *= 1000
            return max(500, int(amount))
    return fallback or 30000

def parse_dimension(text: str, label: str) -> float | None:
    patterns = [
        rf"{label}\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)\s*(cm|m|metre|meter|ft|feet)?",
        r"(\d+(?:\.\d+)?)\s*(cm|m|metre|meter|ft|feet)\s*(?:wide|deep)" if label == "width" else r"(\d+(?:\.\d+)?)\s*(cm|m|metre|meter|ft|feet)\s*deep",
    ]
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            value = float(match.group(1)); unit = match.group(2) or "cm"
            if unit in {"m", "metre", "meter"}: value *= 100
            elif unit in {"ft", "feet"}: value *= 30.48
            return round(value, 1)
    return None

def interpret_text(request: TextInterpretRequest) -> TextInterpretResponse:
    text_tokens = tokens(request.text)
    ranked = []
    for outcome in request.outcomes:
        outcome_tokens = tokens(outcome)
        overlap = len(text_tokens & outcome_tokens)
        phrase_bonus = 2 if any(word in request.text.lower() for word in outcome_tokens) else 0
        ranked.append((overlap + phrase_bonus, outcome))
    ranked.sort(key=lambda x: x[0], reverse=True)
    best_score, outcome = ranked[0] if ranked else (0, "Complete what I have")

    def custom_goal() -> str:
        compact = re.sub(r"\s+", " ", request.text).strip()
        match = re.search(r"(?:i\s+)?(?:want|need|plan|trying|looking|help me)\s+(?:to\s+)?(.+?)(?:[.!?]|$)", compact, re.I)
        goal = (match.group(1) if match else compact).strip(" .")
        if len(goal) > 100: goal = goal[:97].rstrip() + "…"
        return goal[0].upper() + goal[1:] if goal else "Complete what I have"

    used_custom_goal = best_score == 0 or outcome.lower() in UNIVERSAL_ACTIONS
    if used_custom_goal:
        outcome = custom_goal()

    owned = []
    desired = []
    lower = request.text.lower()
    ownership_markers = ("have", "own", "already", "using", "got", "existing")
    for category in request.categories:
        variants = {category.slug.replace("-", " "), category.name.lower(), *[alias.lower() for alias in category.aliases]}
        singulars = {v[:-1] if v.endswith("s") else v for v in variants}
        fragments = variants | singulars
        locations = [lower.find(v) for v in fragments if v and lower.find(v) >= 0]
        if not locations: continue
        position = min(locations)
        context = lower[max(0, position - 55):position]
        if any(marker in context for marker in ownership_markers): owned.append(category.slug)
        else: desired.append(category.slug)

    constraints = []
    constraint_terms = {"small":"Limited space","hostel":"Hostel/shared-room rules","rental":"No permanent drilling","quiet":"Low-noise use","portable":"Portable/foldable","ergonomic":"Ergonomic comfort","minimal":"Minimal appearance","used":"Used products acceptable"}
    for term, explanation in constraint_terms.items():
        if term in lower: constraints.append(explanation)
    style_match = re.search(r"(?:a|an|prefer|with)\s+([a-z][a-z -]{1,30}?)\s+(?:look|style|aesthetic)", lower)
    style = style_match.group(1).strip() if style_match else None
    preference = "USED" if "used" in lower or "second hand" in lower else "NEW" if "new only" in lower else "EITHER"
    width = parse_dimension(request.text, "width")
    depth = parse_dimension(request.text, "depth")
    questions = []
    if not owned: questions.append("Which items do you already have, if any?")
    if not desired: questions.append("Are there particular additions or missing pieces you want included?")
    def free_items(pattern: str) -> list[str]:
        found = []
        for match in re.finditer(pattern, request.text, re.I):
            value = re.split(r"\b(?:under|within|because|so that|help me|and help)\b", match.group(1), maxsplit=1, flags=re.I)[0]
            for item in re.split(r",|\band\b", value):
                clean = re.sub(r"^(?:an?|the|some|my)\s+", "", item.strip(), flags=re.I).strip(" .")
                if 1 < len(clean) <= 80: found.append(clean)
        return list(dict.fromkeys(found))[:12]

    owned_items = free_items(r"\b(?:already have|have|own|using|got)\s+(.+?)(?:[.!?;\n]|$)")
    desired_items = free_items(r"\b(?:want|need|plan|looking|help me)\s+(?:to\s+)?(?:add|include|buy|find)\s+(.+?)(?:[.!?;\n]|$)")
    confidence = .72 if used_custom_goal else min(.95, .45 + best_score * .12)
    budget = parse_money(request.text, request.current_budget)
    interpretation = [(f"Kept your specific request as a custom outcome: ‘{outcome}’." if used_custom_goal else f"Matched the request to ‘{outcome}’ using {best_score} intent signals."), f"Parsed a total budget of ₹{budget:,}."]
    if owned: interpretation.append("Recognized owned categories only where the text used ownership language.")
    if constraints: interpretation.append(f"Captured {len(constraints)} space or preference constraints.")
    if desired: interpretation.append("Recognized requested categories separately from items you already own.")
    return TextInterpretResponse(outcome=outcome,outcome_confidence=confidence,budget=budget,width_cm=width,depth_cm=depth,owned_categories=owned,desired_categories=desired,owned_items=owned_items,desired_items=desired_items,constraints=constraints,style=style,preference=preference,clarifying_questions=questions,interpretation=interpretation)
