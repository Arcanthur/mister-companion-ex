const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const projectRoot = path.resolve(__dirname, '..');
const sourceFiles = [
  'src/styles.css',
  'src/mister-vaultkit.css',
  'src/win9x.css',
  'src/macos-platinum.css',
];

const fileConfigs = {
  'src/styles.css': {
    map: [
      '1. Foundations: imports, shared tokens, reset, and document defaults.',
      '2. Core UI: shell chrome, library cards, dialogs, and reusable controls.',
      '3. Configuration: settings workspace, theme editor, previews, and utilities.',
      '4. Compatibility: OS-specific adapters and versioned cascade locks remain last.',
    ],
    sections: [
      { type: 'rule', match: (s) => s === '*', number: '01', title: 'FOUNDATIONS & GLOBAL RESET', why: 'Shared tokens and document defaults live here so every theme begins from the same predictable baseline.' },
      { type: 'rule', match: (s) => s === '.app-shell', occurrence: 1, number: '02', title: 'APPLICATION SHELL & GLOBAL CHROME', why: 'The shell owns viewport scrolling, sticky chrome, and the common control language used by every theme.' },
      { type: 'rule', match: (s) => s.includes('.empty-state') && s.includes('.collection-view'), number: '03', title: 'LIBRARY COLLECTIONS, CARDS & TOOLBARS', why: 'Library browsing components stay together because their sizing and responsive behavior are tightly coupled.' },
      { type: 'rule', match: (s) => s === '.modal-backdrop', number: '04', title: 'MODALS, DETAILS & SETTINGS FOUNDATIONS', why: 'Dialog primitives are shared by poster search, details, settings, health, and confirmation workflows.' },
      { type: 'rule', match: (s) => s === '.app-style-material', number: '05', title: 'BUILT-IN APPEARANCE PRESETS', why: 'Preset adapters decorate the shared components without taking ownership of application layout.' },
      { type: 'comment', match: (t) => t.startsWith('fixed collection layout'), number: '06', title: 'COLLECTION LAYOUT & APPEARANCE SYSTEM', why: 'These rules centralize fixed, glass, grid, list, density, and typography ownership.' },
      { type: 'comment', match: (t) => t.startsWith('Cohesive settings workspace'), number: '07', title: 'SETTINGS WORKSPACE & THEME EDITOR', why: 'Settings navigation and preview controls share one geometry system to remain stable across fonts and scales.' },
      { type: 'comment', match: (t) => t.startsWith('Selectable native-window control treatments'), number: '08', title: 'WINDOW CHROME, GLOWS & SCROLLBARS', why: 'Window effects and custom scrollbars are isolated so themes can replace chrome without disturbing content flow.' },
      { type: 'comment', match: (t) => t.startsWith('Media libraries and cross-library categories'), number: '09', title: 'MEDIA LIBRARY SHELL & SIDEBAR', why: 'Cross-library navigation is grouped here because it introduces the integrated sidebar and footer ownership model.' },
      { type: 'comment', match: (t) => t.startsWith('macOS windows use a cool translucent source list'), number: '10', title: 'PLATFORM-SPECIFIC SHARED ADAPTERS', why: 'Only structural platform differences belong here; dedicated theme files provide the final visual skin.' },
      { type: 'comment', match: (t) => t.startsWith('v0.2.20:'), number: '11', title: 'VERSIONED COMPATIBILITY OVERRIDES', why: 'Historical fixes remain in source order because later cascade locks intentionally refine earlier behavior.' },
    ],
  },
  'src/mister-vaultkit.css': {
    map: [
      '1. Shared MiSTer shell: sidebar, header, footer, cards, forms, and status components.',
      '2. Feature pages: Settings, Install Center, Save Manager, ZapScripts, RA, Flash, and File Browser.',
      '3. Visual system: responsive layouts, theme-driven panels, sidebars, dialogs, and window effects.',
      '4. Cascade locks: versioned platform corrections remain chronological to preserve behavior.',
    ],
    sections: [
      { type: 'rule', match: (s) => s === '.mister-electron-sidebar', occurrence: 1, number: '01', title: 'SHARED MISTER APPLICATION SHELL', why: 'The core shell establishes the layout contract consumed by every feature page and visual theme.' },
      { type: 'rule', match: (s) => s === '.mister-card-grid', number: '02', title: 'REUSABLE PANELS, FORMS & STATUS COMPONENTS', why: 'Cards, fields, actions, and status indicators are grouped as the common MiSTer component toolkit.' },
      { type: 'comment', match: (t) => t.startsWith('MiSTer Settings parity pass'), number: '03', title: 'MISTER SETTINGS & DEVICE CONTROLS', why: 'Device-facing settings stay together because their control geometry and status feedback are interdependent.' },
      { type: 'comment', match: (t) => t.startsWith('Install Center VaultKit grid'), number: '04', title: 'INSTALL CENTER', why: 'Artwork grids, summaries, popups, probing, and installation progress share one responsive feature surface.' },
      { type: 'comment', match: (t) => t.startsWith('SaveManager parity pass'), number: '05', title: 'SAVE MANAGER & BACKUP WORKFLOWS', why: 'Backup lists and actions use a dedicated layout while inheriting the shared panel and control tokens.' },
      { type: 'comment', match: (t) => t.startsWith('v0.2.17 ZapScripts backend parity'), number: '06', title: 'ZAPSCRIPTS & SERVICE WORKFLOWS', why: 'Script browsing, service state, scanning, and launch actions form one dense operational workspace.' },
      { type: 'comment', match: (t) => t.startsWith('RetroAchievements sidebar page'), number: '07', title: 'RETROACHIEVEMENTS & ACCOUNT SURFACES', why: 'Profile metrics, game lists, API settings, and authentication states are maintained as one feature family.' },
      { type: 'comment', match: (t) => t.startsWith('v0.2.71 File Browser'), number: '08', title: 'FILE BROWSER & TRANSFER ACTIVITY', why: 'Locations, file rows, drag-and-drop, actions, and transfer activity share coordinated width and overflow rules.' },
      { type: 'comment', match: (t) => t.startsWith('v0.2.77 Network scan UI'), number: '09', title: 'NETWORK DISCOVERY & CONNECTION POLISH', why: 'Discovery and connection feedback are grouped to keep likely-MiSTer filtering and status presentation consistent.' },
      { type: 'comment', match: (t) => t.startsWith('v0.2.47 macOS layout pass'), number: '10', title: 'THEME-DRIVEN SHELL & PANEL SYSTEM', why: 'This layer converts feature pages into token-driven layouts without hardcoding a particular color palette.' },
      { type: 'comment', match: (t) => t.startsWith('v0.3.36 Windows 9X theme engine support'), number: '11', title: 'WINDOWS 9X COMPATIBILITY LAYER', why: 'Legacy Windows corrections stay late in the cascade so square bevels can replace modern shared chrome.' },
      { type: 'comment', match: (t) => t.startsWith('v0.3.45: MacOS 9 Platinum special app style'), number: '12', title: 'MAC OS 9 PLATINUM COMPATIBILITY LAYER', why: 'The historical Platinum evolution remains ordered because each pass intentionally narrows or supersedes earlier rules.' },
      { type: 'comment', match: (t) => t.startsWith('v0.4.00 settings audit polish'), number: '13', title: 'FINAL SETTINGS AUDIT & CASCADE LOCKS', why: 'These narrowly scoped rules prevent modern, Win9x, and Platinum settings chrome from bleeding into one another.' },
    ],
  },
  'src/win9x.css': {
    map: [
      '1. Theme tokens and hard reset establish the classic Windows surface model.',
      '2. Controls and title chrome reproduce raised, sunken, pressed, and selected states.',
      '3. Panels, lists, settings, and page layouts apply the same square bevel language.',
      '4. Final frame/sidebar locks preserve full-width chrome and dense legacy spacing.',
    ],
    sections: [
      { type: 'rule', match: (s) => s === '.app-shell.app-style-windows9x', occurrence: 1, number: '01', title: 'WINDOWS 9X TOKENS & GLOBAL RESET', why: 'Theme-scoped tokens prevent classic face, highlight, shadow, and title colors from leaking into other themes.' },
      { type: 'rule', match: (s) => s.includes('input:not([type="range"]') && s.includes('.manual-pdf-page-field input'), occurrence: 1, number: '02', title: 'CLASSIC INPUTS, BUTTONS & CONTROL STATES', why: 'Raised and sunken bevels are defined as a coordinated system so interaction states never shift layout.' },
      { type: 'rule', match: (s) => s.includes('.window-controls') && s.includes('.topbar'), occurrence: 1, number: '03', title: 'TITLE BAR & WINDOW CONTROLS', why: 'Caption buttons use dedicated geometry and glyph construction to match the compact Windows 9x title bar.' },
      { type: 'rule', match: (s) => s.includes('.settings-close-button') && s.includes(':focus-visible'), occurrence: 1, number: '04', title: 'DIALOGS, SETTINGS & PANEL CHROME', why: 'Settings and dialog surfaces reuse the same square bevel model while keeping close controls optically centered.' },
      { type: 'rule', match: (s) => s.includes('.mister-profile-list') && s.includes('.mister-network-scan-list') && s.includes('.mister-file-list'), occurrence: 2, number: '05', title: 'SUNKEN LISTS, ROWS & FEATURE SURFACES', why: 'Operational lists share one inset well so rows can fill edge-to-edge without producing nested borders.' },
      { type: 'rule', match: (s) => s.includes('.app-window-frame:has(.app-shell.app-style-windows9x) > .app-window-border-layer'), number: '06', title: 'WINDOW FRAME & PERIMETER', why: 'The renderer-owned outer layers are disabled so the theme can draw one crisp, square native frame.' },
      { type: 'rule', match: (s) => s === '.app-shell.app-style-windows9x.media-sidebar-open', occurrence: 1, number: '07', title: 'FULL-WIDTH CHROME & SIDEBAR CASCADE LOCKS', why: 'These final rules make the title and footer span the entire window while the sidebar begins beneath the caption bar.' },
    ],
  },
  'src/macos-platinum.css': {
    map: [
      '1. Platinum tokens and frame reset establish the classic Mac OS 9 surface model.',
      '2. Title bar, sidebar, controls, panels, fields, lists, and scrollbars form the native widget kit.',
      '3. Feature-specific layouts refine ZapScripts, profiles, RetroAchievements, Settings, and file workflows.',
      '4. Versioned cascade locks remain chronological because later passes intentionally supersede earlier metrics.',
    ],
    sections: [
      { type: 'rule', match: (s) => s === '.app-shell.app-style-macos9platinum', occurrence: 1, number: '01', title: 'PLATINUM TOKENS & WINDOW FRAME RESET', why: 'Theme-scoped face, line, selection, and sizing tokens create one native palette without affecting modern themes.' },
      { type: 'rule', match: (s) => s.includes('.mister-electron-header.topbar') && s.includes('> .mister-electron-main'), occurrence: 1, number: '02', title: 'TITLE BAR, HEADER PLAQUE & FOOTER CHROME', why: 'Full-width chrome crosses the sidebar seam to reproduce a single classic application window.' },
      { type: 'rule', match: (s) => s === '.app-shell.app-style-macos9platinum .mister-electron-sidebar', occurrence: 1, number: '03', title: 'SOURCE-LIST SIDEBAR & NAVIGATION', why: 'The sidebar uses compact image-driven rows and a native separator rather than modern floating navigation cards.' },
      { type: 'rule', match: (s) => s.includes('.window-controls-macos9platinum') && s.includes('.window-control'), occurrence: 1, number: '04', title: 'CAPTION BUTTONS & HEADER CONTROLS', why: 'Classic close, collapse, zoom, and settings controls use fixed optical geometry independent of React ordering.' },
      { type: 'rule', match: (s) => s.includes('.mister-card') && s.includes('.settings-modal') && s.includes('.settings-section'), occurrence: 1, number: '05', title: 'PANELS, FIELDS, BUTTONS & LIST WELLS', why: 'The Platinum widget kit relies on one-pixel rules and controlled bevel layers, so component surfaces are maintained together.' },
      { type: 'rule', match: (s) => s.includes('input[type="range"]'), occurrence: 1, number: '06', title: 'NATIVE FORM CONTROLS & SCROLLBARS', why: 'Sliders, toggles, dropdowns, and scroll rails use dedicated imagery and metrics instead of generic browser chrome.' },
      { type: 'comment', match: (t) => t.startsWith('v0.4.01 Platinum settings layout corrections'), number: '07', title: 'SETTINGS WORKSPACE REFINEMENT', why: 'Settings-specific rules are intentionally narrow so the Platinum shell does not disturb other application pages.' },
      { type: 'comment', match: (t) => t.includes('v0.4.10 Platinum panel controls'), number: '08', title: 'FEATURE-SPECIFIC PLATINUM LAYOUTS', why: 'ZapScripts, profiles, RetroAchievements, progress meters, and saved-profile controls need native-era density adjustments.' },
      { type: 'comment', match: (t) => t.includes('v0.4.12 Platinum Zap footer'), number: '09', title: 'CONTROL RAILS, LISTS & PROGRESS METERS', why: 'Shared control rails align fields and buttons while list boxes and candy-stripe progress preserve native proportions.' },
      { type: 'comment', match: (t) => t.includes('v0.4.15 Platinum field padding'), number: '10', title: 'SCROLLBAR ARTWORK & FIELD GEOMETRY', why: 'Normal, pressed, and inactive image slices are kept together to avoid mismatched rail caps or hidden gutters.' },
      { type: 'comment', match: (t) => t.includes('v0.4.18 Platinum dropdown PNG chrome'), number: '11', title: 'DROPDOWNS & FINAL CONTROL ROLES', why: 'The final interaction layer assigns PNG families and action roles without introducing modern hover behavior.' },
    ],
  },
};

