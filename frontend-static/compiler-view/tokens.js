/**
 * Token Table Renderer with Copilot Dark theme badges and line/col pointers.
 */

function renderTokensView(container, tokens) {
  if (!tokens || tokens.length === 0) {
    container.innerHTML = `<div style="color: var(--color-text-muted); padding: 12px;">No tokens available. Compile code first.</div>`;
    return;
  }

  let html = `
    <table class="token-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Token Type</th>
          <th>Lexeme Value</th>
          <th>Line</th>
          <th>Col</th>
        </tr>
      </thead>
      <tbody>
  `;

  tokens.forEach((t, idx) => {
    let badgeClass = "SYMBOL";
    if (t.type === "NPC" || t.type === "WHEN") badgeClass = "KEYWORD";
    else if (t.type === "CONDITION") badgeClass = "CONDITION";
    else if (t.type === "ACTION") badgeClass = "ACTION";
    else if (t.type === "IDENTIFIER") badgeClass = "IDENTIFIER";

    html += `
      <tr>
        <td style="color: var(--color-text-muted);">${idx + 1}</td>
        <td><span class="token-badge ${badgeClass}">${t.type}</span></td>
        <td style="color: var(--color-text-primary); font-weight: 500;">${escapeHtml(t.value)}</td>
        <td style="color: var(--color-text-secondary);">${t.line}</td>
        <td style="color: var(--color-text-secondary);">${t.column}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

window.renderTokensView = renderTokensView;
