"""Intermediate Representation (IR) generation for NPC Behavior Language."""

from typing import List, Dict, Any
from .ast import ProgramNode, RuleNode


class IRInstruction:
    def __init__(self, condition: str, action: str, priority: int, line: int):
        self.condition = condition
        self.action = action
        self.priority = priority
        self.line = line

    def to_code(self) -> str:
        return f"IF {self.condition} THEN {self.action}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "op": "BRANCH_IF",
            "condition": self.condition,
            "action": self.action,
            "priority": self.priority,
            "line": self.line,
            "instruction": self.to_code(),
        }

    def __repr__(self) -> str:
        return f"IRInstruction({self.to_code()}, priority={self.priority})"


class IRProgram:
    def __init__(self, npc_name: str, instructions: List[IRInstruction]):
        self.npc_name = npc_name
        self.instructions = instructions

    def to_code_list(self) -> List[str]:
        return [inst.to_code() for inst in self.instructions]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "npc": self.npc_name,
            "instructions": [inst.to_dict() for inst in self.instructions],
            "ir_code": self.to_code_list(),
        }


class IRGenerator:
    """Generates a simplified 3-address/rule-based Intermediate Representation."""

    def generate(self, ast: ProgramNode) -> IRProgram:
        npc = ast.npc
        instructions: List[IRInstruction] = []

        for idx, rule in enumerate(npc.rules):
            inst = IRInstruction(
                condition=rule.condition.name,
                action=rule.action.name,
                priority=idx + 1,
                line=rule.line,
            )
            instructions.append(inst)

        return IRProgram(npc_name=npc.name, instructions=instructions)
