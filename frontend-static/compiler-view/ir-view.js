/**
 * Intermediate Representation (IR) and Executable Behavior Rule Table Visualizers.
 */

function renderIRView(container, ir) {
  if (!ir || !ir.instructions || ir.instructions.length === 0) {
    container.innerHTML = `<div style="color: var(--color-text-muted); padding: 12px;">No IR available.</div>`;
    return;
  }

  let html = `
    <div style="margin-bottom: 8px; color: var(--color-text-secondary); font-size: 11px;">
      TARGET NPC: <strong style="color: var(--color-text-primary);">${escapeHtml(ir.npc)}</strong>
    </div>
  `;

  ir.instructions.forEach((inst, idx) => {
    html += `
      <div class="ir-instruction">
        <div>
          <span style="color: var(--color-text-muted); margin-right: 8px;">${idx < 9 ? '0' : ''}${idx + 1}</span>
          <span style="color: var(--color-kw-npc); font-weight: 600;">IF</span>
          <span style="color: var(--color-kw-cond); font-weight: 500;"> ${escapeHtml(inst.condition)} </span>
          <span style="color: var(--color-kw-npc); font-weight: 600;">THEN</span>
          <span style="color: var(--color-kw-act); font-weight: 500;"> ${escapeHtml(inst.action)}</span>
        </div>
        <div class="ir-badge">Priority #${inst.priority}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderBehaviorView(container, behavior) {
  if (!behavior || !behavior.rules || behavior.rules.length === 0) {
    container.innerHTML = `<div style="color: var(--color-text-muted); padding: 12px;">No runtime behavior rules generated.</div>`;
    return;
  }

  let html = `
    <div style="margin-bottom: 8px; font-size: 11px; display: flex; justify-content: space-between; color: var(--color-text-secondary);">
      <span>EVALUATION STRATEGY: <strong style="color: var(--color-success);">${escapeHtml(behavior.evaluationMode)}</strong></span>
      <span>TOTAL RULES: <strong style="color: var(--color-text-primary);">${behavior.ruleCount}</strong></span>
    </div>
    <table class="token-table">
      <thead>
        <tr>
          <th>Priority</th>
          <th>Condition Sensor</th>
          <th>Dispatched Action</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  behavior.rules.forEach((r) => {
    const statusBadge = r.isActive
      ? `<span class="token-badge" style="background: rgba(63, 185, 80, 0.15); color: var(--color-success);">ACTIVE</span>`
      : `<span class="token-badge" style="background: rgba(210, 153, 34, 0.15); color: var(--color-warning);">SHADOWED</span>`;

    html += `
      <tr>
        <td style="color: var(--color-text-muted);">${r.priority}</td>
        <td><span class="token-badge CONDITION">${escapeHtml(r.condition)}</span></td>
        <td><span class="token-badge ACTION">${escapeHtml(r.action)}</span></td>
        <td>${statusBadge}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

window.renderIRView = renderIRView;
window.renderBehaviorView = renderBehaviorView;