function wrapBannerText(text, width = 92) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines.join('\n   ');
}

function banner(number, title, why) {
  return postcss.comment({
    text: `==========================================================================\n   ${number}. ${title}\n   ${wrapBannerText(why)}\n   ==========================================================================`,
  });
}

function developerMap(lines) {
  const wrappedMap = lines.map((line) => wrapBannerText(line)).join('\n   ');
  return postcss.comment({
    text: `==========================================================================\n   CSS DEVELOPER MAP\n   --------------------------------------------------------------------------\n   ${wrappedMap}\n\n   Source order is intentionally preserved. Later rules are often deliberate\n   cascade refinements rather than duplicates that can be freely moved.\n   ==========================================================================`,
  });
}

function normalizeCommentText(text) {
  return text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
}

function findAnchor(root, section) {
  let seen = 0;
  const occurrence = section.occurrence || 1;
  for (const node of root.nodes) {
    if (section.type === 'rule' && node.type === 'rule' && section.match(node.selector.replace(/\s+/g, ' ').trim())) {
      seen += 1;
      if (seen === occurrence) return node;
    }
    if (section.type === 'comment' && node.type === 'comment' && section.match(normalizeCommentText(node.text))) {
      seen += 1;
      if (seen === occurrence) return node;
    }
  }
  return null;
}

