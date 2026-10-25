"""Semantic Analyzer for the NPC Behavior Compiler."""

from typing import List, Dict, Set, Any
from .ast import ProgramNode, NPCNode, RuleNode


# Defined compatibility table from Specification Section 12.1
CONDITION_ACTION_COMPATIBILITY: Dict[str, Set[str]] = {
    "WALL_AHEAD": {"TURN_LEFT", "TURN_RIGHT", "STOP"},
    "PIT_AHEAD": {"JUMP", "TURN_LEFT", "TURN_RIGHT", "STOP"},
    "PATH_CLEAR": {"MOVE_FORWARD", "STOP"},
    "ENEMY_NEAR": {"ATTACK", "RUN_AWAY", "CHASE"},
    "PLAYER_SEEN": {"CHASE", "RUN_AWAY", "ATTACK"},
    "PLAYER_NEAR": {"ATTACK", "RUN_AWAY"},
    "TREASURE_NEAR": {"COLLECT"},
    "HEALTH_LOW": {"RUN_AWAY", "STOP"},
    "DOOR_AHEAD": {"STOP", "TURN_LEFT", "TURN_RIGHT"},
}


class SemanticDiagnostic:
    def __init__(
        self,
        severity: str,  # "error" or "warning"
        message: str,
        line: int,
        column: int,
        suggestion: str = "",
    ):
        self.severity = severity
        self.message = message
        self.line = line
        self.column = column
        self.suggestion = suggestion

    def to_dict(self) -> Dict[str, Any]:
        res = {
            "phase": "Semantic Analysis",
            "severity": self.severity,
            "message": self.message,
            "line": self.line,
            "column": self.column,
        }
        if self.suggestion:
            res["suggestion"] = self.suggestion
        return res

    def __repr__(self) -> str:
        return f"[{self.severity.upper()}] Line {self.line}:{self.column} - {self.message}"


class SemanticAnalyzer:
    def __init__(self):
        self.errors: List[SemanticDiagnostic] = []
        self.warnings: List[SemanticDiagnostic] = []
        self.seen_conditions: Set[str] = set()

    def analyze(self, ast: ProgramNode) -> bool:
        """Runs semantic checks on the AST.
        
        Returns:
            bool: True if there are no errors (warnings are allowed), False otherwise.
        """
        self.errors = []
        self.warnings = []
        self.seen_conditions = set()

        npc = ast.npc
        self._analyze_npc(npc)

        return len(self.errors) == 0

    def _analyze_npc(self, npc: NPCNode) -> None:
        if not npc.rules:
            self.warnings.append(
                SemanticDiagnostic(
                    severity="warning",
                    message=f"NPC '{npc.name}' has no behavior rules defined.",
                    line=npc.line,
                    column=npc.column,
                    suggestion="Add at least one rule: WHEN <CONDITION>: <ACTION>",
                )
            )
            return

        for rule in npc.rules:
            self._analyze_rule(rule)

    def _analyze_rule(self, rule: RuleNode) -> None:
        cond_name = rule.condition.name
        act_name = rule.action.name

        # 1. Duplicate condition check (Warning if non-probabilistic)
        if cond_name in self.seen_conditions and rule.probability >= 1.0:
            self.warnings.append(
                SemanticDiagnostic(
                    severity="warning",
                    message=f"Multiple actions defined for condition '{cond_name}'. First matching rule will take precedence.",
                    line=rule.line,
                    column=rule.column,
                    suggestion=f"Remove or combine duplicate '{cond_name}' rule.",
                )
            )
        else:
            self.seen_conditions.add(cond_name)

        # 2. Compatibility check (Error)
        allowed_actions = CONDITION_ACTION_COMPATIBILITY.get(cond_name)
        if allowed_actions is not None:
            actions_to_check = getattr(rule, "alternatives", [act_name])
            for single_act in actions_to_check:
                if single_act not in allowed_actions:
                    valid_list = ", ".join(sorted(allowed_actions))
                    self.errors.append(
                        SemanticDiagnostic(
                            severity="error",
                            message=f"Action '{single_act}' is not valid for condition '{cond_name}'.",
                            line=rule.action.line,
                            column=rule.action.column,
                            suggestion=f"Valid actions for '{cond_name}': {valid_list}",
                        )
                    )
        else:
            self.errors.append(
                SemanticDiagnostic(
                    severity="error",
                    message=f"Unknown condition '{cond_name}'.",
                    line=rule.condition.line,
                    column=rule.condition.column,
                )
            )
