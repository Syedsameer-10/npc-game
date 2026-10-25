// Comprehensive 9-Phase NPC Behavior Compiler Engine
// 1. Source -> 2. Tokens -> 3. Automata (NFA/DFA) -> 4. Parser (CST) -> 5. AST -> 6. Semantic -> 7. CFG -> 8. IR -> 9. Optimizer -> 10. CodeGen

export const VALID_CONDITIONS = new Set([
  "WALL_AHEAD", "PIT_AHEAD", "PATH_CLEAR", "ENEMY_NEAR",
  "PLAYER_SEEN", "PLAYER_NEAR", "TREASURE_NEAR", "HEALTH_LOW", "DOOR_AHEAD",
]);

export const VALID_ACTIONS = new Set([
  "MOVE_FORWARD", "TURN_LEFT", "TURN_RIGHT", "JUMP",
  "ATTACK", "CHASE", "RUN_AWAY", "COLLECT", "STOP",
]);

export const COMPAT = {
  WALL_AHEAD:    new Set(["TURN_LEFT", "TURN_RIGHT", "STOP"]),
  PIT_AHEAD:     new Set(["JUMP", "TURN_LEFT", "TURN_RIGHT", "STOP"]),
  PATH_CLEAR:    new Set(["MOVE_FORWARD", "STOP"]),
  ENEMY_NEAR:    new Set(["ATTACK", "RUN_AWAY", "CHASE"]),
  PLAYER_SEEN:   new Set(["CHASE", "RUN_AWAY", "ATTACK"]),
  PLAYER_NEAR:   new Set(["ATTACK", "RUN_AWAY"]),
  TREASURE_NEAR: new Set(["COLLECT"]),
  HEALTH_LOW:    new Set(["RUN_AWAY", "STOP"]),
  DOOR_AHEAD:    new Set(["STOP", "TURN_LEFT", "TURN_RIGHT"]),
};

export const BNF_GRAMMAR = [
  { nonTerminal: "Program", production: "NPC <Identifier> '{' <RuleList> '}' <EOF>", desc: "Root compilation unit declaring NPC container" },
  { nonTerminal: "RuleList", production: "<Rule> <RuleList> | ε", desc: "Sequence of behavioral event-action rules" },
  { nonTerminal: "Rule", production: "WHEN <Condition> [ '(' <Probability> ')' ] ':' <ActionExpr>", desc: "Reactive sensory condition-to-actuator rule mapping with optional probability" },
  { nonTerminal: "ActionExpr", production: "<Action> [ '|' <Action> ]*", desc: "Deterministic action or stochastic multi-branch union (e.g. TURN_LEFT | TURN_RIGHT)" },
  { nonTerminal: "Condition", production: "WALL_AHEAD | PIT_AHEAD | PATH_CLEAR | ENEMY_NEAR | PLAYER_SEEN | PLAYER_NEAR | TREASURE_NEAR | HEALTH_LOW | DOOR_AHEAD", desc: "Sensory suite boolean query" },
  { nonTerminal: "Action", production: "MOVE_FORWARD | TURN_LEFT | TURN_RIGHT | JUMP | ATTACK | CHASE | RUN_AWAY | COLLECT | STOP", desc: "Actuator motor command dispatch" },
];

// ── 1. Lexer ──────────────────────────────────────────────────────────
export function tokenize(src) {
  const tokens = [];
  let pos = 0, line = 1, col = 1;
  const len = src.length;

  while (pos < len) {
    const ch = src[pos];
    if (' \t\r'.includes(ch)) { pos++; col++; continue; }
    if (ch === '\n') { pos++; line++; col = 1; continue; }
    if (ch === '#' || (ch === '/' && src[pos+1] === '/')) {
      while (pos < len && src[pos] !== '\n') pos++;
      continue;
    }
    const sl = line, sc = col;
    if ('{}:|()%'.includes(ch)) {
      tokens.push({
        id: `tok_${tokens.length + 1}`,
        type: ch === '{' ? 'LBRACE' : ch === '}' ? 'RBRACE' : ch === ':' ? 'COLON' : ch === '|' ? 'PIPE' : ch === '(' ? 'LPAREN' : ch === ')' ? 'RPAREN' : 'PERCENT',
        category: ch === '|' ? 'operator' : 'delimiter',
        value: ch,
        line: sl,
        column: sc,
        length: 1,
      });
      pos++; col++; continue;
    }
    if (/[0-9]/.test(ch)) {
      let num = '';
      while (pos < len && /[0-9.]/.test(src[pos])) {
        num += src[pos]; pos++; col++;
      }
      tokens.push({
        id: `tok_${tokens.length + 1}`,
        type: 'NUMBER',
        category: 'literal',
        value: num,
        line: sl,
        column: sc,
        length: num.length,
      });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (pos < len && /[a-zA-Z0-9_]/.test(src[pos])) {
        id += src[pos]; pos++; col++;
      }
      let t = 'IDENTIFIER';
      let cat = 'identifier';
      if (id === 'NPC' || id === 'WHEN') {
        t = id;
        cat = 'keyword';
      } else if (VALID_CONDITIONS.has(id)) {
        t = 'CONDITION';
        cat = 'condition';
      } else if (VALID_ACTIONS.has(id)) {
        t = 'ACTION';
        cat = 'action';
      }
      tokens.push({
        id: `tok_${tokens.length + 1}`,
        type: t,
        category: cat,
        value: id,
        line: sl,
        column: sc,
        length: id.length,
      });
      continue;
    }
    const e = new Error(`Unexpected character '${ch}'`);
    e.line = line; e.column = col; throw e;
  }
  tokens.push({
    id: `tok_${tokens.length + 1}`,
    type: 'EOF',
    category: 'eof',
    value: '<EOF>',
    line,
    column: col,
    length: 0,
  });
  return tokens;
}

