from .models import CompletionRequest, CompletionItem

def complete(request: CompletionRequest) -> list[CompletionItem]:
    """Complete any caller-supplied template; this service owns no category allow-list."""
    result: list[CompletionItem] = []
    for slot in sorted(request.slots, key=lambda item: item.priority):
        owned = next((category for category in slot.categories if category in request.owned_categories), None)
        category = owned or (slot.categories[0] if slot.categories else "custom")
        if owned:
            result.append(CompletionItem(category=owned, slot=slot.name, section="owned", reason=f"An owned item already fills {slot.name.lower()}.", confidence=.98, compatibility="confirmed by ownership"))
            continue
        section = "missing-essential" if slot.required else "useful" if slot.priority <= 6 else "optional"
        needs_details = any(x in category for x in ["power", "mount", "adapter"])
        result.append(CompletionItem(category=category, slot=slot.name, section=section, reason=f"The selected template maps {category} to the {slot.name.lower()} function.", confidence=.65 if needs_details else .82, compatibility="more information required" if needs_details else "likely compatible"))
    return result