function propertyCategory(prop) {
  const p = prop.toLowerCase();
  if (p.startsWith('--')) return 0;

  if (/^(display|box-sizing|box-decoration-break|flex($|-)|grid($|-)|place-|align-|justify-|order$|gap$|row-gap$|column-gap$|columns?$|column-|width$|height$|min-width$|max-width$|min-height$|max-height$|aspect-ratio$|margin($|-)|padding($|-)|border($|-)|border-radius$|outline($|-)|table-layout$|border-collapse$|border-spacing$)/.test(p)) return 10;
  if (/^(position$|inset($|-)|top$|right$|bottom$|left$|z-index$|float$|clear$)/.test(p)) return 20;
  if (/^(font($|-)|line-height$|letter-spacing$|word($|-)|white-space$|text($|-)|vertical-align$|list-style($|-)|quotes$|hyphens$|tab-size$)/.test(p)) return 30;
  if (/^(color$|background($|-)|box-shadow$|fill$|stroke($|-)|caret-color$|accent-color$|opacity$|visibility$|mix-blend-mode$|isolation$)/.test(p)) return 40;
  if (/^(content$|overflow($|-)|overscroll-behavior($|-)|clip($|-)|clip-path$|object($|-)|cursor$|pointer-events$|user-select$|resize$|appearance$|-webkit-appearance$|filter$|backdrop-filter$|-webkit-backdrop-filter$|transform($|-)|translate$|rotate$|scale$|transition($|-)|animation($|-)|will-change$|scroll($|-)|touch-action$|contain($|-)|mask($|-)|-webkit-mask($|-)|image-rendering$)/.test(p)) return 50;
  return 60;
}

