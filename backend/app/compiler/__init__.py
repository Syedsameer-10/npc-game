"""NPC Behavior Compiler Package."""

from .tokens import Token, TokenType, VALID_ACTIONS, VALID_CONDITIONS
from .lexer import Lexer, LexicalError
from .ast import ProgramNode, NPCNode, RuleNode, ConditionNode, ActionNode
from .parser import Parser, ParseError
from .semantic import SemanticAnalyzer, SemanticDiagnostic
from .ir import IRGenerator, IRInstruction, IRProgram
from .codegen import CodeGenerator
from .compiler import NPCCompiler, CompilationResult

__all__ = [
    "Token",
    "TokenType",
    "VALID_ACTIONS",
    "VALID_CONDITIONS",
    "Lexer",
    "LexicalError",
    "ProgramNode",
    "NPCNode",
    "RuleNode",
    "ConditionNode",
    "ActionNode",
    "Parser",
    "ParseError",
    "SemanticAnalyzer",
    "SemanticDiagnostic",
    "IRGenerator",
    "IRInstruction",
    "IRProgram",
    "CodeGenerator",
    "NPCCompiler",
    "CompilationResult",
]
