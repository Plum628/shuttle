// 将 render 函数从这里导出，以便 news.js 可以调用它
export function render(selectedLangCode, textsJson, config, iconsModule) { // 接收 textsJson, config, iconsModule
  const USE_YOUTUBE      = iconsModule.ICON_YOUTUBE;
  const USE_BILIBILI     = iconsModule.ICON_BILIBILI;
  const USE_QQ           = iconsModule.ICON_QQ;
  const USE_QQ_CHANNEL   = iconsModule.ICON_QQ_CHANNEL;
  const USE_DISCORD      = iconsModule.ICON_DISCORD;

  const shortLang = selectedLangCode.startsWith('zh') ? 'zh' : 'en';
  document.documentElement.lang = selectedLangCode;
  const t = textsJson[shortLang];

  // resolvePath 函数用于处理 config 中那些需要根据 useCdn 判断的资源
  function resolvePath(p) {
    if (!p) return '';
    if (config.useCdn) {
      return new URL(p.replace(/^\/+/, ''), config.cdnBase).toString();
    } else {
      return new URL(p.replace(/^\/+/, ''), window.location.origin).toString();
    }
  }

  // 更新页面标题
  document.title = t['Title'];

  // 字体样式
  let fontFaceStyle = document.getElementById('pvz2-font-style');
  if (!fontFaceStyle) {
      fontFaceStyle = document.createElement('style');
      fontFaceStyle.id = 'pvz2-font-style';
      document.head.appendChild(fontFaceStyle);
  }
  fontFaceStyle.textContent = `
    @font-face {
      font-family: 'PvZ2Regular';
      src: url('${resolvePath(config.font)}') format('woff2');
    }
  `;

  // 背景和Logo
  document.body.style.setProperty('--bg-image', `url('${resolvePath(config.background)}')`);
  const logoEl = document.getElementById('game-title-logo');
  if (logoEl) { // 确保元素存在
      logoEl.src = resolvePath(config.logo);
      logoEl.alt = t['Title'];
  }
  const gameIconEl = document.getElementById('game-icon');
  if (gameIconEl) { // 确保元素存在
      gameIconEl.src = resolvePath(config.icon);
  }

  // 导航栏按钮
  const homeBtn = document.getElementById('home-btn');
  const newsBtn = document.getElementById('news-btn');
  
  if (homeBtn) { // 确保元素存在
    homeBtn.textContent = t['NavbarHome'];
    homeBtn.setAttribute('aria-label', t['NavbarHome']);
  }
  if (newsBtn) { // 确保元素存在
    newsBtn.textContent = t['NavbarNews'];
    newsBtn.setAttribute('aria-label', t['NavbarNews']);
  }

  // 导航栏激活状态
  const currentPath = window.location.pathname;
  if (homeBtn) homeBtn.classList.remove('active');
  if (newsBtn) newsBtn.classList.remove('active');

  if (currentPath === '/' || currentPath.endsWith('/index.html')) {
    if (homeBtn) homeBtn.classList.add('active');
  } else if (currentPath.endsWith('/news.html')) {
    if (newsBtn) newsBtn.classList.add('active');
  }

  // 主页特定元素 (添加空值检查)
  const versionEl = document.getElementById('version');
  if (versionEl) {
      versionEl.textContent = t['Version'];
  }

  const titleDownloadEl = document.getElementById('title-download');
  if (titleDownloadEl) {
      titleDownloadEl.textContent = t['Download'];
  }

  // 预告片部分
  const trailerContainer = document.getElementById('trailer-container');
  if (trailerContainer) { // 仅当容器存在时才渲染
      trailerContainer.innerHTML = '';
      const autoPlay = config['autoPlayTrailers'] ? '1' : '0';
      const autoMute = config['autoMuteTrailers'] ? '1' : '0';

      config.trailers[shortLang].forEach((link) => {
        const wrap = document.createElement('div');
        wrap.className = 'video-container';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('allow', 'autoplay; fullscreen');
        iframe.setAttribute('frameborder', '0');

        if (link.includes('bilibili.com')) {
          const bvid = link.split('BV')[1].split('/')[0];
          iframe.src = `//player.bilibili.com/player.html?bvid=BV${bvid}&high_quality=1&autoplay=${autoPlay}&muted=${autoMute}`;
        } else if (link.includes('youtube.com') || link.includes('youtu.be')) { // 更通用的 YouTube URL 检测
          let vid;
          const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
          const match = link.match(youtubeRegex);
          if (match && match[1]) {
            vid = match[1];
          } else {
            console.warn('Could not extract YouTube video ID from link:', link);
            return;
          }
          // 使用正确的 YouTube 嵌入 URL 格式
          iframe.src = `https://www.youtube.com/embed/${vid}?rel=0&autoplay=${autoPlay}&mute=${autoMute}`;
        } else {
          console.warn('Unsupported video link type:', link);
          return;
        }

        wrap.appendChild(iframe);
        trailerContainer.appendChild(wrap);
      });
      const titleTrailerEl = document.getElementById('title-trailer');
      if(titleTrailerEl) {
          titleTrailerEl.textContent = t['Trailers'];
      }
  }


  // 下载部分
  const dlContainer = document.getElementById('downloads');
  if (dlContainer) { // 仅当容器存在时才渲染
      dlContainer.innerHTML = '';
      const regionKey = shortLang === 'zh' ? 'cn' : 'en';
      const linksToShow = config.downloads[regionKey] || [];
      linksToShow.forEach((link, i) => {
        const a = document.createElement('a');
        a.href = link;
        a.textContent = t[`Download-${regionKey}-${i+1}`];
        a.target = '_blank';
        a.className = 'adaptive-btn';
        dlContainer.appendChild(a);
      });
  }


  // 开发者部分
  const devContainer = document.getElementById('developers');
  if (devContainer) { // 仅当容器存在时才渲染
      devContainer.innerHTML = '';

      config.developers.bilibili.forEach((url, i) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.className = 'adaptive-btn';
        a.innerHTML = USE_BILIBILI + t[`Bilibili${i+1}`];
        devContainer.appendChild(a);
      });
      config.developers.youtube.forEach((url, i) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.className = 'adaptive-btn';
        a.innerHTML = USE_YOUTUBE + t[`YouTube${i+1}`];
        devContainer.appendChild(a);
      });
      const titleDevelopersEl = document.getElementById('title-developers');
      if (titleDevelopersEl) {
          titleDevelopersEl.textContent = t['Developers'];
      }
  }


  // 社区与社交部分
  const grpContainer = document.getElementById('groups');
  if (grpContainer) { // 仅当容器存在时才渲染
      grpContainer.innerHTML = '';

      Object.entries(config.social.qq_groups).forEach(([_, url], i) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.className = 'adaptive-btn';
        a.innerHTML = USE_QQ + t[`QQGroup${i+1}`];
        grpContainer.appendChild(a);
      });

      const qqChannelButton = document.createElement('a');
      qqChannelButton.href = config.social.qq_channel;
      qqChannelButton.target = '_blank';
      qqChannelButton.className = 'adaptive-btn';
      qqChannelButton.innerHTML = USE_QQ_CHANNEL + t['QQChannel'];
      grpContainer.appendChild(qqChannelButton);

      const discordButton = document.createElement('a');
      discordButton.href = config.social.discord;
      discordButton.target = '_blank';
      discordButton.className = 'adaptive-btn';
      discordButton.innerHTML = USE_DISCORD + t['Discord'];
      grpContainer.appendChild(discordButton);
      const titleCommunityEl = document.getElementById('title-community');
      if (titleCommunityEl) {
          titleCommunityEl.textContent = t['Community'];
      }
  }
} // End of render function