function sortRuleDeclarations(rule) {
  if (!rule.nodes || rule.nodes.some((node) => !['decl', 'comment'].includes(node.type))) return;
  const decls = rule.nodes.filter((node) => node.type === 'decl');
  if (decls.length < 2) return;
  if (decls.some((decl) => decl.prop.toLowerCase() === 'all')) return;

  const units = [];
  let pendingComments = [];
  let index = 0;

  for (const node of rule.nodes) {
    if (node.type === 'comment') {
      pendingComments.push(node);
      continue;
    }

    units.push({
      nodes: [...pendingComments, node],
      category: propertyCategory(node.prop),
      index: index++,
    });
    pendingComments = [];
  }

  const trailingComments = pendingComments;
  units.sort((a, b) => a.category - b.category || a.index - b.index);
  const sortedNodes = units.flatMap((unit) => unit.nodes).concat(trailingComments);

  rule.removeAll();
  sortedNodes.forEach((node) => rule.append(node));
}

function formatSelector(selector, indent) {
  const source = selector.replace(/\r\n?/g, '\n').trim();
  let result = '';
  let quote = null;
  let escaped = false;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }

    if (quote) {
      result += char;
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      result += char;
      quote = char;
      continue;
    }

    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (char === ',' && bracketDepth === 0) {
      result = result.replace(/[ \t]+$/g, '');
      const continuation = parenDepth > 0 ? `${indent}  ` : indent;
      result += `,\n${continuation}`;
      while (/\s/.test(source[i + 1] || '')) i += 1;
      continue;
    }

    if (/\s/.test(char)) {
      if (!result.endsWith(' ') && !result.endsWith('\n')) result += ' ';
      continue;
    }

    result += char;
  }

  return result
    .replace(/(:where|:is|:not|:has)\(\s+/g, '$1(')
    .replace(/\s+\)/g, ')')
    .trimEnd();
}

