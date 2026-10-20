"""Recursive-Descent Parser for the NPC Behavior Language."""

from typing import List, Optional
from .tokens import Token, TokenType
from .ast import ProgramNode, NPCNode, RuleNode, ConditionNode, ActionNode


class ParseError(Exception):
    def __init__(self, message: str, line: int, column: int):
        super().__init__(f"Syntax Error at line {line}, col {column}: {message}")
        self.message = message
        self.line = line
        self.column = column

    def to_dict(self):
        return {
            "phase": "Syntax Analysis",
            "line": self.line,
            "column": self.column,
            "message": self.message,
        }


class Parser:
    """Hand-written recursive-descent LL(1) parser.

    Grammar:
        program      -> NPC IDENTIFIER LBRACE rule_list RBRACE EOF
        rule_list    -> rule rule_list | ε
        rule         -> WHEN CONDITION COLON ACTION
    """

    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0

    def _current(self) -> Token:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return self.tokens[-1]

    def _peek_next(self) -> Optional[Token]:
        if self.pos + 1 < len(self.tokens):
            return self.tokens[self.pos + 1]
        return None

    def _match(self, expected_type: TokenType) -> Token:
        token = self._current()
        if token.type == expected_type:
            self.pos += 1
            return token
        raise ParseError(
            f"Expected '{expected_type.value}', got '{token.value}' ({token.type.value})",
            line=token.line,
            column=token.column,
        )

    def parse(self) -> ProgramNode:
        """Parse full program: NPC <ident> { <rules>* } EOF"""
        if not self.tokens:
            raise ParseError("Source code is empty", line=1, column=1)

        npc_node = self._parse_npc_declaration()

        # Check EOF
        eof_token = self._current()
        if eof_token.type != TokenType.EOF:
            raise ParseError(
                f"Unexpected token '{eof_token.value}' after NPC block definition",
                line=eof_token.line,
                column=eof_token.column,
            )

        return ProgramNode(npc=npc_node, line=npc_node.line, column=npc_node.column)

    def _parse_npc_declaration(self) -> NPCNode:
        """NPC IDENTIFIER LBRACE rule_list RBRACE"""
        npc_kw = self._match(TokenType.NPC)
        
        # Name identifier
        ident_tok = self._match(TokenType.IDENTIFIER)
        npc_name = ident_tok.value

        # Opening brace '{'
        self._match(TokenType.LBRACE)

        # Parse rule list
        rules: List[RuleNode] = []
        while self._current().type != TokenType.RBRACE:
            if self._current().type == TokenType.EOF:
                raise ParseError(
                    f"Unclosed NPC block: missing '}}' after rules for '{npc_name}'",
                    line=self._current().line,
                    column=self._current().column,
                )
            
            rule = self._parse_rule()
            rules.append(rule)

        # Closing brace '}'
        self._match(TokenType.RBRACE)

        return NPCNode(name=npc_name, rules=rules, line=npc_kw.line, column=npc_kw.column)

    def _parse_rule(self) -> RuleNode:
        """WHEN CONDITION COLON ACTION"""
        when_tok = self._match(TokenType.WHEN)

        # Condition
        cond_tok = self._current()
        if cond_tok.type != TokenType.CONDITION:
            raise ParseError(
                f"Expected condition (e.g. WALL_AHEAD, PIT_AHEAD, PATH_CLEAR), got '{cond_tok.value}'",
                line=cond_tok.line,
                column=cond_tok.column,
            )
        self.pos += 1
        condition_node = ConditionNode(
            name=cond_tok.value, line=cond_tok.line, column=cond_tok.column
        )

        # Colon ':'
        colon_tok = self._current()
        if colon_tok.type != TokenType.COLON:
            raise ParseError(
                f"Expected ':' after condition '{cond_tok.value}'",
                line=colon_tok.line,
                column=colon_tok.column,
            )
        self.pos += 1

        # Action
        act_tok = self._current()
        if act_tok.type != TokenType.ACTION:
            raise ParseError(
                f"Expected action (e.g. MOVE_FORWARD, TURN_LEFT, JUMP, ATTACK), got '{act_tok.value}'",
                line=act_tok.line,
                column=act_tok.column,
            )
        self.pos += 1
        action_node = ActionNode(
            name=act_tok.value, line=act_tok.line, column=act_tok.column
        )

        return RuleNode(
            condition=condition_node,
            action=action_node,
            line=when_tok.line,
            column=when_tok.column,
        )
