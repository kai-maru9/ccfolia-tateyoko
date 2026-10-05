(() => {
  'use strict';

  const ROUND_DIGITS = 0;   // 0 = 整数に丸める（小数を使いたい場合は 1, 2 など）
  const state = { ratio: null, altDown: false };

  window.addEventListener('keydown', (e) => { if (e.key === 'Alt') state.altDown = true; }, true);
  window.addEventListener('keyup',   (e) => { if (e.key === 'Alt') state.altDown = false; }, true);
  window.addEventListener('blur', () => { state.altDown = false; });

  const isTarget = (el) =>
    el instanceof HTMLInputElement &&
    el.type === 'number' &&
    (el.name === 'width' || el.name === 'height');

  // width/height の両方を含む最小の親要素から、相方の入力欄を探す
  function findPair(input) {
    let node = input.parentElement;
    while (node && node !== document.body) {
      const w = node.querySelector('input[name="width"]');
      const h = node.querySelector('input[name="height"]');
      if (w && h) return { w, h };
      node = node.parentElement;
    }
    return null;
  }

  // Reactの管理下にある input の値を書き換える
  function setReactValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const round = (v) => {
    const p = 10 ** ROUND_DIGITS;
    return Math.round(v * p) / p;
  };

  // フォーカス時に比率を記録（直前の比率と矛盾しない場合は維持して誤差を防ぐ）
  document.addEventListener('focusin', (e) => {
    if (!isTarget(e.target)) return;
    const pair = findPair(e.target);
    if (!pair) return;
    const w = parseFloat(pair.w.value);
    const h = parseFloat(pair.h.value);
    if (!(w > 0) || !(h > 0)) return;

    const r = state.ratio;
    const consistent = r && (round(w / r) === h || round(h * r) === w);
    if (!consistent) state.ratio = w / h;
  }, true);

  // ユーザー操作による入力のみ処理（自分が発火したイベントは isTrusted=false）
  document.addEventListener('input', (e) => {
    if (!e.isTrusted || !isTarget(e.target) || state.altDown || !state.ratio) return;
    const pair = findPair(e.target);
    if (!pair) return;

    const value = parseFloat(e.target.value);
    if (!(value > 0)) return; // 空欄・0・負数は何もしない

    if (e.target.name === 'width') {
      setReactValue(pair.h, round(value / state.ratio));
    } else {
      setReactValue(pair.w, round(value * state.ratio));
    }
  }, true);
})();