// ── 2. Automata (NFA & DFA) ──────────────────────────────────────────
export function buildAutomataTrace(tokens) {
  // DFA formal specification for token recognition
  const dfaStates = [
    { id: 'q0', label: 'q0 (Start)', type: 'start', desc: 'Initial state waiting on lookahead character', isAccept: false },
    { id: 'q_N', label: 'q_N (Prefix "N")', type: 'intermediate', desc: 'Matched prefix "N"', isAccept: false },
    { id: 'q_NPC', label: 'q_NPC (Accept NPC)', type: 'accept', desc: 'Recognized keyword NPC', isAccept: true, tokenType: 'NPC' },
    { id: 'q_W', label: 'q_W (Prefix "W")', type: 'intermediate', desc: 'Matched prefix "W"', isAccept: false },
    { id: 'q_WHEN', label: 'q_WHEN (Accept WHEN)', type: 'accept', desc: 'Recognized keyword WHEN', isAccept: true, tokenType: 'WHEN' },
    { id: 'q_COND', label: 'q_COND (Accept Sensor)', type: 'accept', desc: 'Matched sensor condition enum', isAccept: true, tokenType: 'CONDITION' },
    { id: 'q_ACT', label: 'q_ACT (Accept Action)', type: 'accept', desc: 'Matched actuator action enum', isAccept: true, tokenType: 'ACTION' },
    { id: 'q_ID', label: 'q_ID (Accept Ident)', type: 'accept', desc: 'Matched user identifier [a-zA-Z_][a-zA-Z0-9_]*', isAccept: true, tokenType: 'IDENTIFIER' },
    { id: 'q_SYM', label: 'q_SYM (Accept Delimiter)', type: 'accept', desc: 'Matched punctuation symbol { | } | :', isAccept: true, tokenType: 'DELIMITER' },
  ];

  const dfaTransitions = [
    { from: 'q0', to: 'q_N', symbol: "'N'" },
    { from: 'q_N', to: 'q_NPC', symbol: "'PC'" },
    { from: 'q0', to: 'q_W', symbol: "'W'" },
    { from: 'q_W', to: 'q_WHEN', symbol: "'HEN'" },
    { from: 'q0', to: 'q_COND', symbol: "Sensor Enum" },
    { from: 'q0', to: 'q_ACT', symbol: "Actuator Enum" },
    { from: 'q0', to: 'q_ID', symbol: "[a-zA-Z_]" },
    { from: 'q_ID', to: 'q_ID', symbol: "[a-zA-Z0-9_]" },
    { from: 'q0', to: 'q_SYM', symbol: "{, }, :" },
  ];

  // NFA representation with ε-transitions (Thompson construction)
  const nfaStates = [
    { id: 'n0', label: 'n0 (Start)', type: 'start', desc: 'NFA Entry state with ε-branching', isAccept: false },
    { id: 'n1', label: 'n1 (KW branch)', type: 'intermediate', desc: 'Keyword detection branch', isAccept: false },
    { id: 'n2', label: 'n2 (NPC accept)', type: 'accept', desc: 'Accepted NPC', isAccept: true },
    { id: 'n3', label: 'n3 (WHEN accept)', type: 'accept', desc: 'Accepted WHEN', isAccept: true },
    { id: 'n4', label: 'n4 (Enum branch)', type: 'intermediate', desc: 'Sensor & Actuator branch', isAccept: false },
    { id: 'n5', label: 'n5 (Enum accept)', type: 'accept', desc: 'Accepted Sensor/Actuator', isAccept: true },
    { id: 'n6', label: 'n6 (ID branch)', type: 'intermediate', desc: 'Identifier regex [a-zA-Z_]', isAccept: false },
    { id: 'n7', label: 'n7 (ID accept)', type: 'accept', desc: 'Accepted IDENTIFIER', isAccept: true },
    { id: 'n8', label: 'n8 (Sym accept)', type: 'accept', desc: 'Accepted Delimiter symbol', isAccept: true },
  ];

  const nfaTransitions = [
    { from: 'n0', to: 'n1', symbol: 'ε' },
    { from: 'n0', to: 'n4', symbol: 'ε' },
    { from: 'n0', to: 'n6', symbol: 'ε' },
    { from: 'n0', to: 'n8', symbol: '{ | } | :' },
    { from: 'n1', to: 'n2', symbol: "'NPC'" },
    { from: 'n1', to: 'n3', symbol: "'WHEN'" },
    { from: 'n4', to: 'n5', symbol: "Sensors ∪ Actions" },
    { from: 'n6', to: 'n7', symbol: "[a-zA-Z_][a-zA-Z0-9_]*" },
    { from: 'n7', to: 'n7', symbol: "[a-zA-Z0-9_]" },
  ];

  const tokenDfaPath = tokens.filter(t => t.type !== 'EOF').map(t => {
    let matchedState = 'q_ID';
    if (t.type === 'NPC') matchedState = 'q_NPC';
    else if (t.type === 'WHEN') matchedState = 'q_WHEN';
    else if (t.type === 'CONDITION') matchedState = 'q_COND';
    else if (t.type === 'ACTION') matchedState = 'q_ACT';
    else if (['LBRACE', 'RBRACE', 'COLON'].includes(t.type)) matchedState = 'q_SYM';
    return { token: t.value, type: t.type, state: matchedState, line: t.line, col: t.column };
  });

  return {
    dfa: { states: dfaStates, transitions: dfaTransitions },
    nfa: { states: nfaStates, transitions: nfaTransitions },
    tokenDfaPath,
  };
}

