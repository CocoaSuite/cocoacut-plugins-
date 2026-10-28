// ==CocoaCut Plugin==
// @id theme-studio
// @name Theme Studio
// @version 1.0
// @author CocoaCut
// @description Pick your own colour for every part of CocoaCut, or start from a ready-made theme.
// @permissions theme, menu, ui, helper
// ==/CocoaCut Plugin==

const t = cocoa.t;

const FIELDS = [
  [t('App', 'Приложение')],
  ['--bg', t('Background', 'Фон')],
  ['--panel', t('Panels', 'Панели')],
  ['--panel2', t('Fields and buttons', 'Поля и кнопки')],
  ['--line', t('Lines and borders', 'Линии и рамки')],
  ['--fg', t('Text', 'Текст')],
  ['--mute', t('Secondary text', 'Второстепенный текст')],
  [t('Buttons and highlights', 'Кнопки и выделение')],
  ['--pri', t('Main button', 'Главная кнопка')],
  ['--prifg', t('Main button text', 'Текст главной кнопки')],
  ['--acc', t('Accent', 'Акцент')],
  ['--accfg', t('Text on accent', 'Текст на акценте')],
  ['--hl', t('Selection, playhead and progress', 'Выделение, курсор и прогресс')],
  [t('Sliders', 'Ползунки')],
  ['--sfill', t('Slider fill', 'Заливка ползунка')],
  ['--sedge', t('Slider edge', 'Край ползунка')],
  [t('Timeline clips', 'Клипы на таймлайне')],
  ['--cv', t('Video', 'Видео')],
  ['--ci', t('Images', 'Картинки')],
  ['--ct', t('Text', 'Текст')],
  ['--ca', t('Sound', 'Звук')]
];
const KEYS = FIELDS.filter(f => f.length === 2).map(f => f[0]);

const base = { '--bg': '#121212', '--panel': '#1a1a1a', '--panel2': '#252525', '--line': '#303030', '--fg': '#ececec', '--mute': '#8f8f8f',
  '--pri': '#f2f2f2', '--prifg': '#111111', '--acc': '#4a4a4a', '--accfg': '#ffffff', '--hl': '#ffffff', '--sfill': '#4a4a4a', '--sedge': '#ffffff',
  '--cv': '#3d6a9e', '--ci': '#7c5aa6', '--ct': '#a8703e', '--ca': '#3c8a66' };

const PRESETS = {
  graphite: [t('Graphite (default)', 'Графит (по умолчанию)'), base],
  cocoa: [t('Hot Cocoa', 'Горячий шоколад'), { ...base, '--bg': '#17110e', '--panel': '#211813', '--panel2': '#2b2019', '--line': '#3b2c23', '--fg': '#f2e4d4', '--mute': '#a48c78',
    '--pri': '#f2e4d4', '--prifg': '#17110e', '--acc': '#8a5a3a', '--hl': '#e9b98a', '--sfill': '#5a3d2b', '--sedge': '#f2e4d4', '--cv': '#7a5236', '--ci': '#8a5a6a', '--ca': '#5b7a4a' }],
  amber: [t('Amber', 'Янтарь'), { ...base, '--acc': '#f0a43a', '--accfg': '#1b1406', '--hl': '#f0a43a', '--sfill': '#5a4220', '--sedge': '#f0a43a' }],
  midnight: [t('Midnight', 'Полночь'), { ...base, '--bg': '#0e1117', '--panel': '#151a23', '--panel2': '#1d2430', '--line': '#2a3342', '--fg': '#e6ebf2', '--mute': '#8a95a8',
    '--pri': '#e6ebf2', '--prifg': '#0e1117', '--acc': '#3b5bdb', '--hl': '#7aa2ff', '--sfill': '#2c3e66', '--sedge': '#cfe0ff' }],
  forest: [t('Forest', 'Лес'), { ...base, '--bg': '#0f1411', '--panel': '#161d18', '--panel2': '#1f2822', '--line': '#2c3830', '--fg': '#e4ede6', '--mute': '#8a9a8f',
    '--pri': '#e4ede6', '--prifg': '#0f1411', '--acc': '#2f7a55', '--hl': '#8fe0b0', '--sfill': '#2a4a38', '--sedge': '#d8f5e3' }]
};

let saved = { preset: 'graphite', colors: { ...base } };

const pick = o => Object.fromEntries(KEYS.map(k => [k, o[k] || base[k]]));
const same = (a, b) => KEYS.every(k => String(a[k]).toLowerCase() === String(b[k]).toLowerCase());
const presetOf = c => Object.keys(PRESETS).find(k => same(PRESETS[k][1], c)) || 'custom';

async function open() {
  let last = saved.preset;
  const fields = [{ key: 'preset', type: 'select', label: t('Start from', 'Основа'), value: saved.preset,
    options: [...Object.entries(PRESETS).map(([k, v]) => [k, v[0]]), ['custom', t('My colours', 'Мои цвета')]] }];
  for (const f of FIELDS) fields.push(f.length === 1 ? { type: 'heading', label: f[0] } : { key: f[0], type: 'color', label: f[1], value: saved.colors[f[0]] });
  const res = await cocoa.ui.form({
    title: t('Theme Studio', 'Тема оформления'),
    text: t('Changes show straight away. Save keeps them, Cancel goes back.', 'Изменения видны сразу. «Сохранить» оставит их, «Отмена» вернёт как было.'),
    fields,
    onInput: async v => {
      if (v.preset !== last && PRESETS[v.preset]) {
        last = v.preset;
        const c = PRESETS[v.preset][1];
        await cocoa.setTheme(c);
        return { ...c };
      }
      const c = pick(v);
      await cocoa.setTheme(c);
      const p = presetOf(c);
      if (p !== v.preset) { last = p; return { preset: p }; }
    }
  });
  if (res) {
    saved = { preset: presetOf(pick(res)), colors: pick(res) };
    cocoa.storage.set('theme', saved);
    cocoa.toast(t('Theme saved', 'Тема сохранена'));
  }
  await cocoa.setTheme(saved.colors);
}

cocoa.addMenuItem(t('Theme Studio…', 'Тема оформления…'), open);

cocoa.helper.addCommand(/^(?:open )?(?:theme(?: studio)?|change (?:the )?(?:colou?rs|theme)|customi[sz]e (?:the )?(?:colou?rs|theme)|pick (?:my own )?colou?rs)$|^(?:настрой|поменяй|измени|открой)(?: мне)? (?:цвета|тему|оформление)(?: приложения)?$/i, () => open());

cocoa.storage.get('theme').then(s => {
  if (s && s.colors) { saved = { preset: s.preset || 'custom', colors: pick(s.colors) }; cocoa.setTheme(saved.colors); }
});
