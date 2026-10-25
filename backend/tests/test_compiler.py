"""End-to-end unit tests for the unified NPCCompiler pipeline."""

from backend.app.compiler.compiler import NPCCompiler


def test_compiler_end_to_end_success():
    source = """
    NPC Guard {
        WHEN WALL_AHEAD:
            TURN_LEFT

        WHEN PIT_AHEAD:
            JUMP

        WHEN ENEMY_NEAR:
            ATTACK

        WHEN PLAYER_SEEN:
            CHASE

        WHEN PATH_CLEAR:
            MOVE_FORWARD
    }
    """
    compiler = NPCCompiler()
    res = compiler.compile(source)

    assert res.success is True
    assert len(res.tokens) > 0
    assert res.ast["type"] == "Program"
    assert res.ast["npc"]["name"] == "Guard"
    assert len(res.ast["npc"]["rules"]) == 5
    assert len(res.ir["instructions"]) == 5
    assert res.behavior["npc"] == "Guard"
    assert len(res.behavior["rules"]) == 5
    assert res.phases_completed == [
        "Lexical Analysis",
        "Syntax Analysis",
        "AST Construction",
        "Semantic Analysis",
        "Intermediate Code Generation",
        "Behavior Generation",
    ]


def test_compiler_syntax_error_halt():
    source = "NPC Guard { WHEN WALL_AHEAD TURN_LEFT }"
    compiler = NPCCompiler()
    res = compiler.compile(source)

    assert res.success is False
    assert len(res.errors) == 1
    assert res.errors[0]["phase"] == "Syntax Analysis"


def test_compiler_semantic_error_halt():
    source = "NPC Guard { WHEN PIT_AHEAD: COLLECT }"
    compiler = NPCCompiler()
    res = compiler.compile(source)

    assert res.success is False
    assert len(res.errors) == 1
    assert res.errors[0]["phase"] == "Semantic Analysis"


def test_compiler_stochastic_50_50_rules():
    source = """
    NPC Scout {
        WHEN WALL_AHEAD: TURN_LEFT | TURN_RIGHT
        WHEN PATH_CLEAR: MOVE_FORWARD
    }
    """
    compiler = NPCCompiler()
    res = compiler.compile(source)

    assert res.success is True
    assert res.errors == []
    rule0 = res.behavior["rules"][0]
    assert rule0["condition"] == "WALL_AHEAD"
    assert rule0["isStochastic"] is True
    assert rule0["alternatives"] == ["TURN_LEFT", "TURN_RIGHT"]
