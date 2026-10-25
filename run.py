"""Convenience runner for the NPC Behavior Compiler server."""

import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    is_prod = os.environ.get("RENDER") is not None or os.environ.get("ENVIRONMENT") == "production"

    print("=" * 60)
    print("  NPC BEHAVIOR COMPILER & SIMULATION WORKBENCH")
    print("  Compiler Pipeline & Tactical Simulation")
    print(f"  Serving at: http://{host}:{port}")
    print("=" * 60)

    uvicorn.run(
        "backend.app.main:app",
        host=host,
        port=port,
        reload=not is_prod,
    )