// ── 3 & 4. Parser (Parse Tree / CST) & AST ───────────────────────────
export function parse(tokens) {
  let pos = 0;
  const productionsUsed = [];

  const cur = () => tokens[pos] || tokens[tokens.length - 1];
  const match = (t) => {
    const tok = cur();
    if (tok.type === t) { pos++; return tok; }
    const e = new Error(`Expected '${t}', got '${tok.value}'`);
    e.line = tok.line; e.column = tok.column; throw e;
  };

  // Build Concrete Parse Tree (CST) while constructing AST
  productionsUsed.push({ rule: "Program -> NPC IDENTIFIER '{' RuleList '}' EOF", nonTerminal: "Program" });

  const npcTok = match('NPC');
  const nmTok = match('IDENTIFIER');
  const lbraceTok = match('LBRACE');

  const cstChildren = [
    { type: 'Terminal', value: npcTok.value, tokenType: 'NPC', line: npcTok.line, column: npcTok.column },
    { type: 'Terminal', value: nmTok.value, tokenType: 'IDENTIFIER', line: nmTok.line, column: nmTok.column },
    { type: 'Terminal', value: lbraceTok.value, tokenType: 'LBRACE', line: lbraceTok.line, column: lbraceTok.column },
  ];

  const rules = [];
  const cstRuleListChildren = [];

  while (cur().type !== 'RBRACE') {
    if (cur().type === 'EOF') {
      const e = new Error(`Unclosed NPC block: missing '}' after rules for '${nmTok.value}'`);
      e.line = cur().line; e.column = cur().column; throw e;
    }
    productionsUsed.push({ rule: "RuleList -> Rule RuleList", nonTerminal: "RuleList" });
    productionsUsed.push({ rule: "Rule -> WHEN Condition ':' Action", nonTerminal: "Rule" });

    const wTok = match('WHEN');
    const ct = cur();
    if (ct.type !== 'CONDITION') {
      const e = new Error(`Expected sensory condition, got '${ct.value}'`);
      e.line = ct.line; e.column = ct.column; throw e;
    }
    pos++;

    let probability = 1.0;
    if (cur().type === 'LPAREN') {
      pos++; // consume '('
      const numTok = cur();
      if (numTok.type === 'NUMBER') {
        probability = parseFloat(numTok.value);
        pos++;
        if (cur().type === 'PERCENT') {
          probability /= 100.0;
          pos++;
        }
      }
      if (cur().type === 'RPAREN') pos++;
    }

    const colonTok = cur();
    if (colonTok.type !== 'COLON') {
      const e = new Error(`Expected ':' after condition '${ct.value}'`);
      e.line = colonTok.line; e.column = colonTok.column; throw e;
    }
    pos++;
    const at = cur();
    if (at.type !== 'ACTION') {
      const e = new Error(`Expected actuator action, got '${at.value}'`);
      e.line = at.line; e.column = at.column; throw e;
    }
    pos++;

    const actionAlternatives = [at.value];
    while (cur().type === 'PIPE') {
      pos++; // consume '|'
      const nextAct = cur();
      if (nextAct.type !== 'ACTION') {
        const e = new Error(`Expected action after '|', got '${nextAct.value}'`);
        e.line = nextAct.line; e.column = nextAct.column; throw e;
      }
      pos++;
      actionAlternatives.push(nextAct.value);
    }

    const isStochastic = actionAlternatives.length > 1 || probability < 1.0;
    const combinedAction = actionAlternatives.length > 1 ? actionAlternatives.join(' | ') : at.value;

    const ruleCst = {
      type: 'NonTerminal',
      name: 'Rule',
      ruleId: `rule_${rules.length + 1}`,
      line: wTok.line,
      children: [
        { type: 'Terminal', value: wTok.value, tokenType: 'WHEN', line: wTok.line, column: wTok.column },
        {
          type: 'NonTerminal',
          name: 'Condition',
          line: ct.line,
          children: [{ type: 'Terminal', value: ct.value, tokenType: 'CONDITION', line: ct.line, column: ct.column }]
        },
        { type: 'Terminal', value: colonTok.value, tokenType: 'COLON', line: colonTok.line, column: colonTok.column },
        {
          type: 'NonTerminal',
          name: 'Action',
          line: at.line,
          children: actionAlternatives.map(alt => ({ type: 'Terminal', value: alt, tokenType: 'ACTION', line: at.line, column: at.column }))
        },
      ]
    };
    cstRuleListChildren.push(ruleCst);

    rules.push({
      type: 'Rule',
      id: `ast_rule_${rules.length + 1}`,
      condition: { type: 'Condition', name: ct.value, line: ct.line, column: ct.column, probability },
      action: {
        type: 'Action',
        name: combinedAction,
        isStochastic,
        alternatives: actionAlternatives,
        probability,
        line: at.line,
        column: at.column,
      },
      isStochastic,
      alternatives: actionAlternatives,
      probability,
      line: wTok.line,
      column: wTok.column,
    });
  }

  productionsUsed.push({ rule: "RuleList -> ε", nonTerminal: "RuleList" });

  const rbraceTok = match('RBRACE');
  const eofTok = match('EOF');

  cstChildren.push({
    type: 'NonTerminal',
    name: 'RuleList',
    line: lbraceTok.line,
    children: cstRuleListChildren
  });
  cstChildren.push({ type: 'Terminal', value: rbraceTok.value, tokenType: 'RBRACE', line: rbraceTok.line, column: rbraceTok.column });
  cstChildren.push({ type: 'Terminal', value: eofTok.value, tokenType: 'EOF', line: eofTok.line, column: eofTok.column });

  const parseTree = {
    type: 'NonTerminal',
    name: 'Program',
    line: npcTok.line,
    children: cstChildren,
    productionsUsed,
  };

  const ast = {
    type: 'Program',
    npc: {
      type: 'NPCDeclaration',
      name: nmTok.value,
      rules,
      line: nmTok.line,
      column: nmTok.column,
    }
  };

  return { ast, parseTree, productionsUsed };
}