export async function init(config, textsJsonPath, iconsJsPath, styleCssPath) {
  // *** 关键改动1: 获取当前语言 ***
  const urlParams = new URLSearchParams(window.location.search);
  let currentLang = urlParams.get('lang');
  if (!currentLang) {
    currentLang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  }
  const currentLangShort = currentLang.startsWith('zh') ? 'zh' : 'en';

  const textsResponse = await fetch(new URL(textsJsonPath, window.location.origin));
  const textsJson = await textsResponse.json();
  const t = textsJson[currentLangShort]; // 确保这里获取正确的短语言文本

  // 设置导航栏文本
  const homeBtn = document.getElementById('home-btn');
  const newsBtn = document.getElementById('news-btn');

  if (homeBtn) homeBtn.textContent = t['Home'];
  if (newsBtn) newsBtn.textContent = t['News'];
  
  // *** 关键改动：更新导航栏高亮逻辑，移除 textDecoration 样式设置 ***
  const currentPath = window.location.pathname;
  const navButtons = {
    'home-btn': '/',
    'news-btn': '/news/' // 将新闻链接目标改为 /news/
  };

  for (const btnId in navButtons) {
    const btn = document.getElementById(btnId);
    if (btn) {
      // 移除所有按钮的 active 状态，让 CSS 控制样式
      btn.classList.remove('active');
      // 移除这一行：btn.style.textDecoration = 'none'; // 这是之前我错误添加的

      const targetPath = navButtons[btnId];
      // 对于新闻按钮，检查当前路径是否以 /news/ 开头
      if (btnId === 'news-btn') {
        // 如果当前路径以 /news/ 开头，或者当前路径是 /news.html (兼容旧链接，虽然现在重写了，但保留更安全)
        if (currentPath.startsWith(targetPath) || currentPath === '/news.html') {
          btn.classList.add('active');
          // 移除这一行：btn.style.textDecoration = 'underline'; // 这是之前我错误添加的
        }
      } else if (currentPath === targetPath || (btnId === 'home-btn' && currentPath === '/index.html')) { // 对于其他按钮（如首页），精确匹配
        btn.classList.add('active');
        // 移除这一行：btn.style.textDecoration = 'underline'; // 这是之前我错误添加的
      }
    }
  }

  // 确保 icons.js 从网站根目录加载
  const iconsModule = await import(new URL(iconsJsPath, window.location.origin));

  // resolvePath 函数用于处理 config 中那些需要根据 useCdn 判断的资源
  function resolvePath(p) {
    if (!p) return '';
    if (config.useCdn) {
      return new URL(p.replace(/^\/+/, ''), config.cdnBase).toString();
    } else {
      // 这里的 window.location.origin 确保从网站根目录解析
      return new URL(p.replace(/^\/+/, ''), window.location.origin).toString();
    }
  }

  // 使用 styleCssPath 参数
  if (styleCssPath) {
      const existingLink = document.querySelector(`link[href="${resolvePath(styleCssPath)}"]`);
      if (!existingLink) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = resolvePath(styleCssPath); // 使用 resolvePath 来处理路径
          document.head.appendChild(link);
      }
  }

  if (config.favicon) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = resolvePath(config.favicon);
    link.type = 'image/x-icon';
    document.head.appendChild(link);
  }

  // 语言选择逻辑
  function getUrlLangParam() {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (!langParam) return null;
    return langParam.startsWith('zh') ? 'zh-CN' : 'en-US';
  }

  const urlLang = getUrlLangParam();
  const browserLang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const initialLang = urlLang || browserLang;
  
  const langSelect = document.getElementById('lang-select');
  if (langSelect) { // 确保 lang-select 元素存在
      langSelect.value = initialLang;
      langSelect.setAttribute('title', textsJson[initialLang.startsWith('zh') ? 'zh' : 'en']['SelectLanguageTitle'] || "Select Language");

      langSelect.addEventListener('change', (e) => {
        const newLang = e.target.value;
        // 更新 URL 参数
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('lang', newLang);
        history.replaceState(null, '', currentUrl.toString());

        // 调用 render 函数更新页面文本
        render(newLang, textsJson, config, iconsModule);
        langSelect.setAttribute('title', textsJson[newLang.startsWith('zh') ? 'zh' : 'en']['SelectLanguageTitle'] || "Select Language");
      });
  }

  // 初始渲染
  render(initialLang, textsJson, config, iconsModule);
}