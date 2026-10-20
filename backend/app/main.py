"""FastAPI application for the NPC Behavior Compiler."""

import os
from pathlib import Path
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .compiler import NPCCompiler
from .schemas import CompileRequest, CompileResponse, PresetExample

app = FastAPI(
    title="NPC Behavior Compiler API",
    description="Compiler pipeline and rule generation for 2D Game NPC behaviors",
    version="1.0.0",
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

compiler = NPCCompiler()

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
EXAMPLES_DIR = BASE_DIR / "examples"


@app.post("/api/compile", response_model=CompileResponse)
async def compile_npc_code(request: CompileRequest):
    """Compiles DSL source code through all 6 phases:

    Lexer -> Parser -> AST -> Semantic Analysis -> IR -> CodeGen / Rule Table.
    """
    result = compiler.compile(request.source)
    return result.to_dict()


@app.get("/api/presets", response_model=List[PresetExample])
async def get_presets():
    """Returns preset example scripts."""
    presets = [
        {
            "id": "guard",
            "title": "Guard NPC",
            "description": "Standard defensive guard that jumps pits, attacks enemies, chases player, and turns at walls.",
            "filename": "guard.npc",
        },
        {
            "id": "collector",
            "title": "Collector NPC",
            "description": "Loot-oriented NPC that prioritizes collecting nearby treasures, flees from enemies, and navigates obstacles.",
            "filename": "collector.npc",
        },
        {
            "id": "patrol",
            "title": "Patrol NPC",
            "description": "Patrols open areas, turns on walls, chases any sighted player and attacks when close.",
            "filename": "patrol.npc",
        },
    ]

    result: List[PresetExample] = []
    for p in presets:
        file_path = EXAMPLES_DIR / p["filename"]
        source_code = ""
        if file_path.exists():
            source_code = file_path.read_text(encoding="utf-8")
        result.append(
            PresetExample(
                id=p["id"],
                title=p["title"],
                description=p["description"],
                source=source_code,
            )
        )
    return result


# Mount frontend static or built dist files if directory exists
DIST_DIR = FRONTEND_DIR / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/")
    async def serve_index():
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"message": "NPC Behavior Compiler Backend is Running"}
elif FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    async def serve_index():
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"message": "NPC Behavior Compiler Backend is Running"}
