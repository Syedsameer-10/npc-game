"""Unit tests for the Semantic Analyzer."""

from backend.app.compiler.lexer import Lexer
from backend.app.compiler.parser import Parser
from backend.app.compiler.semantic import SemanticAnalyzer


def test_semantic_valid_program():
    source = """
    NPC Guard {
        WHEN WALL_AHEAD:
            TURN_LEFT
        WHEN PIT_AHEAD:
            JUMP
        WHEN PATH_CLEAR:
            MOVE_FORWARD
    }
    """
    tokens = Lexer(source).tokenize()
    ast = Parser(tokens).parse()
    analyzer = SemanticAnalyzer()
    is_valid = analyzer.analyze(ast)

    assert is_valid is True
    assert len(analyzer.errors) == 0
    assert len(analyzer.warnings) == 0


def test_semantic_incompatible_action():
    source = """
    NPC BadGuard {
        WHEN PIT_AHEAD:
            COLLECT
    }
    """
    tokens = Lexer(source).tokenize()
    ast = Parser(tokens).parse()
    analyzer = SemanticAnalyzer()
    is_valid = analyzer.analyze(ast)

    assert is_valid is False
    assert len(analyzer.errors) == 1
    assert "Action 'COLLECT' is not valid for condition 'PIT_AHEAD'" in analyzer.errors[0].message
    assert "JUMP" in analyzer.errors[0].suggestion


def test_semantic_duplicate_rule_warning():
    source = """
    NPC Guard {
        WHEN WALL_AHEAD:
            TURN_LEFT
        WHEN WALL_AHEAD:
            TURN_RIGHT
    }
    """
    tokens = Lexer(source).tokenize()
    ast = Parser(tokens).parse()
    analyzer = SemanticAnalyzer()
    is_valid = analyzer.analyze(ast)

    # Warnings do not fail compilation
    assert is_valid is True
    assert len(analyzer.errors) == 0
    assert len(analyzer.warnings) == 1
    assert "Multiple actions defined for condition 'WALL_AHEAD'" in analyzer.warnings[0].message
