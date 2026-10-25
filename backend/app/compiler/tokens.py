"""Token definitions for the NPC Behavior Compiler."""

from enum import Enum
from typing import Any, Dict, Optional


class TokenType(str, Enum):
    # Keywords
    NPC = "NPC"
    WHEN = "WHEN"

    # Identifiers
    IDENTIFIER = "IDENTIFIER"

    # Conditions
    CONDITION = "CONDITION"

    # Actions
    ACTION = "ACTION"

    # Symbols / Delimiters
    LBRACE = "LBRACE"
    RBRACE = "RBRACE"
    COLON = "COLON"
    PIPE = "PIPE"
    LPAREN = "LPAREN"
    RPAREN = "RPAREN"
    PERCENT = "PERCENT"
    NUMBER = "NUMBER"

    # Special
    EOF = "EOF"


VALID_CONDITIONS = {
    "WALL_AHEAD",
    "PIT_AHEAD",
    "PATH_CLEAR",
    "ENEMY_NEAR",
    "PLAYER_SEEN",
    "PLAYER_NEAR",
    "TREASURE_NEAR",
    "HEALTH_LOW",
    "DOOR_AHEAD",
}

VALID_ACTIONS = {
    "MOVE_FORWARD",
    "TURN_LEFT",
    "TURN_RIGHT",
    "JUMP",
    "ATTACK",
    "CHASE",
    "RUN_AWAY",
    "COLLECT",
    "STOP",
}

KEYWORDS = {
    "NPC": TokenType.NPC,
    "WHEN": TokenType.WHEN,
}


class Token:
    def __init__(self, type_: TokenType, value: str, line: int, column: int):
        self.type = type_
        self.value = value
        self.line = line
        self.column = column

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "value": self.value,
            "line": self.line,
            "column": self.column,
        }

    def __repr__(self) -> str:
        return f"Token({self.type.value}, {self.value!r}, line={self.line}, col={self.column})"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Token):
            return False
        return (
            self.type == other.type
            and self.value == other.value
            and self.line == other.line
            and self.column == other.column
        )
