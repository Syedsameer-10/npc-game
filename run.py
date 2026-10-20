"""Convenience runner for the NPC Behavior Compiler server."""

import sys
import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("  NPC BEHAVIOR COMPILER & SIMULATION WORKBENCH")
    print("  Compiler Pipeline & Tactical Simulation")
    print("  Serving at: http://127.0.0.1:8000")
    print("=" * 60)

    uvicorn.run(
        "backend.app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
