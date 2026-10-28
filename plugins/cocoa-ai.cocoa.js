// ==CocoaCut Plugin==
// @id cocoa-ai
// @name Cocoa AI interpreter
// @version 1.2
// @author CocoaCut
// @description Understands free-form requests the Helper doesn't and turns them into Helper commands. Runs on your computer after a one-time download of about 500 MB.
// @access full
// ==/CocoaCut Plugin==

const MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3';
const t = cocoa.t;

// Commands the Helper is known to understand. The model copies their style.
const COMMANDS = [
  'all text green', 'captions green', 'the last caption red', 'first caption bold', 'all text bold and italic',
  'captions with a black outline', 'all text thick outline', 'captions red glow', 'text shadow', 'no background on captions',
  'captions background 50%', 'all text caps', 'playful font for all text', 'all text montserrat font', 'captions to the top', 'captions a bit higher', 'captions lower', 'captions a lot higher', 'captions a bit to the left', 'captions bigger', 'captions bold', 'captions yellow', 'music quieter', 'music louder',
  'center the text', 'all text bigger', 'text size 80', 'gradient red to blue on all text', 'all text neon style',
  'replace "two" with "2"', 'change the last caption to "bye"', 'all video 2x speed', 'all video slow motion',
  'music 40% volume', 'mute all video', 'music louder', 'fade in and out 1s on the music', 'loop the music',
  'make the music last the whole video', 'crossfade between all clips', 'wipe left between all videos',
  'remove transitions from all video', 'all video warm filter', 'all video vhs', 'all video vignette',
  'all video black and white', 'all video brightness 120%', 'all video more contrast', 'blur all video 10',
  'rotate all video 90 degrees', 'all video fill the frame', 'tint all video blue', 'remove all effects from all video',
  'move the last caption 2 seconds later', 'split the first video in half', 'delete the last caption',
  'cut the first 1s', 'close gaps', 'vertical 9:16', '30 fps', 'canvas color dark blue',
  'add title "Hello" at 1s', 'zoom in on all video', 'zoom out the last video 20%', 'zoom in a lot on the first video', 'reset zoom on all video',
  'captions pop in', 'captions fade in and out', 'typewriter captions', 'captions appear word by word', 'captions rise in and blur out', 'no animation on captions', 'add marker at 2s', 'go to 0:03', 'generate captions', 'trailer look', 'remove background noise'
];

const SHOTS = [
  ['make the words pop more', 'all text bold\nall text thick outline'],
  ['I want to post this on TikTok', 'vertical 9:16\nall video fill the frame'],
  ['the music drowns out my voice', 'music 40% volume'],
  ['give it an old movie feel', 'all video black and white\nall video vignette'],
  ['сделай субтитры заметнее', 'captions with a black outline\nall text bigger'],
  ['подними субтитры чуть выше', 'captions a bit higher'],
  ['текст сползает вниз, верни его повыше', 'captions higher'],
  ['субтитры слишком мелкие и бледные', 'captions bigger\ncaptions bold'],
  ['голос не слышно из-за музыки', 'music 40% volume'],
  ['сделай поярче', 'all video brightness 120%'],
  ['make everything feel faster', 'all video 2x speed'],
  ['get closer on the first clip', 'zoom in on the first video'],
  ['make the subtitles bounce in one word at a time', 'captions appear word by word'],
  ['put "The End" on screen at 5 seconds', 'add title "The End" at 5s'],
  ['what is the capital of France', 'NONE']
];

const SYSTEM = `You turn video editing requests into commands for the CocoaCut Helper.
Reply with commands only, one per line, in English, written exactly in the style of the examples. Use as few commands as possible.
If the request is not about editing this video, or no command fits, reply exactly: NONE

Example commands:
${COMMANDS.join('\n')}`;

