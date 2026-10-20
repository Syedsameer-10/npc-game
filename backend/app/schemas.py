"""Pydantic schemas for the NPC Behavior Compiler API."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class CompileRequest(BaseModel):
    source: str = Field(..., description="The NPC Behavior DSL source code")


class DiagnosticItem(BaseModel):
    phase: str
    message: str
    line: Optional[int] = None
    column: Optional[int] = None
    suggestion: Optional[str] = None
    severity: Optional[str] = None


class CompileResponse(BaseModel):
    success: bool
    tokens: List[Dict[str, Any]] = []
    ast: Dict[str, Any] = {}
    semantic: Dict[str, Any] = {}
    ir: Dict[str, Any] = {}
    behavior: Dict[str, Any] = {}
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    phasesCompleted: List[str] = []


class PresetExample(BaseModel):
    id: str
    title: str
    description: str
    source: str