// ── 5. Semantic Analyzer ──────────────────────────────────────────
export function semantic(ast) {
  const errors = [], warnings = [], seen = new Set();
  const symbolTable = [];
  const diagnosticsPassed = [];

  symbolTable.push({
    identifier: ast.npc.name,
    type: 'NPC_ENTITY',
    scope: 'GLOBAL',
    value: `<Entity ${ast.npc.name}>`,
    declaration: 'NPC Keyword',
    usage: 'Root Autonomous Agent',
    line: ast.npc.line,
    column: ast.npc.column,
    status: 'DECLARED',
  });

  diagnosticsPassed.push({ check: 'Root Entity Declaration Check', status: 'PASSED', desc: `Entity '${ast.npc.name}' registered in global symbol table.` });

  for (let idx = 0; idx < ast.npc.rules.length; idx++) {
    const r = ast.npc.rules[idx];
    const c = r.condition.name;
    const a = r.action.name;
    const isProbabilistic = (r.probability && r.probability < 1.0) || r.isStochastic;
    const isShadowed = seen.has(c) && !isProbabilistic;

    symbolTable.push({
      identifier: `rule_${idx + 1}`,
      type: r.isStochastic ? 'STOCHASTIC_RULE' : 'DISPATCH_RULE',
      scope: ast.npc.name,
      value: `WHEN ${c} : ${a}`,
      declaration: `Line ${r.line}`,
      usage: isShadowed ? 'Shadowed (Dead Code)' : r.isStochastic ? 'Stochastic Branch' : 'Active Dispatch',
      line: r.line,
      column: r.column,
      status: isShadowed ? 'SHADOWED' : 'VALIDATED',
    });

    if (isShadowed) {
      warnings.push({
        phase: 'Semantic Analysis',
        severity: 'warning',
        message: `Duplicate sensor condition '${c}'. Rule at line ${r.line} is shadowed by an earlier definition.`,
        line: r.line,
        column: r.column,
        suggestion: `Remove or consolidate this duplicate WHEN ${c} clause.`
      });
    } else {
      seen.add(c);
    }

    const allowed = COMPAT[c];
    const actionsToCheck = r.action.alternatives || [a];
    if (allowed) {
      for (const singleAct of actionsToCheck) {
        if (!allowed.has(singleAct)) {
          errors.push({
            phase: 'Semantic Analysis',
            severity: 'error',
            message: `Actuator command '${singleAct}' is incompatible with sensor condition '${c}'.`,
            line: r.action.line,
            column: r.action.column,
            suggestion: `Valid actions for '${c}': ${[...allowed].sort().join(', ')}`
          });
        }
      }
    } else if (!allowed) {
      errors.push({
        phase: 'Semantic Analysis',
        severity: 'error',
        message: `Unknown sensory condition '${c}'.`,
        line: r.condition.line,
        column: r.condition.column,
        suggestion: `Valid sensors: ${[...VALID_CONDITIONS].sort().join(', ')}`
      });
    }
  }

  if (errors.length === 0) {
    diagnosticsPassed.push({ check: 'Sensor-Actuator Compatibility Typecheck', status: 'PASSED', desc: 'All rule combinations satisfy physical actuation domain constraints.' });
    diagnosticsPassed.push({ check: 'Scope & Symbol Resolution Validation', status: 'PASSED', desc: 'All identifiers and symbols successfully resolved to valid scopes.' });
    diagnosticsPassed.push({ check: 'Reachability & Precedence Verification', status: 'PASSED', desc: 'First-match priority bindings validated.' });
  }

  return { errors, warnings, symbolTable, diagnosticsPassed };
}

