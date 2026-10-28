// ==CocoaCut Plugin==
// @id clip-handles
// @name Clip Handles
// @version 1.0
// @author CocoaCut
// @description Shows grab handles on both ends of a clip, so you can see where to drag to trim it.
// @access full
// ==/CocoaCut Plugin==

const draw = drawTL;
let hover = null;

function handles(x, c, a) {
  const i = P.tracks.findIndex(t => t.id === c.track);
  if (i < 0) return;
  const y = RUL + i * TH - sy + 3, h = TH - 7, x0 = tx(c.start), x1 = tx(cend(c));
  if (x1 - x0 < 8) return;
  const w = Math.min(6, (x1 - x0) / 3);
  x.globalAlpha = a;
  for (const hx of [x0, x1 - w]) {
    x.fillStyle = '#fff';
    rr(x, hx, y, w, h, 4);
    x.fill();
    x.fillStyle = 'rgba(0,0,0,.5)';
    x.fillRect(hx + w / 2 - .5, y + h / 2 - 6, 1, 12);
  }
  x.globalAlpha = 1;
}

drawTL = function () {
  draw.apply(this, arguments);
  if (MOB) return;
  const x = tl.getContext('2d'), d = devicePixelRatio || 1;
  x.save();
  x.setTransform(d, 0, 0, d, 0, 0);
  x.beginPath();
  x.rect(HEAD, RUL, tl.clientWidth - HEAD, tl.clientHeight - RUL);
  x.clip();
  for (const c of P.clips) {
    if (c.id === sel || msel.has(c.id)) handles(x, c, 1);
    else if (c.id === hover) handles(x, c, .45);
  }
  x.restore();
};

tl.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const r = tl.getBoundingClientRect(), h = drag ? null : hitClip(e.clientX - r.left, e.clientY - r.top);
  const id = h ? h.c.id : null;
  if (id !== hover) { hover = id; dirty = true; }
});
tl.addEventListener('pointerleave', () => { if (hover) { hover = null; dirty = true; } });
dirty = true;
