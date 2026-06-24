// Builds the control panel DOM for a scene from its `controls` + `actions` schema.
// Two-way binds inputs to scene.params and calls scene.onParamChange(id).

export function buildPanel(scene, mountEl) {
  mountEl.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'controls';

  for (const c of scene.controls) {
    const cell = document.createElement('div');
    cell.className = 'ctl';

    const label = document.createElement('label');
    label.textContent = c.label;
    cell.appendChild(label);

    let input;
    if (c.type === 'select') {
      input = document.createElement('select');
      for (const [val, text] of c.options) {
        const o = document.createElement('option');
        o.value = val; o.textContent = text;
        input.appendChild(o);
      }
      input.value = String(scene.params[c.id]);
      input.addEventListener('change', () => {
        scene.params[c.id] = input.value;
        scene.onParamChange && scene.onParamChange(c.id);
      });
    } else if (c.type === 'range') {
      const wrap = document.createElement('div');
      wrap.className = 'range-wrap';
      input = document.createElement('input');
      input.type = 'range';
      input.min = c.min; input.max = c.max; input.step = c.step || 1;
      input.value = scene.params[c.id];
      const out = document.createElement('span');
      out.className = 'range-val';
      out.textContent = scene.params[c.id];
      input.addEventListener('input', () => {
        scene.params[c.id] = +input.value;
        out.textContent = input.value;
        scene.onParamChange && scene.onParamChange(c.id);
      });
      wrap.appendChild(input); wrap.appendChild(out);
      cell.appendChild(wrap);
      grid.appendChild(cell);
      continue;
    } else if (c.type === 'color') {
      input = document.createElement('input');
      input.type = 'color';
      input.value = scene.params[c.id];
      input.addEventListener('input', () => {
        scene.params[c.id] = input.value;
        scene.onParamChange && scene.onParamChange(c.id);
      });
    } else if (c.type === 'text') {
      input = document.createElement('input');
      input.type = 'text';
      input.value = scene.params[c.id];
      input.addEventListener('input', () => {
        scene.params[c.id] = input.value;
        scene.onParamChange && scene.onParamChange(c.id);
      });
    } else { // number
      input = document.createElement('input');
      input.type = 'number';
      if (c.min != null) input.min = c.min;
      if (c.max != null) input.max = c.max;
      if (c.step != null) input.step = c.step;
      input.value = scene.params[c.id];
      input.addEventListener('change', () => {
        scene.params[c.id] = +input.value;
        scene.onParamChange && scene.onParamChange(c.id);
      });
    }

    // tag the input so other code (keyboard handlers) can refresh it
    input.dataset.bind = c.id;
    cell.appendChild(input);
    grid.appendChild(cell);
  }

  // action buttons
  if (scene.actions && scene.actions.length) {
    const actions = document.createElement('div');
    actions.className = 'actions';
    for (const a of scene.actions) {
      const b = document.createElement('button');
      b.textContent = a.label;
      b.addEventListener('click', () => { a.fn(); refreshBoundInputs(scene, grid); });
      actions.appendChild(b);
    }
    grid.appendChild(actions);
  }

  mountEl.appendChild(grid);
  scene._panelGrid = grid;
}

// Re-read params into inputs (e.g. after a keyboard shortcut changed `active`).
export function refreshBoundInputs(scene, grid) {
  grid = grid || scene._panelGrid;
  if (!grid) return;
  grid.querySelectorAll('[data-bind]').forEach((el) => {
    const id = el.dataset.bind;
    const v = scene.params[id];
    if (el.type === 'range') {
      el.value = v;
      const out = el.parentElement.querySelector('.range-val');
      if (out) out.textContent = v;
    } else {
      el.value = v;
    }
  });
}
