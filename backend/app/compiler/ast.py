"""Abstract Syntax Tree (AST) node definitions."""

from typing import List, Dict, Any, Optional


class ASTNode:
    def __init__(self, line: int = 0, column: int = 0):
        self.line = line
        self.column = column

    def to_dict(self) -> Dict[str, Any]:
        raise NotImplementedError


class ConditionNode(ASTNode):
    def __init__(self, name: str, line: int = 0, column: int = 0):
        super().__init__(line, column)
        self.name = name

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "Condition",
            "name": self.name,
            "line": self.line,
            "column": self.column,
        }

    def __repr__(self) -> str:
        return f"ConditionNode({self.name})"


class ActionNode(ASTNode):
    def __init__(self, name: str, line: int = 0, column: int = 0):
        super().__init__(line, column)
        self.name = name

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "Action",
            "name": self.name,
            "line": self.line,
            "column": self.column,
        }

    def __repr__(self) -> str:
        return f"ActionNode({self.name})"


class RuleNode(ASTNode):
    def __init__(
        self,
        condition: ConditionNode,
        action: ActionNode,
        line: int = 0,
        column: int = 0,
        alternatives: Optional[List[str]] = None,
        is_stochastic: bool = False,
        probability: float = 1.0,
    ):
        super().__init__(line, column)
        self.condition = condition
        self.action = action
        self.alternatives = alternatives or [action.name]
        self.is_stochastic = is_stochastic or (len(self.alternatives) > 1)
        self.probability = probability

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "Rule",
            "condition": self.condition.to_dict(),
            "action": self.action.to_dict(),
            "isStochastic": self.is_stochastic,
            "alternatives": self.alternatives,
            "probability": self.probability,
            "line": self.line,
            "column": self.column,
        }

    def __repr__(self) -> str:
        return f"RuleNode({self.condition} -> {self.action})"


class NPCNode(ASTNode):
    def __init__(
        self,
        name: str,
        rules: Optional[List[RuleNode]] = None,
        line: int = 0,
        column: int = 0,
    ):
        super().__init__(line, column)
        self.name = name
        self.rules = rules if rules is not None else []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "NPCDeclaration",
            "name": self.name,
            "rules": [rule.to_dict() for rule in self.rules],
            "line": self.line,
            "column": self.column,
        }

    def __repr__(self) -> str:
        return f"NPCNode({self.name}, rules_count={len(self.rules)})"


class ProgramNode(ASTNode):
    def __init__(
        self,
        npc: NPCNode,
        line: int = 0,
        column: int = 0,
    ):
        super().__init__(line, column)
        self.npc = npc

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "Program",
            "npc": self.npc.to_dict(),
            "line": self.line,
            "column": self.column,
        }

    def __repr__(self) -> str:
        return f"ProgramNode(npc={self.npc.name})"
