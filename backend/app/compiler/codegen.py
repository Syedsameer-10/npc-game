"""Code Generator / Executable Rule Table Generator for NPC Behavior."""

from typing import Dict, Any, List
from .ir import IRProgram


class CodeGenerator:
    """Generates the runtime executable behavior table / state-machine config

    from the intermediate representation.
    """

    def generate(self, ir_program: IRProgram) -> Dict[str, Any]:
        rules: List[Dict[str, Any]] = []

        # Deduplicate and build runtime evaluation list respecting source priority
        seen_conditions = set()
        for inst in ir_program.instructions:
            # We keep all rules in table, but mark active precedence
            is_active = inst.condition not in seen_conditions
            seen_conditions.add(inst.condition)

            rules.append({
                "id": f"rule_{inst.priority}",
                "condition": inst.condition,
                "action": inst.action,
                "priority": inst.priority,
                "isStochastic": inst.is_stochastic,
                "alternatives": inst.alternatives,
                "probability": inst.probability,
                "isActive": is_active,
                "sourceLine": inst.line,
            })

        return {
            "npc": ir_program.npc_name,
            "ruleCount": len(rules),
            "rules": rules,
            "evaluationMode": "FIRST_MATCH_PRIORITY",
        }
