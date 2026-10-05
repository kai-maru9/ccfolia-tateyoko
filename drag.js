(() => {
  'use strict';

  const GRID = 24; // 盤面のスナップ幅（丸め誤差の許容判定にのみ使用）
  const ratios = new Map(); // data-field-object の id -> 比率
  let session = null;
  let dispatching = false;

  const DIRS = {
    'se-resize': [1, 1],  'sw-resize': [-1, 1],
    'nw-resize': [-1, -1], 'ne-resize': [1, -1],
  };

  function findCorner(handle, cursors) {
    const siblings = handle.parentElement ? [...handle.parentElement.children] : [];
    for (const c of cursors) {
      const hit = siblings.find((el) => el.style && el.style.cursor === c);
      if (hit) return hit;
    }
    return null;
  }

  window.addEventListener('mousedown', (e) => {
    if (!e.isTrusted || !e.shiftKey || e.button !== 0) return;
    const handle = e.target;
    if (!(handle instanceof HTMLElement)) return;
    const cur = handle.style.cursor;
    if (!/-resize$/.test(cur)) return;

    const box = handle.closest('.movable');
    if (!box || !box.style.width || !box.style.height) return;

    let corner = handle;
    let mode = 'both';
    if (cur === 'col-resize' || cur === 'row-resize') {
      const prefs = cur === 'col-resize'
        ? (handle.style.right ? ['se-resize', 'ne-resize'] : ['sw-resize', 'nw-resize'])
        : (handle.style.bottom ? ['se-resize', 'sw-resize'] : ['ne-resize', 'nw-resize']);
      corner = findCorner(handle, prefs);
      if (!corner) return; // 角ハンドルが無ければ通常動作
      mode = cur === 'col-resize' ? 'x' : 'y';
    }
    const dir = DIRS[corner.style.cursor];
    if (!dir) return;

    // 比率の決定（前回の比率とグリッド丸め誤差の範囲で一致するなら維持）
    const w0 = parseFloat(box.style.width);
    const h0 = parseFloat(box.style.height);
    if (!(w0 > 0) || !(h0 > 0)) return;
    const id = box.closest('[data-field-object]')?.dataset.fieldObject || '';
    let r = ratios.get(id);
    const tol = (GRID / 2) * (1 / w0 + 1 / h0) + 0.001;
    if (!r || Math.abs(w0 / h0 / r - 1) > tol) r = w0 / h0;
    ratios.set(id, r);

    const rect = box.getBoundingClientRect();
    session = {
      x0: e.clientX, y0: e.clientY,
      sx: dir[0], sy: dir[1],
      w0s: rect.width, h0s: rect.height,
      r, mode,
    };

    if (corner !== handle) {
      // 辺ハンドルのクリックを角ハンドルのクリックに差し替える
      e.stopImmediatePropagation();
      e.preventDefault();
      corner.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true, cancelable: true, view: window,
        clientX: e.clientX, clientY: e.clientY,
        screenX: e.screenX, screenY: e.screenY,
        button: 0, buttons: 1, shiftKey: true,
      }));
    }
  }, true);

  window.addEventListener('mousemove', (e) => {
    if (!session || dispatching || !e.isTrusted) return;
    const s = session;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;

    // 横基準・縦基準それぞれの候補
    const newW1 = s.w0s + s.sx * dx;
    const newH1 = newW1 / s.r;
    const newH2 = s.h0s + s.sy * dy;
    const newW2 = newH2 * s.r;

    let useX;
    if (s.mode === 'x') useX = true;
    else if (s.mode === 'y') useX = false;
    else useX = Math.abs(newW1 / s.w0s - 1) >= Math.abs(newH2 / s.h0s - 1);

    const newW = useX ? newW1 : newW2;
    const newH = useX ? newH1 : newH2;
    const x = s.x0 + s.sx * (newW - s.w0s);
    const y = s.y0 + s.sy * (newH - s.h0s);

    e.stopImmediatePropagation();
    e.preventDefault();
    dispatching = true;
    try {
      window.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true, cancelable: true, view: window,
        clientX: x, clientY: y,
        screenX: e.screenX + (x - e.clientX), screenY: e.screenY + (y - e.clientY),
        buttons: e.buttons, shiftKey: true,
      }));
    } finally {
      dispatching = false;
    }
  }, true);

  const end = () => { session = null; };
  window.addEventListener('mouseup', end, true);
  window.addEventListener('blur', end);
})();