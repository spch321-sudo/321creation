/* CPAR321 v2-cr（2026-11-09）：321萬象見神 中英逐句並讀
   繁／简頁並讀英文、英文頁並讀繁體中文：展館單元每一步（驚嘆／明白／深究）與教學講章，含單元標題。
   英文來源：en-<展館>.json、en-<展館>-sermon.json（目前八個展館、每館前八個單元有英文）；
   中文來源：tc-<展館>.json。依單元 id 對應，句子插在原句（.sent 朗讀／畫線單位）後面。
   設定存 localStorage 'cpar321'（所有 321 App 共用）。 */
(function () {
  if (window.CPAR321 || !window.CR321_PAR || typeof DATA === 'undefined') return;
  function EN() { return DATA === 'en-'; }
  function UI() { return DATA === 'en-' ? 'en' : (DATA === 'sc-' ? 'sc' : 'tc'); }
  var UNIT = '[data-k]', SKIPX = '.sim,.quiz,.sharebox,.hl-note';
  /* ── 共用核心（與 321聖經講義 CPAR321 同一套演算法）──
     段落 LCS 配對 → 主要段落找句尾 → 另一語言切句、依長度比例 DP 對齊 → 插入 .cps。
     .cps 的文字放在 data-t、用 CSS ::before 顯示：DOM 裡沒有文字節點，
     所以朗讀、畫線、逐句點選、介面翻譯層都看不到它，只作用在主要內容。 */
  var STR = {
    tc: { btn: '中英並讀', on: '開', off: '關', loading: '英文內容載入中…', fail: '英文內容載入失敗，請檢查網路', none: '這一部分目前沒有英文版' },
    sc: { btn: '中英并读', on: '开', off: '关', loading: '英文内容载入中…', fail: '英文内容载入失败，请检查网络', none: '这一部分目前没有英文版' },
    en: { btn: 'Chinese parallel', on: 'On', off: 'Off', loading: 'Loading the Chinese text…', fail: 'Couldn’t load the Chinese text — check your connection', none: 'No Chinese text for this part' }
  };
  function T(k) { return STR[UI()][k]; }
  function isOn() { try { return localStorage.getItem('cpar321') === '1'; } catch (e) { return false; } }
  function setOn(v) { try { localStorage.setItem('cpar321', v ? '1' : ''); } catch (e) {} }
  var ALT_LANG = function () { return EN() ? 'zh-Hant' : 'en'; };

  var SEL = 'h1,h2,h3,h4,h5,p,li,blockquote,td,th,dt,dd';
  var SKIP_IN = '.cps,.cparbar,.cpar-st,button,details.refs,select,textarea' + (typeof SKIPX === 'string' && SKIPX ? ',' + SKIPX : '');
  function blocks(root) {
    var all = root.querySelectorAll(SEL), out = [];
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.closest(SKIP_IN)) continue;
      var p = e.parentElement, nested = false;
      while (p && p !== root) { if (p.matches && p.matches(SEL)) { nested = true; break; } p = p.parentElement; }
      if (!nested) out.push(e);
    }
    return out;
  }
  function sig(e) { return e.tagName + '.' + (e.className || '').toString().split(/\s+/).filter(function (c) { return c && !/^(hl|on|mks|sent|ms|tts-reading)$/.test(c); }).sort().join('.'); }
  function lcs(a, b) {
    var n = a.length, m = b.length, i, j, L = [];
    for (i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var pairs = []; i = 0; j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
    return pairs;
  }
  function txt(e) { return (e.textContent || '').replace(/\s+/g, ' ').trim(); }
  function clearIn(root) { if (!root) return; var old = root.querySelectorAll('.cps'); for (var o = 0; o < old.length; o++) old[o].parentNode.removeChild(old[o]); }
  /* 主要畫面 root 與另一語言的 HTML 依段落結構配對 */
  function pairInto(root, altHtml, strip) {
    if (!root) return 0;
    clearIn(root);
    if (!altHtml) return 0;
    var box = document.createElement('div'); box.innerHTML = altHtml;
    var kill = box.querySelectorAll('script,style,svg,button,canvas,input,textarea,select' + (strip ? ',' + strip : ''));
    for (var k = 0; k < kill.length; k++) kill[k].parentNode.removeChild(kill[k]);
    var A = blocks(root), B = blocks(box);
    if (!A.length || !B.length) return 0;
    var cut = 1500, pairs = [];
    for (var s = 0; s < Math.max(A.length, B.length); s += cut) {
      lcs(A.slice(s, s + cut).map(sig), B.slice(s, s + cut).map(sig)).forEach(function (p) { pairs.push([p[0] + s, p[1] + s]); });
    }
    var n = 0;
    pairs.forEach(function (p) { n += pairOne(A[p[0]], txt(B[p[1]])); });
    return n;
  }
  function pairOne(me, t2) {
    var t1 = txt(me);
    t2 = (t2 || '').replace(/^#{1,6}\s+/, '');
    if (!t2 || t1 === t2 || !/[A-Za-z一-鿿]/.test(t2)) return 0;
    if (EN() ? !/[一-鿿]/.test(t2) : !/[A-Za-z]{2}/.test(t2)) return 0;   // 另一語言其實沒翻（同一種文字）就不插
    return sentPair(me, t2);
  }
  var ZH_END = /[。！？；!?]+(?:[」』”’）)】〕]*)/g, EN_END = /[.!?;](?:["”’)\]]*)(?=\s|$)/g;
  function splitSents(t, zh) {
    t = t.replace(/\s+/g, ' ').trim(); if (!t) return [];
    var re = zh ? /[^。！？；!?]+(?:[。！？；!?]+[」』”’）)】〕]*)?/g : /[^.!?;]+(?:[.!?;]+["”’)\]]*)?(?=\s|$)|[^.!?;]+$/g;
    var out = (t.match(re) || [t]).map(function (x) { return x.trim(); }).filter(Boolean), merged = [];
    out.forEach(function (x) {
      if (merged.length && (x.replace(/[\s\p{P}]/gu, '').length < (zh ? 3 : 6))) merged[merged.length - 1] += (zh ? '' : ' ') + x;
      else merged.push(x);
    });
    return merged;
  }
  function plen(t, zh) { return Math.max(1, zh ? t.replace(/[\s\p{P}]/gu, '').length : t.replace(/\s+/g, ' ').length); }
  function mainBounds(block) {
    var zh = !EN(), re = zh ? ZH_END : EN_END, w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null), node, out = [], acc = '';
    while ((node = w.nextNode())) {
      var pe = node.parentElement;
      if (pe && pe.closest('.cps,button,svg,.dtag,.hl-note')) continue;
      var tx = node.nodeValue, m, pos = 0, unit = (UNIT && pe) ? pe.closest(UNIT) : null;
      if (unit && !block.contains(unit)) unit = null;
      re.lastIndex = 0;
      while ((m = re.exec(tx))) {
        var end = m.index + m[0].length;
        acc += tx.slice(pos, end); pos = end;
        out.push({ node: node, off: end, unit: unit, text: acc }); acc = '';
      }
      acc += tx.slice(pos);
    }
    if (acc.replace(/\s/g, '')) out.push({ node: null, off: 0, unit: null, text: acc, tail: true });
    var res = [];
    out.forEach(function (b) {
      var last = res[res.length - 1];
      if (last && b.unit && last.unit === b.unit) { last.text += b.text; last.node = b.node; last.off = b.off; return; }
      if (b.tail && last && !last.unit && !last.node) { last.text += b.text; return; }
      res.push(b);
    });
    return res;
  }
  function align(ma, al) {
    var M = ma.map(function (t) { return plen(t, !EN()); }), A2 = al.map(function (t) { return plen(t, EN()); });
    var sm = M.reduce(function (a, b) { return a + b; }, 0), sa = A2.reduce(function (a, b) { return a + b; }, 0), r = sa / sm;
    var m = M.length, n = A2.length, INF = 1e9, C = [], B = [], i, j;
    for (i = 0; i <= m; i++) { C.push(new Float64Array(n + 1).fill(INF)); B.push(new Array(n + 1)); }
    C[0][0] = 0;
    var moves = [[1, 1, 0], [1, 2, .6], [2, 1, .6], [1, 3, 1.4], [3, 1, 1.4], [2, 2, 1], [1, 0, 3], [0, 1, 3]];
    for (i = 0; i <= m; i++) for (j = 0; j <= n; j++) {
      if (C[i][j] >= INF) continue;
      moves.forEach(function (mv) {
        var a = i + mv[0], b = j + mv[1]; if (a > m || b > n) return;
        var x = 0, y = 0, k; for (k = i; k < a; k++) x += M[k]; for (k = j; k < b; k++) y += A2[k];
        var c = C[i][j] + mv[2] + Math.abs(y - r * x) / Math.sqrt(r * x + y + 1);
        if (c < C[a][b]) { C[a][b] = c; B[a][b] = [i, j]; }
      });
    }
    var groups = []; i = m; j = n;
    while (i > 0 || j > 0) { var p = B[i][j]; if (!p) break; groups.unshift([p[0], i, p[1], j]); i = p[0]; j = p[1]; }
    return groups;
  }
  function mkSpan(t) { var d = document.createElement('span'); d.className = 'cps'; d.setAttribute('lang', ALT_LANG()); d.setAttribute('data-t', t); d.setAttribute('aria-hidden', 'true'); return d; }
  var INLINE = /^(A|B|STRONG|EM|I|U|SPAN|MARK|SMALL|SUP|SUB|CODE|Q|CITE)$/;
  /* 在文字節點的 off 處插入；剛好在行內元素的結尾時，跳到該元素外面再插，免得插進連結或畫線裡 */
  function insertAt(node, off, sp, block) {
    if (off < node.nodeValue.length) { var rest = node.splitText(off); rest.parentNode.insertBefore(sp, rest); return; }
    var ref = node;
    while (!ref.nextSibling && ref.parentNode && ref.parentNode !== block && INLINE.test(ref.parentNode.tagName)) ref = ref.parentNode;
    ref.parentNode.insertBefore(sp, ref.nextSibling);
  }
  function sentPair(me, altText) {
    var bounds = mainBounds(me), alts = splitSents(altText, EN());
    if (!bounds.length || !alts.length) return 0;
    var groups = bounds.length === 1 ? [[0, 1, 0, alts.length]] : align(bounds.map(function (b) { return b.text; }), alts);
    var ins = [];
    groups.forEach(function (g) {
      var t = alts.slice(g[2], g[3]).join(EN() ? '' : ' ');
      if (!t) return;
      var at = g[1] > g[0] ? g[1] - 1 : Math.max(0, g[0] - 1);
      if (ins.length && ins[ins.length - 1][0] === at) ins[ins.length - 1][1] += (EN() ? '' : ' ') + t; else ins.push([at, t]);
    });
    for (var k = ins.length - 1; k >= 0; k--) {
      var b = bounds[ins[k][0]], sp = mkSpan(ins[k][1]);
      if (b.unit) { var u = b.unit; while (!u.nextSibling && u.parentNode && u.parentNode !== me && INLINE.test(u.parentNode.tagName)) u = u.parentNode; u.parentNode.insertBefore(sp, u.nextSibling); }
      else if (b.node) insertAt(b.node, b.off, sp, me);
      else me.appendChild(sp);
    }
    return ins.length;
  }
  function css() {
    if (document.getElementById('cparCss')) return;
    var st = document.createElement('style'); st.id = 'cparCss';
    st.textContent = '.cps{display:block;margin:2px 0 8px;padding:1px 0 1px 9px;border-left:3px solid rgba(128,128,128,.42);font-size:.88em;line-height:1.65;opacity:.74;font-weight:400;font-style:normal;letter-spacing:0;text-transform:none;text-align:left;white-space:normal;background:none;cursor:default}'
      + '.cps::before{content:attr(data-t)}h1 .cps,h2 .cps,h3 .cps,h4 .cps{font-weight:600}'
      + '.cparbar{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:6px;margin:6px 0 8px}'
      + '.cparbtn{border:1px solid rgba(128,128,128,.45);background:transparent;color:inherit;border-radius:999px;padding:6px 14px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer}'
      + '.cparbtn.on{border-color:currentColor;box-shadow:inset 0 0 0 1px currentColor}.cpar-st{font-size:12.5px;opacity:.75;margin:0 0 8px;text-align:right}';
    document.head.appendChild(st);
  }
  function btnLabel() { var on = isOn(); return '🌐 ' + T('btn') + (UI() === 'en' ? ': ' : '：') + (on ? T('on') : T('off')); }
  function makeBar() {
    var d = document.createElement('div'); d.className = 'cparbar';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cparbtn' + (isOn() ? ' on' : '');
    b.textContent = btnLabel(); b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); CPAR321.toggle(); };
    d.appendChild(b); return d;
  }
  function syncBtns() {
    var bs = document.querySelectorAll('.cparbtn');
    for (var i = 0; i < bs.length; i++) { bs[i].textContent = btnLabel(); bs[i].classList.toggle('on', isOn()); }
  }
  function status(bar, msg) {
    if (!bar || !bar.parentNode) return;
    var s = bar.nextSibling && bar.nextSibling.className === 'cpar-st' ? bar.nextSibling : null;
    if (!msg) { if (s) s.parentNode.removeChild(s); return; }
    if (!s) { s = document.createElement('div'); s.className = 'cpar-st'; bar.parentNode.insertBefore(s, bar.nextSibling); }
    s.textContent = msg;
  }
  function clearAll() { clearIn(document.body); var st = document.querySelectorAll('.cpar-st'); for (var i = 0; i < st.length; i++) st[i].parentNode.removeChild(st[i]); }

  var ALT = EN() ? 'tc-' : 'en-', AH = {}, AS = {}, BUSY = {};
  function getJ(f, cb) {
    if (BUSY[f]) { BUSY[f].push(cb); return; }
    BUSY[f] = [cb];
    var done = function (j) { var l = BUSY[f]; delete BUSY[f]; l.forEach(function (c) { c(j); }); };
    fetch(f, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(done)['catch'](function () { done(null); });
  }
  function key(st) { return [st.view, st.hall, st.u, st.step, st.depth].join('|'); }
  function after() {
    var P = window.CR321_PAR, st = P.st();
    if (st.view !== 'unit') return;
    var main = document.getElementById('main'), body = document.getElementById('stepBody');
    if (!main || !body) return;
    css();
    var bar = main.querySelector('.cparbar');
    if (!bar) {
      bar = makeBar();
      var rb = document.getElementById('readBtn'), row = rb && rb.parentNode;
      if (row && row.parentNode) row.parentNode.insertBefore(bar, row.nextSibling); else body.parentNode.insertBefore(bar, body);
    }
    if (!isOn()) { clearIn(main); status(bar, ''); return; }
    var h = st.hall, k0 = key(st), ser = st.step === 6;
    var again = function () { var s2 = P.st(); if (key(s2) === k0) after(); };
    if (AH[h] === undefined) {
      status(bar, T('loading'));
      getJ(ALT + h + '.json', function (j) { AH[h] = j || false; again(); }); return;
    }
    if (ser && AS[h] === undefined) {
      status(bar, T('loading'));
      getJ(ALT + h + '-sermon.json', function (j) { AS[h] = j || false; again(); }); return;
    }
    var A = AH[h], idx = -1;
    if (A && A.units) for (var i = 0; i < A.units.length; i++) if (A.units[i].id === st.id) { idx = i; break; }
    if (idx < 0 || (ser && !(AS[h] && AS[h][idx]))) { clearIn(main); status(bar, T('none')); return; }
    var units = []; units[st.u] = A.units[idx];
    var hd = Object.assign({}, A, { units: units }), sd = null;
    if (ser) { sd = []; sd[st.u] = AS[h][idx]; }
    var html = null;
    try { html = P.alt(hd, sd); } catch (e) { html = null; }
    if (!html) { status(bar, T('none')); return; }
    var box = document.createElement('div'); box.innerHTML = html;
    var uh = main.querySelector('.uhead'), auh = box.querySelector('.uhead'), asb = box.querySelector('#stepBody');
    if (uh && auh) pairInto(uh, auh.innerHTML, '.tags');
    pairInto(body, asb ? asb.innerHTML : null, '.dtag,.chip,.lbl,cite,details,.simnote,.sim,.quiz,.sharebox');
    status(bar, '');
  }
  window.CPAR321 = {
    after: after,
    toggle: function () {
      setOn(!isOn()); syncBtns();
      if (!isOn()) { clearAll(); return; }
      try { after(); } catch (e) {}
    },
    _pair: pairInto
  };
  try { after(); } catch (e) {}
})();