// ── 6. Control Flow Graph (CFG) ──────────────────────────────────
export function generateCFG(ast) {
  const blocks = [];
  const edges = [];

  // Entry block
  blocks.push({
    id: 'B0',
    title: 'Block 0: Entry / Sense',
    type: 'entry',
    statements: ['POLL_SENSORS()', 'PUSH_FRAME(npc_context)'],
    line: ast.npc.line,
  });

  const rules = ast.npc.rules;
  rules.forEach((r, idx) => {
    const condBlockId = `B${idx * 2 + 1}`;
    const actBlockId = `B${idx * 2 + 2}`;

    blocks.push({
      id: condBlockId,
      title: `Block ${idx * 2 + 1}: Check ${r.condition.name}`,
      type: 'branch',
      statements: [`TEST sensor_flags & ${r.condition.name}`, `JZ false -> next_branch`],
      condition: r.condition.name,
      ruleIdx: idx + 1,
      line: r.condition.line,
    });

    blocks.push({
      id: actBlockId,
      title: `Block ${idx * 2 + 2}: Dispatch ${r.action.name}`,
      type: 'action',
      statements: [`EMIT_COMMAND '${r.action.name}'`, `COMMIT_CYCLE()`],
      action: r.action.name,
      ruleIdx: idx + 1,
      line: r.action.line,
    });

    // Control edges
    if (idx === 0) {
      edges.push({ from: 'B0', to: condBlockId, label: 'eval', kind: 'normal' });
    } else {
      const prevCondBlockId = `B${(idx - 1) * 2 + 1}`;
      edges.push({ from: prevCondBlockId, to: condBlockId, label: 'false', kind: 'false_branch' });
    }

    edges.push({ from: condBlockId, to: actBlockId, label: 'true', kind: 'true_branch' });
    edges.push({ from: actBlockId, to: 'B_EXIT', label: 'commit', kind: 'exit_yield' });
  });

  if (rules.length > 0) {
    const lastCondId = `B${(rules.length - 1) * 2 + 1}`;
    edges.push({ from: lastCondId, to: 'B_FALLBACK', label: 'false', kind: 'false_branch' });
  }

  blocks.push({
    id: 'B_FALLBACK',
    title: 'Block Fallback: Default Hold',
    type: 'fallback',
    statements: ['DEFAULT_ACTION: STOP', 'REGEN_SHIELD(+4HP)'],
    line: null,
  });
  edges.push({ from: 'B_FALLBACK', to: 'B_EXIT', label: 'yield', kind: 'exit_yield' });

  blocks.push({
    id: 'B_EXIT',
    title: 'Block Exit: Yield Cycle',
    type: 'exit',
    statements: ['COLLISION_SOLVE()', 'YIELD_TO_TICK()'],
    line: null,
  });

  return { blocks, edges };
}

