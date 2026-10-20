/**
 * AST (Abstract Syntax Tree) Renderer
 * Renders hierarchical tree nodes with syntax highlights and line metadata.
 */

function renderASTView(container, ast) {
  if (!ast || Object.keys(ast).length === 0) {
    container.innerHTML = `<div style="color: var(--color-text-muted); padding: 12px;">No AST generated. Compile valid source first.</div>`;
    return;
  }

  let html = `<div class="ast-tree">`;
  html += `<div><span class="ast-label">Program</span></div>`;

  if (ast.npc) {
    html += `
      <div class="ast-node">
        <div>
          <span class="ast-label">NPCDeclaration:</span>
          <span class="ast-val" style="color: var(--color-kw-npc); font-weight: 600;"> ${escapeHtml(ast.npc.name)}</span>
          <span class="ast-meta">(line ${ast.npc.line})</span>
        </div>
    `;

    if (ast.npc.rules && ast.npc.rules.length > 0) {
      html += `
        <div class="ast-node">
          <div><span class="ast-label">Rules</span> <span class="ast-meta">(${ast.npc.rules.length} definitions)</span></div>
      `;

      ast.npc.rules.forEach((rule, idx) => {
        html += `
          <div class="ast-node" style="margin-top: 4px;">
            <div>
              <span class="ast-label">Rule #${idx + 1}</span>
              <span class="ast-meta">(line ${rule.line})</span>
            </div>
            <div class="ast-node">
              <div>
                <span class="ast-label">Condition:</span>
                <span class="ast-val" style="color: var(--color-kw-cond);"> ${escapeHtml(rule.condition.name)}</span>
              </div>
              <div>
                <span class="ast-label">Action:</span>
                <span class="ast-val" style="color: var(--color-kw-act);"> ${escapeHtml(rule.action.name)}</span>
              </div>
            </div>
          </div>
        `;
      });

      html += `</div>`; // Close Rules
    } else {
      html += `<div class="ast-node" style="color: var(--color-text-muted);">&lt;empty rule set&gt;</div>`;
    }

    html += `</div>`; // Close NPC
  }

  html += `</div>`;
  container.innerHTML = html;
}

window.renderASTView = renderASTView;
