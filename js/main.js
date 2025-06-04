// ❶ 直接导入 JSON，Vite 会在打包时把它们当作模块打包进最终的 JS
import content from 'https://cdn.jsdelivr.net/gh/Plum628/shuttle@latest/assets/content.json';
import textsJson from 'https://cdn.jsdelivr.net/gh/Plum628/shuttle@latest/assets/texts.json';

// ❷ 渲染函数，与之前保持一致，唯一不同：
//     loadContent()/loadTexts() 的逻辑已去掉，直接使用 import 进来的 content 和 textsJson
function render(selectedLangCode, content) {
  const spritePath = content.icon_sprite;

  // ❸ 下面这些常量拼接 <svg><use xlink:href="..."></use></svg>
  const USE_YOUTUBE = `<svg class="icon"><use xlink:href="${spritePath}#icon-youtube"></use></svg>`;
  const USE_BILIBILI = `<svg class="icon"><use xlink:href="${spritePath}#icon-bilibili"></use></svg>`;
  const USE_QQ = `<svg class="icon"><use xlink:href="${spritePath}#icon-qq"></use></svg>`;
  const USE_QQ_CHANNEL = `<svg class="icon"><use xlink:href="${spritePath}#icon-qq-channel"></use></svg>`;
  const USE_DISCORD = `<svg class="icon"><use xlink:href="${spritePath}#icon-discord"></use></svg>`;

  // ❹ 取短语言码，用于在 JSON 里索引
  const shortLang = selectedLangCode.startsWith('zh') ? 'zh' : 'en';
  document.documentElement.lang = selectedLangCode;
  const t = textsJson[shortLang];

  // ❺ 更新 <title>
  document.title = t['Title'];

  // ❻ 动态注入字体
  const fontFace = document.createElement('style');
  fontFace.textContent = `
    @font-face {
      font-family: 'PvZ2Regular';
      src: url('${content.font}') format('truetype');
    }
  `;
  document.head.appendChild(fontFace);

  // ❼ 背景、logo、icon
  document.body.style.setProperty('--bg-image', `url('${content.background}')`);
  const logoEl = document.getElementById('game-title-logo');
  logoEl.src = content.logo;
  logoEl.alt = t['Title'];
  document.getElementById('game-icon').src = content.icon;

  // ❽ 版本信息&下载标题
  document.getElementById('version').textContent = t['Version'];
  document.getElementById('title-download').textContent = t['Download'];

  // ❾ 渲染预告片
  const trailerContainer = document.getElementById('trailer-container');
  trailerContainer.innerHTML = '';
  const autoPlay = content['auto-play-trailers'] ? '1' : '0';
  const autoMute = content['auto-mute-trailers'] ? '1' : '0';

  content.trailers[shortLang].forEach((link) => {
    const wrap = document.createElement('div');
    wrap.className = 'video-container';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('allow', 'autoplay; fullscreen');
    iframe.setAttribute('frameborder', '0');

    if (shortLang === 'zh') {
      // B 站链接处理：提取 bvid
      const bvid = link.split('BV')[1];
      iframe.src = `//player.bilibili.com/player.html?bvid=BV${bvid}&high_quality=1&autoplay=${autoPlay}&muted=${autoMute}`;
    } else {
      // YouTube 链接：提取 vid
      const vid = link.split('v=')[1].split('&')[0];
      iframe.src = `https://www.youtube.com/embed/${vid}?rel=0&autoplay=${autoPlay}&mute=${autoMute}`;
    }

    wrap.appendChild(iframe);
    trailerContainer.appendChild(wrap);
  });
  document.getElementById('title-trailer').textContent = t['Trailers'];

  // ⓫ 渲染下载按钮
  const dlContainer = document.getElementById('downloads');
  dlContainer.innerHTML = '';
  const regionKey = shortLang === 'zh' ? 'cn' : 'en';
  const linksToShow = content.downloads[regionKey] || [];
  linksToShow.forEach((link, i) => {
    const a = document.createElement('a');
    a.href = link;
    a.textContent = t[`Download-${regionKey}-${i + 1}`];
    a.target = '_blank';
    a.className = 'adaptive-btn';
    dlContainer.appendChild(a);
  });

  // ⓬ 渲染开发者 & 频道
  const devContainer = document.getElementById('developers');
  devContainer.innerHTML = '';

  content.developers.bilibili.forEach((url, i) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.className = 'adaptive-btn';
    a.innerHTML = USE_BILIBILI + t[`Bilibili${i + 1}`];
    devContainer.appendChild(a);
  });
  content.developers.youtube.forEach((url, i) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.className = 'adaptive-btn';
    a.innerHTML = USE_YOUTUBE + t[`YouTube${i + 1}`];
    devContainer.appendChild(a);
  });
  document.getElementById('title-developers').textContent = t['Developers'];

  // ⓭ 渲染社区
  const grpContainer = document.getElementById('groups');
  grpContainer.innerHTML = '';

  // QQ 群
  Object.entries(content.social.qq_groups).forEach(([_, url], i) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.className = 'adaptive-btn';
    a.innerHTML = USE_QQ + t[`QQGroup${i + 1}`];
    grpContainer.appendChild(a);
  });

  // QQ 频道
  const qqChannelButton = document.createElement('a');
  qqChannelButton.href = content.social.qq_channel;
  qqChannelButton.target = '_blank';
  qqChannelButton.className = 'adaptive-btn';
  qqChannelButton.innerHTML = USE_QQ_CHANNEL + t['QQChannel'];
  grpContainer.appendChild(qqChannelButton);

  // Discord
  const discordButton = document.createElement('a');
  discordButton.href = content.social.discord;
  discordButton.target = '_blank';
  discordButton.className = 'adaptive-btn';
  discordButton.innerHTML = USE_DISCORD + t['Discord'];
  grpContainer.appendChild(discordButton);
  document.getElementById('title-community').textContent = t['Community'];
}