// ── 7. Intermediate Representation (IR / 3AC) ────────────────────
export function generateIR(ast) {
  const instructions = [];
  let p = 1;

  for (const r of ast.npc.rules) {
    const isStoch = r.isStochastic || (r.action.alternatives && r.action.alternatives.length > 1);
    const condTemp = `t${p * 2 - 1}`;
    const actTemp = `t${p * 2}`;
    const branchText = isStoch
      ? `IF ${condTemp} != 0 GOTO PROB_BRANCH_${p}`
      : `IF ${condTemp} != 0 GOTO ACT_${p}`;
    const actText = isStoch
      ? `PROB_BRANCH_${p}: ${actTemp}_r = RAND(); IF ${actTemp}_r < 0.5 GOTO ACT_${p}_A ELSE GOTO ACT_${p}_B\n    ACT_${p}_A: ${actTemp} = EXEC(ACT_${r.action.alternatives[0]}); GOTO EXIT\n    ACT_${p}_B: ${actTemp} = EXEC(ACT_${r.action.alternatives[1]}); GOTO EXIT`
      : `ACT_${p}: ${actTemp} = EXEC(ACT_${r.action.name}); GOTO EXIT`;

    instructions.push({
      index: p,
      label: `L${p}`,
      op: isStoch ? 'PROB_BRANCH' : 'SENSE',
      dest: condTemp,
      arg1: `SENSOR_${r.condition.name}`,
      arg2: null,
      raw3AC: `${condTemp} = SENSE(SENSOR_${r.condition.name})`,
      condition: r.condition.name,
      action: r.action.name,
      isStochastic: isStoch,
      alternatives: r.action.alternatives || [r.action.name],
      probability: r.probability || 1.0,
      target: isStoch ? `PROB_BRANCH_${p}` : `ACT_${p}`,
      priority: p,
      line: r.line,
      type: isStoch ? 'stochastic_branch' : 'conditional_branch',
      branchText,
      actText,
    });
    p++;
  }

  const rawLines = [];
  instructions.forEach(inst => {
    rawLines.push(`${inst.label}: ${inst.raw3AC}`);
    rawLines.push(`    ${inst.branchText}`);
    rawLines.push(`    ${inst.actText}`);
  });
  rawLines.push(`EXIT: YIELD_SIMULATION_TICK`);

  return {
    npc: ast.npc.name,
    instructions,
    rawLines,
    totalInstructions: instructions.length * 3 + 1,
    temporariesCount: instructions.length * 2,
    basicBlocksCount: instructions.length * 2 + 3,
  };
}

// ── 8. Optimizer Passes ──────────────────────────────────────────
export function optimize(ir, semanticInfo) {
  const originalCount = ir.instructions.length;
  const optimizedInstructions = [];
  const passesApplied = [];
  const transformations = [];
  const seenConditions = new Set();
  let prunedCount = 0;

  for (const inst of ir.instructions) {
    if (seenConditions.has(inst.condition) && !inst.isStochastic && inst.probability >= 1.0) {
      prunedCount++;
      passesApplied.push({
        id: 'pass_dce',
        pass: 'Dead Code Elimination',
        desc: `Eliminated redundant rule evaluating '${inst.condition}'. Preceding rule already dominates this sensory state.`,
        benefit: 'Reduces branch evaluation latency & jump table size.',
        line: inst.line,
      });
      transformations.push({
        type: 'PRUNED',
        before: `${inst.label}: IF SENSE(${inst.condition}) GOTO ACT_${inst.priority}`,
        after: '(ELIMINATED - UNREACHABLE SHADOWED RULE)',
        reason: 'Dominance pruning: earlier identical condition matched first',
        line: inst.line,
      });
      continue;
    }

    seenConditions.add(inst.condition);
    const newPri = optimizedInstructions.length + 1;
    const optInst = {
      ...inst,
      optimizedPriority: newPri,
      label: `L${newPri}`,
      dest: `t${newPri * 2 - 1}`,
    };
    optimizedInstructions.push(optInst);

    transformations.push({
      type: 'REINDEXED',
      before: `${inst.label}: IF SENSE(${inst.condition}) -> ACT_${inst.priority}`,
      after: `L${newPri}: IF SENSE(${inst.condition}) -> ACT_${newPri}`,
      reason: 'Compact linear dispatch table slotting',
      line: inst.line,
    });
  }

  passesApplied.push({
    id: 'pass_compact',
    pass: 'Linear Jump Table Packing',
    desc: `Pack ${optimizedInstructions.length} surviving active dispatch rules into a contiguous O(1) jump table array.`,
    benefit: 'Eliminates hash overhead; enables direct integer offset jumps.',
  });

  const byteSavings = prunedCount * 32;

  const optimizedRawLines = [];
  optimizedInstructions.forEach((inst, i) => {
    optimizedRawLines.push(`L${i + 1}: t${(i + 1) * 2 - 1} = SENSE(SENSOR_${inst.condition})`);
    optimizedRawLines.push(`    IF t${(i + 1) * 2 - 1} != 0 GOTO ACT_${i + 1}`);
    optimizedRawLines.push(`    ACT_${i + 1}: EXEC(ACT_${inst.action}); GOTO EXIT`);
  });
  optimizedRawLines.push(`EXIT: YIELD_SIMULATION_TICK`);

  return {
    originalCount,
    optimizedCount: optimizedInstructions.length,
    prunedCount,
    byteSavings,
    passesApplied,
    transformations,
    instructions: optimizedInstructions,
    beforeLines: ir.rawLines,
    afterLines: optimizedRawLines,
  };
}