function wrapLongValue(value, continuationIndent, width = 108) {
  if (value.length <= width || value.includes('url(data:')) return value;

  let result = '';
  let quote = null;
  let escaped = false;
  let parenDepth = 0;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }

    if (quote) {
      result += char;
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      result += char;
      quote = char;
      continue;
    }

    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (char === ',' && parenDepth === 0) {
      result += `,\n${continuationIndent}`;
      while (/\s/.test(value[i + 1] || '')) i += 1;
      continue;
    }

    result += char;
  }

  return result;
}

function formatValue(value, continuationIndent = '') {
  let result = '';
  let quote = null;
  let escaped = false;
  const functions = [];

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }

    if (quote) {
      result += char;
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      result += char;
      quote = char;
      continue;
    }

    if (char === '(') {
      const match = result.match(/([a-zA-Z-]+)\s*$/);
      functions.push(match ? match[1].toLowerCase() : '');
      result += char;
      continue;
    }

    if (char === ')') {
      functions.pop();
      result += char;
      continue;
    }

    if (char === ',' && !functions.includes('url')) {
      result = result.replace(/[ \t]+$/g, '');
      result += ', ';
      while (/\s/.test(value[i + 1] || '')) i += 1;
      continue;
    }

    result += char;
  }

  return wrapLongValue(result.trim(), continuationIndent);
}

