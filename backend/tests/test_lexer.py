"""Unit tests for the Lexer."""

import pytest
from backend.app.compiler.tokens import TokenType
from backend.app.compiler.lexer import Lexer, LexicalError


def test_lexer_valid_tokens():
    source = """
    # Comment
    NPC Guard {
        WHEN WALL_AHEAD:
            TURN_LEFT
    }
    """
    lexer = Lexer(source)
    tokens = lexer.tokenize()

    types = [t.type for t in tokens]
    expected = [
        TokenType.NPC,
        TokenType.IDENTIFIER,
        TokenType.LBRACE,
        TokenType.WHEN,
        TokenType.CONDITION,
        TokenType.COLON,
        TokenType.ACTION,
        TokenType.RBRACE,
        TokenType.EOF,
    ]
    assert types == expected
    assert tokens[1].value == "Guard"
    assert tokens[4].value == "WALL_AHEAD"
    assert tokens[6].value == "TURN_LEFT"


def test_lexer_tracks_lines_and_columns():
    source = "NPC Scout {\n  WHEN PIT_AHEAD:\n    JUMP\n}"
    lexer = Lexer(source)
    tokens = lexer.tokenize()

    # Scout token
    assert tokens[1].line == 1
    assert tokens[1].column == 5

    # WHEN token
    assert tokens[3].line == 2
    assert tokens[3].column == 3


def test_lexer_invalid_character():
    source = "NPC Scout { WHEN WALL_AHEAD: $TURN_LEFT }"
    lexer = Lexer(source)
    with pytest.raises(LexicalError) as exc_info:
        lexer.tokenize()
    assert "Unexpected character '$'" in str(exc_info.value)
    assert exc_info.value.line == 1