// ── 9. Code Generation & Target Architecture ──────────────────────
export function generateBehavior(optResult, npcName) {
  const rules = [];
  const assemblyInstructions = [];

  assemblyInstructions.push({
    asm: `; ============================================`,
    comment: `; Target Architecture: NPC-VM v1.0 (Bytecode RISC Engine)`,
    type: 'meta',
  });
  assemblyInstructions.push({
    asm: `.global _npc_${npcName.toLowerCase()}_dispatch`,
    comment: `; Entry symbol for simulation loop`,
    type: 'meta',
  });
  assemblyInstructions.push({
    asm: `_npc_${npcName.toLowerCase()}_dispatch:`,
    comment: `; Begin reactive tick eval`,
    type: 'label',
  });

  optResult.instructions.forEach((i, idx) => {
    const opcode = `0x${((idx + 1) * 4).toString(16).padStart(2, '0').toUpperCase()}`;
    const offset = idx * 16;

    rules.push({
      id: `rule_${i.optimizedPriority}`,
      condition: i.condition,
      action: i.action,
      isStochastic: i.isStochastic || false,
      alternatives: i.alternatives || null,
      probability: i.probability || 1.0,
      priority: i.optimizedPriority,
      isActive: true,
      sourceLine: i.line,
      opcode,
      dispatchOffset: offset,
    });

    assemblyInstructions.push({
      opcode,
      asm: `MOV R0, SENSOR_${i.condition}`,
      comment: `; Load sensor state into general register R0`,
      line: i.line,
      type: 'load',
    });
    assemblyInstructions.push({
      opcode: `+2`,
      asm: `TEST R0, 0x01`,
      comment: `; Test boolean flag`,
      line: i.line,
      type: 'test',
    });
    assemblyInstructions.push({
      opcode: `+4`,
      asm: `JNZ .act_${i.optimizedPriority}`,
      comment: `; Branch if condition triggered`,
      line: i.line,
      type: 'jump',
    });
    assemblyInstructions.push({
      opcode: ``,
      asm: `.act_${i.optimizedPriority}:`,
      comment: `; Handler for rule #${i.optimizedPriority}`,
      line: i.line,
      type: 'label',
    });
    assemblyInstructions.push({
      opcode: `+6`,
      asm: i.isStochastic ? `CALL PROB_DISPATCH (${i.alternatives.join(', ')})` : `CALL ACTUATOR_${i.action}`,
      comment: i.isStochastic ? `; Stochastic branch dispatch` : `; Execute action actuator directly`,
      line: i.line,
      type: 'call',
    });
    assemblyInstructions.push({
      opcode: `+10`,
      asm: `JMP .exit_cycle`,
      comment: `; Yield control back to engine`,
      line: i.line,
      type: 'jump',
    });
  });

  assemblyInstructions.push({
    opcode: ``,
    asm: `.exit_cycle:`,
    comment: `; Normal cycle yield`,
    type: 'label',
  });
  assemblyInstructions.push({
    opcode: `0xFF`,
    asm: `RET`,
    comment: `; Return to simulation scheduler`,
    type: 'ret',
  });

  return {
    npc: npcName,
    targetArch: 'NPC-VM v1.0 (Bytecode RISC Engine)',
    ruleCount: rules.length,
    rules,
    evaluationMode: 'FIRST_MATCH_PRIORITY',
    memoryFootprintBytes: rules.length * 32,
    assemblyInstructions,
    assemblyDump: assemblyInstructions.map(a => `${(a.opcode || '').padEnd(6)} ${a.asm.padEnd(36)} ${a.comment}`).join('\n'),
  };
}