const WORKER = `
let gen = null;
const say = m => postMessage(m);
async function load() {
  let L = null;
  for (const u of ['${LIB}', '${LIB}/+esm']) { try { L = await import(u); if (L.pipeline) break; } catch (e) {} }
  if (!L || !L.pipeline) throw new Error('Could not download the AI library. Check the internet connection.');
  L.env.allowLocalModels = false;
  let f16 = false;
  try { const a = navigator.gpu && await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }); f16 = !!(a && a.features.has('shader-f16')); } catch (e) {}
  const tries = f16 ? [{ device: 'webgpu', dtype: 'q4f16' }, { device: 'wasm', dtype: 'q8' }] : [{ device: 'wasm', dtype: 'q8' }];
  const why = [];
  for (const o of tries) {
    try {
      gen = await L.pipeline('text-generation', '${MODEL}', { device: o.device, dtype: o.dtype,
        progress_callback: p => { if (p.status === 'progress') say({ t: 'p', file: p.file, loaded: p.loaded, total: p.total }); } });
      return o.device;
    } catch (e) { why.push(o.device + ': ' + (e && e.message || e)); }
  }
  throw new Error('The AI model could not be loaded. ' + why.join(' | '));
}
onmessage = async e => {
  const d = e.data;
  try {
    if (d.t === 'load') { const dev = gen ? 'ready' : await load(); say({ t: 'ready', device: dev }); }
    else if (d.t === 'gen') {
      if (!gen) await load();
      const out = await gen(d.messages, { max_new_tokens: 80, do_sample: false });
      const last = out[0].generated_text;
      say({ t: 'out', id: d.id, text: Array.isArray(last) ? last[last.length - 1].content : String(last) });
    }
  } catch (err) { say({ t: 'err', id: d.id, msg: String(err && err.message || err) }); }
};`;

let worker = null, state = cocoa.storage.get('downloaded') ? 'downloaded' : 'off', running = false, busy = false, seq = 0;
const waits = {}, files = {};
const EST = 500e6;
let shown = 0;

