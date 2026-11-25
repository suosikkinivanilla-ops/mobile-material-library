const app = document.querySelector('#app');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const storageKey = 'xinshi-materials-taken-v1';
let data, account = '全部', category = '全部', query = '', batch = '全部', activeTab = 'copy', homeScroll = 0, previousRoute = '', toastTimer;
let taken = new Set();
try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(saved)) taken = new Set(saved.filter(x => typeof x === 'string')); } catch {}
const e = escape;
const noteUrl = note => `#note/${note.id}`;
const imageUrl = (note, index) => `${noteUrl(note)}/photo/${index + 1}`;
const mb = bytes => bytes < 1000000 ? `${Math.round(bytes / 1000)} KB` : `${(bytes / 1000000).toFixed(1)} MB`;
function toast(text) {
  const box = document.querySelector('#toast'); box.textContent = text; box.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('visible'), 2500);
}
function saveTaken(id, checked) {
  checked ? taken.add(id) : taken.delete(id);
  try { localStorage.setItem(storageKey, JSON.stringify([...taken])); toast(checked ? '已标记取用 · 仅保存在当前浏览器' : '已取消标记'); }
  catch { toast('本次已标记；浏览器未允许保存记录'); }
}
async function copy(text) {
  try { if (!navigator.clipboard?.writeText) throw new Error('unavailable'); await navigator.clipboard.writeText(text); toast('已复制，可以去粘贴了'); }
  catch {
    const dialog = document.querySelector('#copy-dialog'), field = document.querySelector('#manual-copy');
    field.value = text; dialog.showModal(); field.focus(); field.select(); field.setSelectionRange(0, text.length);
  }
}
function renderHome() {
  document.title = '心事来信 · 素材领取';
  const totalImages = data.notes.reduce((sum, n) => sum + n.images.length, 0);
  const categories = ['全部', ...new Set(data.notes.map(n => n.category))];
  app.innerHTML = `<section class="hero"><div><div class="eyebrow">内容素材库</div><h1>素材领取</h1><p>先选账号，再找需要的文案和图片。</p></div><div class="inventory"><div><strong>${data.notes.length}</strong><span>条素材</span></div><div><strong>${totalImages}</strong><span>张图片</span></div></div></section>
    <div class="account-filters" role="group" aria-label="按账号筛选">${[['全部','全部素材'],['秀场笔记','秀场账号'],['心事来信','心事来信']].map(([value,label]) => `<button class="account-chip" data-account="${value}" aria-pressed="${account === value}">${label}</button>`).join('')}</div>
    <div class="toolbar"><label class="search-wrap"><span aria-hidden="true">⌕</span><input type="search" id="search" aria-label="搜索素材" placeholder="搜标题、人物或关键词" value="${e(query)}"></label><select id="batch" aria-label="按素材批次筛选"><option value="全部">全部批次</option>${[...data.batches].sort((a, b) => b.date.localeCompare(a.date)).map(b => `<option value="${e(b.id)}" ${batch === b.id ? 'selected' : ''}>${e(b.date)} · ${e(b.label)}</option>`).join('')}</select></div>
    <div class="filters" role="group" aria-label="按内容类型筛选">${categories.map(c => `<button class="chip" data-filter="${e(c)}" aria-pressed="${category === c}">${e(c)}</button>`).join('')}<button class="chip" data-filter="未取用" aria-pressed="${category === '未取用'}">未取用</button></div>
    <div class="section-caption"><span id="result-count"></span><span>按日期从新到旧</span></div><div id="notes"></div>
    <footer class="footnote">收藏这个页面，以后新素材也放在这里。<br>取用标记只保存在当前浏览器，不代表已经发布。<br>这里领取的是笔记素材，测试入口仍用对应商品卡。</footer>`;
  document.querySelector('#search').addEventListener('input', event => { query = event.target.value; renderCards(); });
  document.querySelector('#batch').addEventListener('change', event => { batch = event.target.value; renderCards(); });
  for (const button of document.querySelectorAll('[data-account]')) button.addEventListener('click', () => {
    account = button.dataset.account;
    batch = '全部';
    category = '全部';
    document.querySelector('#batch').value = '全部';
    const accountNotes = data.notes.filter(n => account === '全部' || (account === '秀场笔记' ? n.product === '秀场笔记' : n.product !== '秀场笔记'));
    const accountCategories = new Set(accountNotes.map(n => n.category));
    document.querySelectorAll('[data-filter]').forEach(b => {
      b.setAttribute('aria-pressed', b.dataset.filter === category);
      b.hidden = !['全部', '未取用'].includes(b.dataset.filter) && !accountCategories.has(b.dataset.filter);
    });
    document.querySelectorAll('[data-account]').forEach(b => b.setAttribute('aria-pressed', b.dataset.account === account));
    renderCards();
  });
  for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => {
    category = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', b.dataset.filter === category));
    renderCards();
  });
  renderCards();
}
function renderCards() {
  const q = query.trim().toLowerCase();
  const filtered = data.notes.filter(n => (account === '全部' || (account === '秀场笔记' ? n.product === '秀场笔记' : n.product !== '秀场笔记')) && (batch === '全部' || n.batch === batch) && (category === '全部' || (category === '未取用' ? !taken.has(n.id) : n.category === category)) && (!q || `${n.title} ${n.body} ${n.category} ${n.product}`.toLowerCase().includes(q))).sort((a, b) => b.date.localeCompare(a.date));
  document.querySelector('#result-count').textContent = `${filtered.length} 条素材 · ${filtered.reduce((sum, n) => sum + n.images.length, 0)} 张图片`;
  const dates = [...new Set(filtered.map(n => n.date))];
  document.querySelector('#notes').innerHTML = filtered.length ? dates.map(date => `<section class="date-group"><h2 class="date-heading">${e(date)}</h2><div class="note-grid">${filtered.filter(n => n.date === date).map(n => `<article class="note-card"><a class="card-art" href="${noteUrl(n)}" aria-label="领取：${e(n.title)}"><img src="${n.images[0].thumb}" width="${n.images[0].width}" height="${n.images[0].height}" loading="lazy" decoding="async" alt="${e(n.title)}封面"><span class="card-count">${n.images.length} 张配图</span></a><div class="card-body"><div class="card-meta"><span class="card-category">${e(n.category)}</span><time datetime="${e(n.date)}">${e(n.date.slice(5).replace('-', '.'))}</time></div><h2><a href="${noteUrl(n)}">${e(n.title)}</a></h2><div class="card-bottom"><a class="card-open" href="${noteUrl(n)}">${n.category === '主页素材' ? '领取头像与背景' : '领取文案与配图'}</a>${taken.has(n.id) ? '<span class="taken-badge">已取用 ✓</span>' : ''}</div></div></article>`).join('')}</div></section>`).join('') : '<p class="empty">没有找到这类素材。试试其他关键词或筛选条件。</p>';
}
function renderNote(note) {
  document.title = `${note.title} · 心事来信`;
  const profile = note.category === '主页素材';
  const headingDetail = profile ? e(note.body) : `正文、作者评论和 ${note.images.length} 张配图，都在这里。`;
  const noteTabs = profile ? '' : `<div class="note-tabs" role="tablist" aria-label="素材内容"><button id="copy-tab" role="tab" aria-selected="${activeTab === 'copy'}" aria-controls="note-panel">复制文案</button><button id="images-tab" role="tab" aria-selected="${activeTab === 'images'}" aria-controls="note-panel">领取配图 · ${note.images.length}</button></div>`;
  const panelLabel = profile ? '' : ` role="tabpanel" aria-labelledby="${activeTab === 'copy' ? 'copy-tab' : 'images-tab'}"`;
  app.innerHTML = `<nav class="breadcrumb"><a href="#" class="quiet">返回素材库</a><label class="taken-toggle"><input id="taken" type="checkbox" ${taken.has(note.id) ? 'checked' : ''}>已取用</label></nav><section class="detail-heading"><div class="detail-meta">${e(note.date)} · ${e(note.product)} · ${e(note.category)}</div><h1>${e(note.title)}</h1><p class="detail-meta">${headingDetail}</p></section>${noteTabs}<section id="note-panel"${panelLabel}></section>`;
  document.querySelector('#taken').addEventListener('change', event => saveTaken(note.id, event.target.checked));
  document.querySelector('#copy-tab')?.addEventListener('click', () => { activeTab = 'copy'; renderNote(note); });
  document.querySelector('#images-tab')?.addEventListener('click', () => { activeTab = 'images'; renderNote(note); });
  const panel = document.querySelector('#note-panel');
  if (!profile && activeTab === 'copy') {
    panel.innerHTML = `<div class="detail-layout"><div><section class="text-sheet"><div class="sheet-top"><h2>标题</h2><button data-copy="title">复制标题</button></div><p class="copy-text copy-title">${e(note.title)}</p></section><section class="text-sheet"><div class="sheet-top"><h2>正文与话题</h2><button data-copy="body">复制正文</button></div><div class="copy-text">${e(note.body)}</div></section><section class="text-sheet"><div class="sheet-top"><h2>作者评论</h2><button data-copy="comment">复制评论</button></div><div class="copy-text">${e(note.comment)}</div></section></div><aside class="aside-card"><h2>这一条，怎么发</h2><p>复制标题和正文，按顺序上传配图。</p><p>作者评论单独复制，在笔记发布后发送。</p>${(note.body.includes("本篇商品卡") || note.comment.includes("本篇商品卡")) ? '<p>文案里的「本篇商品卡」，请在挂好第一款理想型测试商品后使用。</p>' : ''}<img class="aside-cover" src="${note.images[0].thumb}" alt="本条封面预览"></aside></div><div class="copy-dock"><button class="primary" data-copy="all">复制标题＋正文</button><button class="secondary" id="show-images">查看 ${note.images.length} 张配图</button></div>`;
    document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', () => copy(button.dataset.copy === 'all' ? `${note.title}\n\n${note.body}` : note[button.dataset.copy])));
    document.querySelector('#show-images').addEventListener('click', () => { activeTab = 'images'; renderNote(note); window.scrollTo(0, 0); });
  } else {
    const imageIntro = profile ? '' : '<p class="image-intro">按下方顺序上传。点「打开大图保存」后，长按图片存到手机相册。<br>这里先显示小预览，大图点开才加载。</p>';
    panel.innerHTML = `${imageIntro}<div class="image-grid">${note.images.map((im, i) => `<figure class="image-tile"><a href="${imageUrl(note, i)}" aria-label="查看第${i + 1}张大图"><img src="${im.thumb}" width="${im.width}" height="${im.height}" loading="lazy" decoding="async" alt="第${i + 1}张：${e(im.label)}"></a><figcaption><span>${profile ? e(im.label) : `第 ${i + 1} 张 / ${note.images.length}`}</span><span class="image-size">${im.width} × ${im.height}</span></figcaption><a class="secondary" href="${imageUrl(note, i)}">打开大图保存</a></figure>`).join('')}</div><p class="footnote">原始 PNG 与高清 JPG 都可领取。<br>如果长按没有菜单，用 Safari 或手机系统浏览器打开本页再试。</p>`;
  }
}
function renderImage(note, index) {
  const im = note.images[index];
  document.title = `第${index + 1}张 · ${note.title}`;
  app.innerHTML = `<div class="viewer"><nav class="breadcrumb"><a class="quiet" href="${noteUrl(note)}">返回这条笔记</a><span class="detail-meta">${index + 1} / ${note.images.length}</span></nav><div class="viewer-heading"><h1>${e(im.label.replace(/^\d+-\d+-/, ''))}</h1><span class="image-size">${im.width} × ${im.height}</span></div><p class="viewer-tip">长按下面的图片，选择「存储图像」或「保存图片」。</p><img id="full-image" class="full-image" src="${im.full}" width="${im.width}" height="${im.height}" alt="${e(im.label)}高清配图"><p id="image-error" hidden>图片加载失败，请返回后重试，或使用下方原始 PNG 链接。</p><div class="viewer-actions"><a class="primary" href="${im.full}" download="心事来信-${note.id}-${index + 1}.jpg">下载高清 JPG</a><a class="secondary" href="${im.original}" target="_blank" rel="noopener">打开原始 PNG</a></div><p class="detail-meta">高清 JPG ${mb(im.bytes)} · 原始 PNG ${mb(im.originalBytes)}</p><nav class="viewer-nav" aria-label="图片翻页">${index ? `<a href="${imageUrl(note, index - 1)}">上一张</a>` : '<span class="placeholder"></span>'}<a href="${noteUrl(note)}">全部配图</a>${index < note.images.length - 1 ? `<a href="${imageUrl(note, index + 1)}">下一张</a>` : '<span class="placeholder"></span>'}</nav><p class="footnote">「下载」可能保存到手机的文件目录；要放进相册，请长按图片保存。原始 PNG 会在新页面打开，文件较大，按需领取。</p></div>`;
  document.querySelector('#full-image').addEventListener('error', () => { document.querySelector('#image-error').hidden = false; });
}
function route() {
  if (!data) return;
  const hash = location.hash;
  if ((!previousRoute || previousRoute === '#') && hash.startsWith('#note/')) homeScroll = window.scrollY;
  const parts = hash.slice(1).split('/');
  const note = parts[0] === 'note' ? data.notes.find(n => n.id === parts[1]) : null;
  if (note) {
    if (parts[2] === 'photo') {
      const index = Number(parts[3]) - 1;
      if (Number.isInteger(index) && index >= 0 && index < note.images.length) { activeTab = 'images'; renderImage(note, index); }
      else { activeTab = 'images'; renderNote(note); toast('这张图片不存在，已显示本条全部配图'); }
    } else {
      if (!previousRoute.startsWith(`#note/${note.id}`)) activeTab = 'copy';
      renderNote(note);
    }
    window.scrollTo(0, 0);
  } else { renderHome(); if (hash && hash !== '#') toast('这条素材暂未找到'); requestAnimationFrame(() => window.scrollTo(0, homeScroll)); }
  previousRoute = hash;
}
document.querySelector('#close-copy').addEventListener('click', () => document.querySelector('#copy-dialog').close());
window.addEventListener('hashchange', route);
try {
  const response = await fetch('materials.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  data = await response.json(); route();
} catch {
  app.innerHTML = '<div class="loading"><h1>素材暂时没打开</h1><p>请检查网络后再试，已经保存的原图不会丢失。</p><button id="retry" class="primary">重新加载</button></div>';
  document.querySelector('#retry').addEventListener('click', () => location.reload());
}
