"""Unified NPC Behavior Compiler Pipeline."""

from typing import Dict, Any, List, Optional
from .tokens import Token
from .lexer import Lexer, LexicalError
from .parser import Parser, ParseError
from .ast import ProgramNode
from .semantic import SemanticAnalyzer, SemanticDiagnostic
from .ir import IRGenerator, IRProgram
from .codegen import CodeGenerator


class CompilationResult:
    def __init__(
        self,
        success: bool,
        tokens: Optional[List[Dict[str, Any]]] = None,
        ast: Optional[Dict[str, Any]] = None,
        semantic: Optional[Dict[str, Any]] = None,
        ir: Optional[Dict[str, Any]] = None,
        behavior: Optional[Dict[str, Any]] = None,
        errors: Optional[List[Dict[str, Any]]] = None,
        warnings: Optional[List[Dict[str, Any]]] = None,
        phases_completed: Optional[List[str]] = None,
    ):
        self.success = success
        self.tokens = tokens or []
        self.ast = ast or {}
        self.semantic = semantic or {"errors": [], "warnings": []}
        self.ir = ir or {}
        self.behavior = behavior or {}
        self.errors = errors or []
        self.warnings = warnings or []
        self.phases_completed = phases_completed or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "tokens": self.tokens,
            "ast": self.ast,
            "semantic": self.semantic,
            "ir": self.ir,
            "behavior": self.behavior,
            "errors": self.errors,
            "warnings": self.warnings,
            "phasesCompleted": self.phases_completed,
        }


class NPCCompiler:
    def __init__(self):
        self.semantic_analyzer = SemanticAnalyzer()
        self.ir_generator = IRGenerator()
        self.code_generator = CodeGenerator()

    def compile(self, source_code: str) -> CompilationResult:
        phases: List[str] = []
        errors: List[Dict[str, Any]] = []
        warnings: List[Dict[str, Any]] = []

        # 1. Lexical Analysis
        try:
            lexer = Lexer(source_code)
            tokens: List[Token] = lexer.tokenize()
            token_dicts = [t.to_dict() for t in tokens]
            phases.append("Lexical Analysis")
        except LexicalError as le:
            errors.append(le.to_dict())
            return CompilationResult(
                success=False,
                errors=errors,
                phases_completed=phases,
            )

        # 2. Syntax Analysis & AST Construction
        try:
            parser = Parser(tokens)
            ast_tree: ProgramNode = parser.parse()
            ast_dict = ast_tree.to_dict()
            phases.append("Syntax Analysis")
            phases.append("AST Construction")
        except ParseError as pe:
            errors.append(pe.to_dict())
            return CompilationResult(
                success=False,
                tokens=token_dicts,
                errors=errors,
                phases_completed=phases,
            )

        # 3. Semantic Analysis
        is_semantically_valid = self.semantic_analyzer.analyze(ast_tree)
        semantic_errors = [e.to_dict() for e in self.semantic_analyzer.errors]
        semantic_warnings = [w.to_dict() for w in self.semantic_analyzer.warnings]
        warnings.extend(semantic_warnings)

        if not is_semantically_valid:
            errors.extend(semantic_errors)
            return CompilationResult(
                success=False,
                tokens=token_dicts,
                ast=ast_dict,
                semantic={
                    "errors": semantic_errors,
                    "warnings": semantic_warnings,
                },
                errors=errors,
                warnings=warnings,
                phases_completed=phases,
            )

        phases.append("Semantic Analysis")

        # 4. Intermediate Representation (IR) Generation
        ir_program: IRProgram = self.ir_generator.generate(ast_tree)
        ir_dict = ir_program.to_dict()
        phases.append("Intermediate Code Generation")

        # 5. Code Generation / Behavior FSM Table
        behavior_dict = self.code_generator.generate(ir_program)
        phases.append("Behavior Generation")

        return CompilationResult(
            success=True,
            tokens=token_dicts,
            ast=ast_dict,
            semantic={
                "errors": [],
                "warnings": semantic_warnings,
            },
            ir=ir_dict,
            behavior=behavior_dict,
            warnings=warnings,
            phases_completed=phases,
        )