// ⓮ 获取 URL 中的 ?lang= 参数
function getUrlLangParam() {
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get('lang');
  if (!langParam) return null;
  return langParam.startsWith('zh') ? 'zh-CN' : 'en-US';
}

// ⓯ 程序入口：直接使用 import 进来的 JSON，省去 fetch
document.addEventListener('DOMContentLoaded', () => {
  const urlLang = getUrlLangParam();
  const browserLang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const initialLang = urlLang || browserLang;

  // 设置下拉框的值
  document.getElementById('lang-select').value = initialLang;
  // 第一次渲染
  render(initialLang, content);

  // 监听语言切换
  document.getElementById('lang-select').addEventListener('change', (e) => {
    const newLang = e.target.value;
    history.replaceState(null, '', '/?lang=' + newLang);
    render(newLang, content);
  });
});
// ❶ 直接导入 JSON，Vite 会在打包时把它们当作模块打包进最终的 JS
import content from 'https://cdn.jsdelivr.net/gh/Plum628/shuttle@latest/assets/content.json';
import textsJson from 'https://cdn.jsdelivr.net/gh/Plum628/shuttle@latest/assets/texts.json';

// ❷ 渲染函数，与之前保持一致，唯一不同：
//     loadContent()/loadTexts() 的逻辑已去掉，直接使用 import 进来的 content 和 textsJson
function render(selectedLangCode, content) {
  const spritePath = content.icon_sprite;

  // ❸ 下面这些常量拼接 <svg><use xlink:href="..."></use></svg>
  const USE_YOUTUBE = `<svg class="icon"><use xlink:href="${spritePath}#icon-youtube"></use></svg>`;
  const USE_BILIBILI = `<svg class="icon"><use xlink:href="${spritePath}#icon-bilibili"></use></svg>`;
  const USE_QQ = `<svg class="icon"><use xlink:href="${spritePath}#icon-qq"></use></svg>`;
  const USE_QQ_CHANNEL = `<svg class="icon"><use xlink:href="${spritePath}#icon-qq-channel"></use></svg>`;
  const USE_DISCORD = `<svg class="icon"><use xlink:href="${spritePath}#icon-discord"></use></svg>`;

  // ❹ 取短语言码，用于在 JSON 里索引
  const shortLang = selectedLangCode.startsWith('zh') ? 'zh' : 'en';
  document.documentElement.lang = selectedLangCode;
  const t = textsJson[shortLang];

  // ❺ 更新 <title>
  document.title = t['Title'];

  // ❻ 动态注入字体
  const fontFace = document.createElement('style');
  fontFace.textContent = `
    @font-face {
      font-family: 'PvZ2Regular';
      src: url('${content.font}') format('truetype');
    }
  `;
  document.head.appendChild(fontFace);

  // ❼ 背景、logo、icon
  document.body.style.setProperty('--bg-image', `url('${content.background}')`);
  const logoEl = document.getElementById('game-title-logo');
  logoEl.src = content.logo;
  logoEl.alt = t['Title'];
  document.getElementById('game-icon').src = content.icon;

  // ❽ 版本信息&下载标题
  document.getElementById('version').textContent = t['Version'];
  document.getElementById('title-download').textContent = t['Download'];

  // ❾ 渲染预告片
  const trailerContainer = document.getElementById('trailer-container');
  trailerContainer.innerHTML = '';
  const autoPlay = content['auto-play-trailers'] ? '1' : '0';
  const autoMute = content['auto-mute-trailers'] ? '1' : '0';

  content.trailers[shortLang].forEach((link) => {
    const wrap = document.createElement('div');
    wrap.className = 'video-container';
    const iframe = document.createElement('iframe');
    iframe.setAttribute('allow', 'autoplay; fullscreen');
    iframe.setAttribute('frameborder', '0');

    if (shortLang === 'zh') {
      // B 站链接处理：提取 bvid
      const bvid = link.split('BV')[1];
      iframe.src = `//player.bilibili.com/player.html?bvid=BV${bvid}&high_quality=1&autoplay=${autoPlay}&muted=${autoMute}`;
    } else {
      // YouTube 链接：提取 vid
      const vid = link.split('v=')[1].split('&')[0];
      iframe.src = `https://www.youtube.com/embed/${vid}?rel=0&autoplay=${autoPlay}&mute=${autoMute}`;
    }

    wrap.appendChild(iframe);
    trailerContainer.appendChild(wrap);
  });
  document.getElementById('title-trailer').textContent = t['Trailers'];

  // ⓫ 渲染下载按钮
  const dlContainer = document.getElementById('downloads');
  dlContainer.innerHTML = '';
  const regionKey = shortLang === 'zh' ? 'cn' : 'en';
  const linksToShow = content.downloads[regionKey] || [];
  linksToShow.forEach((link, i) => {
    const a = document.createElement('a');
    a.href = link;
    a.textContent = t[`Download-${regionKey}-${i + 1}`];
    a.target = '_blank';
    a.className = 'adaptive-btn';
    dlContainer.appendChild(a);
  });

  // ⓬ 渲染开发者 & 频道
  const devContainer = document.getElementById('developers');
  devContainer.innerHTML = '';

  content.developers.bilibili.forEach((url, i) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.className = 'adaptive-btn';
    a.innerHTML = USE_BILIBILI + t[`Bilibili${i + 1}`];
    devContainer.appendChild(a);
  });
  content.developers.youtube.forEach((url, i) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.className = 'adaptive-btn';
    a.innerHTML = USE_YOUTUBE + t[`YouTube${i + 1}`];
    devContainer.appendChild(a);
  });
  document.getElementById('title-developers').textContent = t['Developers'];

  // ⓭ 渲染社区
  const grpContainer = document.getElementById('groups');
  grpContainer.innerHTML = '';

  // QQ 群
  Object.entries(content.social.qq_groups).forEach(([_, url], i) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.className = 'adaptive-btn';
    a.innerHTML = USE_QQ + t[`QQGroup${i + 1}`];
    grpContainer.appendChild(a);
  });

  // QQ 频道
  const qqChannelButton = document.createElement('a');
  qqChannelButton.href = content.social.qq_channel;
  qqChannelButton.target = '_blank';
  qqChannelButton.className = 'adaptive-btn';
  qqChannelButton.innerHTML = USE_QQ_CHANNEL + t['QQChannel'];
  grpContainer.appendChild(qqChannelButton);

  // Discord
  const discordButton = document.createElement('a');
  discordButton.href = content.social.discord;
  discordButton.target = '_blank';
  discordButton.className = 'adaptive-btn';
  discordButton.innerHTML = USE_DISCORD + t['Discord'];
  grpContainer.appendChild(discordButton);
  document.getElementById('title-community').textContent = t['Community'];
}

// ⓮ 获取 URL 中的 ?lang= 参数
function getUrlLangParam() {
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get('lang');
  if (!langParam) return null;
  return langParam.startsWith('zh') ? 'zh-CN' : 'en-US';
}

// ⓯ 程序入口：直接使用 import 进来的 JSON，省去 fetch
document.addEventListener('DOMContentLoaded', () => {
  const urlLang = getUrlLangParam();
  const browserLang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const initialLang = urlLang || browserLang;

  // 设置下拉框的值
  document.getElementById('lang-select').value = initialLang;
  // 第一次渲染
  render(initialLang, content);

  // 监听语言切换
  document.getElementById('lang-select').addEventListener('change', (e) => {
    const newLang = e.target.value;
    history.replaceState(null, '', '/?lang=' + newLang);
    render(newLang, content);
  });
});