let sent = [], heard = false;
function inPage() {
  // some pages can't start workers; run the model on the page instead
  const w = { onmessage: null, terminate() {} };
  const run = new Function('postMessage', 'let onmessage;' + WORKER + '\nreturn m => onmessage({ data: m });')(m => setTimeout(() => w.onmessage({ data: m })));
  w.postMessage = m => setTimeout(() => run(m));
  return w;
}
function startWorker(forcePage) {
  if (worker) return worker;
  let w;
  if (forcePage) w = inPage();
  else try {
    w = new Worker(URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' })));
    w.onerror = () => { if (heard || worker !== w) return; w.terminate(); worker = null; const q = sent; sent = []; const n = startWorker(true); q.forEach(m => n.postMessage(m)); };
  } catch (e) { w = inPage(); }
  const post = w.postMessage.bind(w);
  w.postMessage = m => { if (!heard) sent.push(m); post(m); };
  worker = w;
  worker.onmessage = e => {
    heard = true; sent = [];
    const d = e.data;
    if (d.t === 'p') {
      files[d.file] = [d.loaded || 0, d.total || 0];
      let a = 0, b = 0; for (const k in files) { a += files[k][0]; b += files[k][1]; }
      shown = Math.max(shown, Math.min(99, Math.floor(a / Math.max(b, EST) * 100)));
      const mb = Math.round(Math.max(b, EST) / 1e6);
      item.setLabel(t('Cocoa AI: downloading ', 'Cocoa AI: загрузка ') + shown + '% ' + t(`of ${mb} MB`, `из ${mb} МБ`));
    } else if (d.t === 'ready') {
      state = 'ready'; cocoa.storage.set('downloaded', true);
      item.setLabel(t('Cocoa AI: ready', 'Cocoa AI: готов'));
      if (waits.load) { waits.load(); delete waits.load; }
    } else if (d.t === 'out' || d.t === 'err') {
      const w = waits[d.id] || waits.load; delete waits[d.id]; delete waits.load;
      if (d.t === 'err') { if (state !== 'ready') { state = cocoa.storage.get('downloaded') ? 'downloaded' : 'off'; item.setLabel(label()); } if (w) w(null, d.msg); else cocoa.toast(d.msg); }
      else if (w) w(d.text);
    }
  };
  return worker;
}

function label() {
  return state === 'ready' ? t('Cocoa AI: ready', 'Cocoa AI: готов')
    : state === 'loading' ? t('Cocoa AI: starting…', 'Cocoa AI: запуск…')
    : state === 'downloaded' ? t('Cocoa AI: start', 'Cocoa AI: запустить')
    : t('Cocoa AI: download (~500 MB)', 'Cocoa AI: скачать (~500 МБ)');
}

function load() {
  if (state === 'ready') return Promise.resolve();
  state = 'loading'; item.setLabel(label());
  return new Promise((res, rej) => { waits.load = (x, err) => err ? rej(new Error(err)) : res(); startWorker().postMessage({ t: 'load' }); });
}

function ask(messages) {
  const id = ++seq;
  return new Promise((res, rej) => { waits[id] = (text, err) => err ? rej(new Error(err)) : res(text); startWorker().postMessage({ t: 'gen', id, messages }); });
}

function context() {
  const p = cocoa.project(), sel = cocoa.selection();
  const n = k => p.clips.filter(k).length;
  const kind = c => { const m = c.media && p.media.find(x => x.id === c.media); return c.type === 'text' ? (c.cap ? 'caption' : 'text') : m ? m.type : 'clip'; };
  return `Project: ${p.w}x${p.h}, ${Math.round(cocoa.duration())}s long, ${n(c => kind(c) === 'video')} video clips, ${n(c => kind(c) === 'audio')} audio clips, ${n(c => kind(c) === 'text')} text clips, ${n(c => kind(c) === 'caption')} captions.`
    + (sel.length ? ` Selected: ${sel.map(kind).join(', ')}.` : ' Nothing selected.');
}

function clean(text) {
  return String(text || '').split('\n')
    .map(l => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^["'`]+|["'`]+$/g, '').trim())
    .filter(l => l && !/^none\b/i.test(l) && l.length <= 120 && !/[;]/.test(l))
    .slice(0, 6);
}

async function interpret(raw) {
  if (busy) { cocoa.helper.say(t('Cocoa AI is still working on the last request.', 'Cocoa AI ещё занят прошлым запросом.')); return; }
  busy = true;
  try {
    if (state !== 'ready') { cocoa.helper.say(t('Starting Cocoa AI…', 'Запускаю Cocoa AI…')); await load(); }
    cocoa.helper.say(t('Cocoa AI is thinking…', 'Cocoa AI думает…'));
    const messages = [{ role: 'system', content: SYSTEM + '\n\n' + context() }];
    for (const [q, a] of SHOTS) messages.push({ role: 'user', content: q }, { role: 'assistant', content: a });
    messages.push({ role: 'user', content: raw });
    const lines = clean(await ask(messages));
    if (!lines.length) { cocoa.helper.say(t('Cocoa AI couldn’t turn that into an edit. Try saying it another way.', 'Cocoa AI не смог превратить это в правку. Попробуйте сказать иначе.'), 'error'); return; }
    console.log('[Cocoa AI]', raw, '→', lines);
    running = true;
    try { cocoa.helper.run(lines.join('; ')); } finally { running = false; }
  } catch (e) {
    cocoa.helper.say(t('Cocoa AI: ', 'Cocoa AI: ') + (e.message || e), 'error');
  } finally { busy = false; }
}

const item = cocoa.addMenuItem(label(), () => {
  if (state === 'ready') return cocoa.toast(t('Cocoa AI is ready. Type a request in the Helper.', 'Cocoa AI готов. Напишите запрос Помощнику.'));
  load().then(() => cocoa.toast(t('Cocoa AI is ready', 'Cocoa AI готов')), e => cocoa.toast(e.message || String(e)));
});

cocoa.helper.addCommand(/^(?:download|get|install|enable|start|turn on)(?: the)? (?:cocoa )?ai(?: model)?$|^(?:скачай|загрузи|установи|включи|запусти)(?: мне)? (?:ии|нейросеть|ai|cocoa ai)$/i, () => {
  if (state === 'ready') return cocoa.helper.say(t('Cocoa AI is already running.', 'Cocoa AI уже запущен.'), 'ok');
  cocoa.helper.say(t('Getting Cocoa AI ready. The first time downloads about 500 MB.', 'Готовлю Cocoa AI. В первый раз скачается около 500 МБ.'));
  load().then(() => cocoa.helper.say(t('Cocoa AI is ready. Ask for anything the Helper doesn’t understand.', 'Cocoa AI готов. Просите то, что Помощник не понимает.'), 'ok'),
    e => cocoa.helper.say(e.message || String(e), 'error'));
});

// Only step in once the model has been downloaded, and never for the commands Cocoa AI itself sends
cocoa.helper.setFallback(interpret, () => state !== 'off' && !running);

cocoa.onDisable(() => { if (worker) worker.terminate(); worker = null; });
