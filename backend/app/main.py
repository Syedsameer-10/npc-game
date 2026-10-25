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
        {
            "id": "survivor",
            "title": "Survivor NPC",
            "description": "Tactical retreat NPC that runs from enemies, jumps hazard pits, gathers cores, and halts to self-repair when health is low.",
            "filename": "survivor.npc",
        },
        {
            "id": "infiltrator",
            "title": "Infiltrator NPC",
            "description": "Extraction specialist that collects data cores, neutralizes sentries, jumps pits, and locks down at the exit gate.",
            "filename": "infiltrator.npc",
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


@app.get("/api/health")
@app.get("/health")
async def health_check():
    """Health check endpoint for Render service monitoring."""
    return {
        "status": "healthy",
        "service": "npc-behavior-compiler",
        "version": "1.0.0",
    }


# Mount frontend static or built dist files if directory exists
DIST_DIR = FRONTEND_DIR / "dist"
if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # 1. Direct file lookup in dist (e.g. vite.svg, favicon.ico)
        if full_path:
            file_path = DIST_DIR / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))
        # 2. SPA index fallback
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"status": "healthy", "service": "npc-behavior-compiler"}
elif FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    async def serve_index():
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return {"status": "healthy", "service": "npc-behavior-compiler"}
