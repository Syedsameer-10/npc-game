"""Lexical Analyzer for NPC Behavior Language."""

from typing import List, Tuple
from .tokens import Token, TokenType, KEYWORDS, VALID_CONDITIONS, VALID_ACTIONS


class LexicalError(Exception):
    def __init__(self, message: str, line: int, column: int):
        super().__init__(f"Lexical Error at line {line}, col {column}: {message}")
        self.message = message
        self.line = line
        self.column = column

    def to_dict(self):
        return {
            "phase": "Lexical Analysis",
            "line": self.line,
            "column": self.column,
            "message": self.message,
        }


class Lexer:
    def __init__(self, source_code: str):
        self.source = source_code
        self.length = len(source_code)
        self.pos = 0
        self.line = 1
        self.column = 1
        self.tokens: List[Token] = []

    def _peek(self) -> str:
        if self.pos < self.length:
            return self.source[self.pos]
        return ""

    def _advance(self) -> str:
        if self.pos < self.length:
            ch = self.source[self.pos]
            self.pos += 1
            if ch == "\n":
                self.line += 1
                self.column = 1
            else:
                self.column += 1
            return ch
        return ""

    def _skip_whitespace_and_comments(self) -> None:
        while self.pos < self.length:
            ch = self._peek()

            # Whitespace
            if ch in (" ", "\t", "\r", "\n"):
                self._advance()
                continue

            # Python-style comment (#) or C-style comment (//)
            if ch == "#":
                while self.pos < self.length and self._peek() != "\n":
                    self._advance()
                continue

            if ch == "/" and self.pos + 1 < self.length and self.source[self.pos + 1] == "/":
                while self.pos < self.length and self._peek() != "\n":
                    self._advance()
                continue

            break

    def tokenize(self) -> List[Token]:
        self.tokens = []
        self.pos = 0
        self.line = 1
        self.column = 1

        while self.pos < self.length:
            self._skip_whitespace_and_comments()
            if self.pos >= self.length:
                break

            start_line = self.line
            start_col = self.column
            ch = self._peek()

            # Single-character tokens
            if ch == "{":
                self._advance()
                self.tokens.append(Token(TokenType.LBRACE, "{", start_line, start_col))
            elif ch == "}":
                self._advance()
                self.tokens.append(Token(TokenType.RBRACE, "}", start_line, start_col))
            elif ch == ":":
                self._advance()
                self.tokens.append(Token(TokenType.COLON, ":", start_line, start_col))
            elif ch == "|":
                self._advance()
                self.tokens.append(Token(TokenType.PIPE, "|", start_line, start_col))
            elif ch == "(":
                self._advance()
                self.tokens.append(Token(TokenType.LPAREN, "(", start_line, start_col))
            elif ch == ")":
                self._advance()
                self.tokens.append(Token(TokenType.RPAREN, ")", start_line, start_col))
            elif ch == "%":
                self._advance()
                self.tokens.append(Token(TokenType.PERCENT, "%", start_line, start_col))
            elif ch.isdigit():
                num_str = ""
                while self.pos < self.length and (self._peek().isdigit() or self._peek() == "."):
                    num_str += self._advance()
                self.tokens.append(Token(TokenType.NUMBER, num_str, start_line, start_col))
            elif ch.isalpha() or ch == "_":
                # Identifier or keyword or condition or action
                ident = ""
                while self.pos < self.length and (self._peek().isalnum() or self._peek() == "_"):
                    ident += self._advance()

                if ident in KEYWORDS:
                    self.tokens.append(Token(KEYWORDS[ident], ident, start_line, start_col))
                elif ident in VALID_CONDITIONS:
                    self.tokens.append(Token(TokenType.CONDITION, ident, start_line, start_col))
                elif ident in VALID_ACTIONS:
                    self.tokens.append(Token(TokenType.ACTION, ident, start_line, start_col))
                else:
                    self.tokens.append(Token(TokenType.IDENTIFIER, ident, start_line, start_col))
            else:
                bad_char = self._advance()
                raise LexicalError(
                    f"Unexpected character '{bad_char}'",
                    line=start_line,
                    column=start_col,
                )

        self.tokens.append(Token(TokenType.EOF, "<EOF>", self.line, self.column))
        return self.tokens
