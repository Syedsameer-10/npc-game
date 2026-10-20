/**
 * Browser-side NPC Behavior Compiler (100% parity with Python Backend)
 * Provides zero-latency real-time compilation and offline support.
 */

const VALID_CONDITIONS = new Set([
  "WALL_AHEAD",
  "PIT_AHEAD",
  "PATH_CLEAR",
  "ENEMY_NEAR",
  "PLAYER_SEEN",
  "PLAYER_NEAR",
  "TREASURE_NEAR",
  "HEALTH_LOW",
  "DOOR_AHEAD",
]);

const VALID_ACTIONS = new Set([
  "MOVE_FORWARD",
  "TURN_LEFT",
  "TURN_RIGHT",
  "JUMP",
  "ATTACK",
  "CHASE",
  "RUN_AWAY",
  "COLLECT",
  "STOP",
]);

const CONDITION_ACTION_COMPATIBILITY = {
  WALL_AHEAD: new Set(["TURN_LEFT", "TURN_RIGHT", "STOP"]),
  PIT_AHEAD: new Set(["JUMP", "TURN_LEFT", "TURN_RIGHT", "STOP"]),
  PATH_CLEAR: new Set(["MOVE_FORWARD", "STOP"]),
  ENEMY_NEAR: new Set(["ATTACK", "RUN_AWAY", "CHASE"]),
  PLAYER_SEEN: new Set(["CHASE", "RUN_AWAY", "ATTACK"]),
  PLAYER_NEAR: new Set(["ATTACK", "RUN_AWAY"]),
  TREASURE_NEAR: new Set(["COLLECT"]),
  HEALTH_LOW: new Set(["RUN_AWAY", "STOP"]),
  DOOR_AHEAD: new Set(["STOP", "TURN_LEFT", "TURN_RIGHT"]),
};

class BrowserCompiler {
  compile(source) {
    const phases = [];
    const errors = [];
    const warnings = [];

    // 1. Lexical Analysis
    let tokens = [];
    try {
      tokens = this.tokenize(source);
      phases.push("Lexical Analysis");
    } catch (err) {
      errors.push({
        phase: "Lexical Analysis",
        line: err.line || 1,
        column: err.column || 1,
        message: err.message,
      });
      return { success: false, errors, warnings, phasesCompleted: phases };
    }

    // 2. Syntax Analysis & AST
    let ast = null;
    try {
      ast = this.parse(tokens);
      phases.push("Syntax Analysis");
      phases.push("AST Construction");
    } catch (err) {
      errors.push({
        phase: "Syntax Analysis",
        line: err.line || 1,
        column: err.column || 1,
        message: err.message,
      });
      return { success: false, tokens, errors, warnings, phasesCompleted: phases };
    }

    // 3. Semantic Analysis
    const semanticRes = this.analyzeSemantics(ast);
    warnings.push(...semanticRes.warnings);
    if (semanticRes.errors.length > 0) {
      errors.push(...semanticRes.errors);
      return {
        success: false,
        tokens,
        ast,
        semantic: semanticRes,
        errors,
        warnings,
        phasesCompleted: phases,
      };
    }
    phases.push("Semantic Analysis");

    // 4. Intermediate Representation
    const ir = this.generateIR(ast);
    phases.push("Intermediate Code Generation");

    // 5. Behavior Generation
    const behavior = this.generateBehavior(ir);
    phases.push("Behavior Generation");

    return {
      success: true,
      tokens,
      ast,
      semantic: { errors: [], warnings: semanticRes.warnings },
      ir,
      behavior,
      errors: [],
      warnings,
      phasesCompleted: phases,
    };
  }