function normalizeFormatting(container, childDepth = 0) {
  const childIndent = '  '.repeat(childDepth);
  const closingIndent = '  '.repeat(Math.max(0, childDepth - 1));
  const isRoot = container.type === 'root';
  const isRule = container.type === 'rule';

  if (container.nodes) {
    container.nodes.forEach((node, index) => {
      if (isRoot) {
        node.raws.before = index === 0 ? '' : '\n\n';
      } else if (isRule) {
        node.raws.before = `\n${childIndent}`;
      } else {
        node.raws.before = index === 0 ? `\n${childIndent}` : `\n\n${childIndent}`;
      }

      if (node.type === 'decl') {
        node.value = formatValue(node.value, `${childIndent}  `);
        node.raws.between = ': ';
        node.raws.semicolon = true;
      } else if (node.type === 'rule') {
        node.selector = formatSelector(node.selector, childIndent);
        node.raws.between = ' ';
        normalizeFormatting(node, childDepth + 1);
        node.raws.semicolon = true;
      } else if (node.type === 'atrule') {
        node.raws.afterName = node.params ? ' ' : '';
        if (node.nodes) {
          node.raws.between = ' ';
          normalizeFormatting(node, childDepth + 1);
          node.raws.semicolon = true;
        } else {
          node.raws.semicolon = true;
        }
      } else if (node.type === 'comment') {
        node.text = node.text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n');
        node.raws.left = ' ';
        node.raws.right = ' ';
      }
    });
  }

  container.raws = container.raws || {};
  if (isRoot) container.raws.after = '\n';
  else if (container.nodes) container.raws.after = `\n${closingIndent}`;
}

function ensureRootTokens(root) {
  let rootRule = root.nodes.find((node) => node.type === 'rule' && node.selector.trim() === ':root');
  if (!rootRule) {
    rootRule = postcss.rule({ selector: ':root' });
    const importNode = root.nodes.find((node) => node.type === 'atrule' && node.name === 'import');
    if (importNode) importNode.after(rootRule);
    else root.prepend(rootRule);
  }

  const tokens = [
    ['--app-scrollbar-size', '6px'],
    ['--app-scrollbar-radius', '3px'],
    ['--motion-fast', '150ms'],
    ['--motion-standard', '180ms'],
  ];

  for (const [prop, value] of tokens) {
    if (!rootRule.nodes?.some((node) => node.type === 'decl' && node.prop === prop)) {
      rootRule.append(postcss.decl({ prop, value }));
    }
  }

  root.walkRules((rule) => {
    const normalized = rule.selector.replace(/\s+/g, ' ').trim();
    if (normalized === '::-webkit-scrollbar') {
      rule.walkDecls('width', (decl) => {
        if (decl.value.trim() === '6px') decl.value = 'var(--app-scrollbar-size)';
      });
    }
    if (normalized === '::-webkit-scrollbar-thumb') {
      rule.walkDecls('border-radius', (decl) => {
        if (decl.value.trim() === '3px') decl.value = 'var(--app-scrollbar-radius)';
      });
    }
  });
}

function replaceMotionTokens(root) {
  root.walkDecls((decl) => {
    if (decl.prop.startsWith('--')) return;
    decl.value = decl.value
      .replace(/(^|[^\w.-])(?:0?\.15s|150ms)(?=$|[^\w])/g, '$1var(--motion-fast)')
      .replace(/(^|[^\w.-])(?:0?\.18s|180ms)(?=$|[^\w])/g, '$1var(--motion-standard)');
  });
}

for (const relativeFile of sourceFiles) {
  const absoluteFile = path.join(projectRoot, relativeFile);
  const css = fs.readFileSync(absoluteFile, 'utf8');
  const root = postcss.parse(css, { from: absoluteFile });
  const config = fileConfigs[relativeFile];

  // Remove only banners generated by this formatter, making the pass idempotent.
  root.nodes
    .filter((node) => node.type === 'comment' && (node.text.includes('CSS DEVELOPER MAP') || /^=+\n\s*\d{2}\./.test(node.text)))
    .forEach((node) => node.remove());

  if (relativeFile === 'src/styles.css') ensureRootTokens(root);
  replaceMotionTokens(root);

  root.walkRules(sortRuleDeclarations);

  for (const section of config.sections) {
    const anchor = findAnchor(root, section);
    if (!anchor) {
      console.warn(`Missing section anchor in ${relativeFile}: ${section.number} ${section.title}`);
      continue;
    }
    anchor.before(banner(section.number, section.title, section.why));
  }

  root.prepend(developerMap(config.map));
  normalizeFormatting(root);

  const output = root.toString().replace(/[ \t]+\n/g, '\n');
  fs.writeFileSync(absoluteFile, output, 'utf8');
  console.log(`Formatted ${relativeFile}`);
}
