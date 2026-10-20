"""Unit tests for the Parser and AST construction."""

import pytest
from backend.app.compiler.lexer import Lexer
from backend.app.compiler.parser import Parser, ParseError


def test_parser_valid_program():
    source = """
    NPC Collector {
        WHEN TREASURE_NEAR:
            COLLECT
        WHEN PATH_CLEAR:
            MOVE_FORWARD
    }
    """
    tokens = Lexer(source).tokenize()
    ast = Parser(tokens).parse()

    assert ast.npc.name == "Collector"
    assert len(ast.npc.rules) == 2
    assert ast.npc.rules[0].condition.name == "TREASURE_NEAR"
    assert ast.npc.rules[0].action.name == "COLLECT"
    assert ast.npc.rules[1].condition.name == "PATH_CLEAR"
    assert ast.npc.rules[1].action.name == "MOVE_FORWARD"


def test_parser_missing_colon():
    source = "NPC Guard { WHEN WALL_AHEAD TURN_LEFT }"
    tokens = Lexer(source).tokenize()
    parser = Parser(tokens)
    with pytest.raises(ParseError) as exc_info:
        parser.parse()
    assert "Expected ':'" in str(exc_info.value)


def test_parser_missing_rbrace():
    source = "NPC Guard { WHEN WALL_AHEAD: TURN_LEFT"
    tokens = Lexer(source).tokenize()
    parser = Parser(tokens)
    with pytest.raises(ParseError) as exc_info:
        parser.parse()
    assert "Unclosed NPC block" in str(exc_info.value)


def test_parser_empty_body():
    source = "NPC EmptyNPC { }"
    tokens = Lexer(source).tokenize()
    ast = Parser(tokens).parse()
    assert ast.npc.name == "EmptyNPC"
    assert len(ast.npc.rules) == 0