  tokenize(source) {
    const tokens = [];
    let pos = 0;
    let line = 1;
    let col = 1;
    const len = source.length;

    while (pos < len) {
      let ch = source[pos];

      // Whitespace
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        pos++;
        col++;
        continue;
      }
      if (ch === '\n') {
        pos++;
        line++;
        col = 1;
        continue;
      }

      // Comments (# or //)
      if (ch === '#' || (ch === '/' && pos + 1 < len && source[pos + 1] === '/')) {
        while (pos < len && source[pos] !== '\n') {
          pos++;
        }
        continue;
      }

      const startLine = line;
      const startCol = col;

      if (ch === '{') {
        tokens.push({ type: 'LBRACE', value: '{', line: startLine, column: startCol });
        pos++;
        col++;
      } else if (ch === '}') {
        tokens.push({ type: 'RBRACE', value: '}', line: startLine, column: startCol });
        pos++;
        col++;
      } else if (ch === ':') {
        tokens.push({ type: 'COLON', value: ':', line: startLine, column: startCol });
        pos++;
        col++;
      } else if (/[a-zA-Z_]/.test(ch)) {
        let ident = '';
        while (pos < len && /[a-zA-Z0-9_]/.test(source[pos])) {
          ident += source[pos];
          pos++;
          col++;
        }

        if (ident === 'NPC' || ident === 'WHEN') {
          tokens.push({ type: ident, value: ident, line: startLine, column: startCol });
        } else if (VALID_CONDITIONS.has(ident)) {
          tokens.push({ type: 'CONDITION', value: ident, line: startLine, column: startCol });
        } else if (VALID_ACTIONS.has(ident)) {
          tokens.push({ type: 'ACTION', value: ident, line: startLine, column: startCol });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: ident, line: startLine, column: startCol });
        }
      } else {
        const err = new Error(`Unexpected character '${ch}'`);
        err.line = startLine;
        err.column = startCol;
        throw err;
      }
    }

    tokens.push({ type: 'EOF', value: '<EOF>', line, column: col });
    return tokens;
  }

  parse(tokens) {
    let pos = 0;

    function current() {
      return pos < tokens.length ? tokens[pos] : tokens[tokens.length - 1];
    }

    function match(type) {
      const tok = current();
      if (tok.type === type) {
        pos++;
        return tok;
      }
      const err = new Error(`Expected '${type}', got '${tok.value}'`);
      err.line = tok.line;
      err.column = tok.column;
      throw err;
    }

    match('NPC');
    const nameTok = match('IDENTIFIER');
    match('LBRACE');

    const rules = [];
    while (current().type !== 'RBRACE') {
      if (current().type === 'EOF') {
        const err = new Error(`Unclosed NPC block: missing '}' after rules for '${nameTok.value}'`);
        err.line = current().line;
        err.column = current().column;
        throw err;
      }

      const whenTok = match('WHEN');
      const condTok = current();
      if (condTok.type !== 'CONDITION') {
        const err = new Error(`Expected condition, got '${condTok.value}'`);
        err.line = condTok.line;
        err.column = condTok.column;
        throw err;
      }
      pos++;

      const colonTok = current();
      if (colonTok.type !== 'COLON') {
        const err = new Error(`Expected ':' after condition '${condTok.value}'`);
        err.line = colonTok.line;
        err.column = colonTok.column;
        throw err;
      }
      pos++;

      const actTok = current();
      if (actTok.type !== 'ACTION') {
        const err = new Error(`Expected action, got '${actTok.value}'`);
        err.line = actTok.line;
        err.column = actTok.column;
        throw err;
      }
      pos++;

      rules.push({
        type: 'Rule',
        condition: { type: 'Condition', name: condTok.value, line: condTok.line, column: condTok.column },
        action: { type: 'Action', name: actTok.value, line: actTok.line, column: actTok.column },
        line: whenTok.line,
        column: whenTok.column,
      });
    }

    match('RBRACE');

    return {
      type: 'Program',
      npc: {
        type: 'NPCDeclaration',
        name: nameTok.value,
        rules: rules,
        line: nameTok.line,
        column: nameTok.column,
      },
    };
  }

  analyzeSemantics(ast) {
    const errors = [];
    const warnings = [];
    const seen = new Set();
    const npc = ast.npc;

    if (!npc.rules || npc.rules.length === 0) {
      warnings.push({
        phase: 'Semantic Analysis',
        severity: 'warning',
        message: `NPC '${npc.name}' has no behavior rules defined.`,
        line: npc.line,
        column: npc.column,
        suggestion: 'Add at least one rule: WHEN <CONDITION>: <ACTION>',
      });
      return { errors, warnings };
    }

    for (const rule of npc.rules) {
      const cond = rule.condition.name;
      const act = rule.action.name;

      if (seen.has(cond)) {
        warnings.push({
          phase: 'Semantic Analysis',
          severity: 'warning',
          message: `Multiple actions defined for condition '${cond}'. First matching rule will take precedence.`,
          line: rule.line,
          column: rule.column,
          suggestion: `Remove or combine duplicate '${cond}' rule.`,
        });
      } else {
        seen.add(cond);
      }

      const allowed = CONDITION_ACTION_COMPATIBILITY[cond];
      if (allowed) {
        if (!allowed.has(act)) {
          const validList = Array.from(allowed).sort().join(', ');
          errors.push({
            phase: 'Semantic Analysis',
            severity: 'error',
            message: `Action '${act}' is not valid for condition '${cond}'.`,
            line: rule.action.line,
            column: rule.action.column,
            suggestion: `Valid actions for '${cond}': ${validList}`,
          });
        }
      } else {
        errors.push({
          phase: 'Semantic Analysis',
          severity: 'error',
          message: `Unknown condition '${cond}'.`,
          line: rule.condition.line,
          column: rule.condition.column,
        });
      }
    }

    return { errors, warnings };
  }

  generateIR(ast) {
    const instructions = [];
    const irCode = [];
    let priority = 1;

    for (const rule of ast.npc.rules) {
      const instStr = `IF ${rule.condition.name} THEN ${rule.action.name}`;
      irCode.push(instStr);
      instructions.push({
        op: 'BRANCH_IF',
        condition: rule.condition.name,
        action: rule.action.name,
        priority: priority++,
        line: rule.line,
        instruction: instStr,
      });
    }

    return {
      npc: ast.npc.name,
      instructions,
      ir_code: irCode,
    };
  }

  generateBehavior(ir) {
    const rules = [];
    const seen = new Set();

    for (const inst of ir.instructions) {
      const isActive = !seen.has(inst.condition);
      seen.add(inst.condition);

      rules.push({
        id: `rule_${inst.priority}`,
        condition: inst.condition,
        action: inst.action,
        priority: inst.priority,
        isActive: isActive,
        sourceLine: inst.line,
      });
    }

    return {
      npc: ir.npc,
      ruleCount: rules.length,
      rules,
      evaluationMode: 'FIRST_MATCH_PRIORITY',
    };
  }
}

window.BrowserCompiler = BrowserCompiler;