// ── Unified 9-Stage Pipeline Runner ─────────────────────────────
export function compile(source) {
  const stages = [];
  const errors = [];
  const warnings = [];

  let tokens, automata, astData, sem, cfg, ir, opt, behavior;

  // Stage 1: Lexer
  try {
    tokens = tokenize(source);
    stages.push('Lexer');
  } catch (e) {
    errors.push({ phase: 'Lexer', line: e.line || 1, column: e.column || 1, message: e.message });
    return { success: false, errors, warnings, stagesCompleted: stages, failedAt: 'Lexer' };
  }

  // Stage 2: Automata
  automata = buildAutomataTrace(tokens);
  stages.push('Automata');

  // Stage 3: Parser & CST
  // Stage 4: AST Construction
  try {
    astData = parse(tokens);
    stages.push('Parser');
    stages.push('AST');
  } catch (e) {
    errors.push({ phase: 'Parser', line: e.line || 1, column: e.column || 1, message: e.message });
    return { success: false, tokens, automata, errors, warnings, stagesCompleted: stages, failedAt: 'Parser' };
  }

  // Stage 5: Semantic Analysis
  sem = semantic(astData.ast);
  warnings.push(...sem.warnings);
  if (sem.errors.length) {
    errors.push(...sem.errors);
    return {
      success: false,
      tokens,
      automata,
      parseTree: astData.parseTree,
      ast: astData.ast,
      semantic: sem,
      errors,
      warnings,
      stagesCompleted: stages,
      failedAt: 'Semantic',
    };
  }
  stages.push('Semantic');

  // Stage 6: Control Flow Graph (CFG)
  cfg = generateCFG(astData.ast);
  stages.push('CFG');

  // Stage 7: Intermediate Representation (IR)
  ir = generateIR(astData.ast);
  stages.push('IR');

  // Stage 8: Optimizer
  opt = optimize(ir, sem);
  stages.push('Optimizer');

  // Stage 9: CodeGen
  behavior = generateBehavior(opt, astData.ast.npc.name);
  stages.push('CodeGen');

  return {
    success: true,
    tokens,
    automata,
    bnf: BNF_GRAMMAR,
    parseTree: astData.parseTree,
    ast: astData.ast,
    semantic: sem,
    cfg,
    ir,
    optimizer: opt,
    behavior,
    errors: [],
    warnings,
    stagesCompleted: stages,
    failedAt: null,
  };
}

export const STAGE_CONFIG = [
  { id: 'lexer', num: 1, name: 'Lexer', title: 'Lexical Analysis', desc: 'Tokenization of source stream into typed lexical symbols', icon: '01' },
  { id: 'automata', num: 2, name: 'Automata', title: 'Finite Automata', desc: 'NFA and DFA state machines recognizing tokens', icon: '02' },
  { id: 'parser', num: 3, name: 'Parser', title: 'Syntax Analysis', desc: 'Concrete Syntax Tree (Parse Tree) derived via LL(1) grammar', icon: '03' },
  { id: 'ast', num: 4, name: 'AST', title: 'Abstract Syntax Tree', desc: 'Pure hierarchical syntax tree with syntactic sugar stripped', icon: '04' },
  { id: 'semantic', num: 5, name: 'Semantic', title: 'Semantic Analysis', desc: 'Symbol resolution and sensor-actuator compatibility type-checks', icon: '05' },
  { id: 'cfg', num: 6, name: 'CFG', title: 'Control Flow Graph', desc: 'Basic blocks and directed control edges modeling reactive execution', icon: '06' },
  { id: 'ir', num: 7, name: 'IR', title: 'Intermediate Representation', desc: 'Linear Three-Address Code (3AC) quadruples', icon: '07' },
  { id: 'optimizer', num: 8, name: 'Optimizer', title: 'Optimization Engine', desc: 'Dominance pruning, dead code elimination and linear table packing', icon: '08' },
  { id: 'codegen', num: 9, name: 'CodeGen', title: 'Target Code Generation', desc: 'Emits target VM bytecode and assembly dispatch table', icon: '09' },
];

export const MASTER_PROGRAM = `NPC MasterBot {
    // 01. Emergency Self-Repair when shield is damaged
    WHEN HEALTH_LOW:
        STOP

    // 02. Hazard Avoidance: Leap over hazard pits
    WHEN PIT_AHEAD:
        JUMP

    // 03. Navigation: Compiler-level 50/50 stochastic turn at walls
    WHEN WALL_AHEAD:
        TURN_LEFT | TURN_RIGHT

    // 04. Tactical Combat: Eliminate hostile sentries
    WHEN ENEMY_NEAR:
        ATTACK

    // 05. Resource Acquisition: Siphon nearby data cores
    WHEN TREASURE_NEAR:
        COLLECT

    // 06. Optical Tracking: Pursue human operator on sight
    WHEN PLAYER_SEEN:
        CHASE

    // 07. Tactical Spacing: Disengage when operator is too close
    WHEN PLAYER_NEAR:
        RUN_AWAY

    // 08. Checkpoint Extraction: Hold position at exit gate
    WHEN DOOR_AHEAD:
        STOP

    // 09. Default Locomotion: Advance through open corridors
    WHEN PATH_CLEAR:
        MOVE_FORWARD
}`;

export const PRESETS = {
  master: MASTER_PROGRAM,
  // Backwards compatibility aliases
  guard: MASTER_PROGRAM,
  collector: MASTER_PROGRAM,
  patrol: MASTER_PROGRAM,
  survivor: MASTER_PROGRAM,
  infiltrator: MASTER_PROGRAM,
};
