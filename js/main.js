// js/main.js

// 辅助函数：将路径转换为绝对路径（支持 CDN）
// 注意：这个函数现在在 main.js 模块的顶层定义，并接收 config 参数
function resolvePath(p, config) {
  if (!p) return '';
  if (config.useCdn) {
    return new URL(p.replace(/^\/+/, ''), config.cdnBase).toString();
  } else {
    return new URL(p.replace(/^\/+/, ''), window.location.origin).toString();
  }
}

// 核心 UI 更新函数
// 这个函数负责根据当前语言和配置更新所有可见的UI元素
async function updateUI(config, textsJson, iconsModule) {
  // 获取当前语言 (通用逻辑)
  const urlParams = new URLSearchParams(window.location.search);
  let currentLang = urlParams.get('lang');
  if (!currentLang) {
    currentLang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  }
  const currentLangShort = currentLang.startsWith('zh') ? 'zh' : 'en';

  document.documentElement.lang = currentLang; // 设置html的lang属性
  const t = textsJson[currentLangShort]; // 获取当前语言的文本对象

  // 更新页面标题
  document.title = t['Title'];

  // 字体样式
  let fontFaceStyle = document.getElementById('pvz2-font-style');
  if (!fontFaceStyle) {
    fontFaceStyle = document.createElement('style');
    fontFaceStyle.id = 'pvz2-font-style';
    document.head.appendChild(fontFaceStyle);
  }
  // 确保 resolvePath 传递 config
  fontFaceStyle.textContent = `
    @font-face {
      font-family: 'PvZ2Regular';
      src: url('${resolvePath(config.font, config)}') format('woff2');
    }
  `;

  // 背景和Logo
  document.body.style.setProperty('--bg-image', `url('${resolvePath(config.background, config)}')`);
  const logoEl = document.getElementById('game-title-logo');
  if (logoEl) {
    logoEl.src = resolvePath(config.logo, config);
    logoEl.alt = t['Title'];
  }
  const gameIconEl = document.getElementById('game-icon');
  if (gameIconEl) {
    gameIconEl.src = resolvePath(config.icon, config);
  }

  // 导航栏按钮文本
  const homeBtn = document.getElementById('home-btn');
  const newsBtn = document.getElementById('news-btn');

  if (homeBtn) {
    homeBtn.textContent = t['NavbarHome'];
    homeBtn.setAttribute('aria-label', t['NavbarHome']);
  }
  if (newsBtn) {
    newsBtn.textContent = t['NavbarNews'];
    newsBtn.setAttribute('aria-label', t['NavbarNews']);
  }

  // *** 导航栏激活状态 (核心) ***
  const currentPath = window.location.pathname;
  // 移除 active 状态，让 CSS 控制样式
  if (homeBtn) homeBtn.classList.remove('active');
  if (newsBtn) newsBtn.classList.remove('active');

  // 主页按钮高亮逻辑
  // 检查是否是精确的首页路径或者以 /index.html 结尾
  if (currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('/index')) {
    if (homeBtn) homeBtn.classList.add('active');
  }
  // 新闻页按钮高亮逻辑
  // 检查当前路径是否以 /news/ 开头，或者是否是 /news.html (兼容旧链接)
  else if (currentPath.startsWith('/news/') || currentPath.endsWith('/news.html')) {
    if (newsBtn) newsBtn.classList.add('active');
  }

  // --- 主页特定元素的渲染逻辑 ---
  // 这些元素只存在于 index.html，在 news.html 中可能不存在，所以需要检查
  const isHomePage = currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('/index');

  // 版本信息
  const versionEl = document.getElementById('version');
  if (versionEl) {
    if (isHomePage) {
      versionEl.textContent = `${t['Version']}: V${config.version}`;
    } else {
      versionEl.remove();
    }
  }

  // 下载部分
  const titleDownloadEl = document.getElementById('title-download');
  const dlContainer = document.getElementById('downloads');
  if (titleDownloadEl && dlContainer) {
    if (isHomePage) {
      titleDownloadEl.textContent = t['Download'] || 'Download'; // 检查键是否存在
      dlContainer.innerHTML = '';
      const regionKey = currentLangShort === 'zh' ? 'cn' : 'en';
      const linksToShow = config.downloads[regionKey] || [];
      linksToShow.forEach((link, i) => {
        const a = document.createElement('a');
        a.href = link;
        a.textContent = t[`Download-${regionKey}-${i + 1}`] || `Download ${i + 1}`; // 检查键是否存在
        a.target = '_blank';
        a.className = 'adaptive-btn';
        dlContainer.appendChild(a);
      });
    } else {
      titleDownloadEl.remove();
      dlContainer.remove();
    }
  }

  // 预告片部分
  const titleTrailerEl = document.getElementById('title-trailer');
  const trailerContainer = document.getElementById('trailer-container');
  if (titleTrailerEl && trailerContainer) {
    if (isHomePage) {
      trailerContainer.innerHTML = '';
      const autoPlay = config['autoPlayTrailers'] ? '1' : '0';
      const autoMute = config['autoMuteTrailers'] ? '1' : '0';

      config.trailers[currentLangShort].forEach((link) => {
        const wrap = document.createElement('div');
        wrap.className = 'video-container';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'); // 允许这些权限
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
          // 更正 YouTube 嵌入 URL 格式，确保协议正确且无多余字符
          iframe.src = `https://www.youtube.com/embed/${vid}?rel=0&autoplay=${autoPlay}&mute=${autoMute}`;
        } else {
          console.warn('Unsupported video link type:', link);
          return;
        }

        wrap.appendChild(iframe);
        trailerContainer.appendChild(wrap);
      });
      titleTrailerEl.textContent = t['Trailers'] || 'Trailers'; // 检查键是否存在
    } else {
      titleTrailerEl.remove();
      trailerContainer.remove();
    }
  }

  // 开发者部分
  const titleDevelopersEl = document.getElementById('title-developers');
  const devContainer = document.getElementById('developers');
  if (titleDevelopersEl && devContainer) {
    if (isHomePage) {
      titleDevelopersEl.textContent = t['Developers'] || 'Developers'; // 检查键是否存在
      devContainer.innerHTML = '';
      // 确保 iconsModule 已经加载并且属性可用
      const ICON_BILIBILI = iconsModule ? iconsModule.ICON_BILIBILI : '';
      const ICON_YOUTUBE = iconsModule ? iconsModule.ICON_YOUTUBE : '';

      config.developers.bilibili.forEach((url, i) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.className = 'adaptive-btn';
        a.innerHTML = ICON_BILIBILI + (t[`Bilibili${i + 1}`] || `Bilibili ${i + 1}`);
        devContainer.appendChild(a);
      });
      config.developers.youtube.forEach((url, i) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.className = 'adaptive-btn';
        a.innerHTML = ICON_YOUTUBE + (t[`YouTube${i + 1}`] || `YouTube ${i + 1}`);
        devContainer.appendChild(a);
      });
    } else {
      titleDevelopersEl.remove();
      devContainer.remove();
    }
  }

  // 社区与社交部分
  const titleCommunityEl = document.getElementById('title-community');
  const grpContainer = document.getElementById('groups');
  if (titleCommunityEl && grpContainer) {
    if (isHomePage) {
      titleCommunityEl.textContent = t['Community'] || 'Community'; // 检查键是否存在
      grpContainer.innerHTML = '';
      // 确保 iconsModule 已经加载并且属性可用
      const ICON_QQ = iconsModule ? iconsModule.ICON_QQ : '';
      const ICON_QQ_CHANNEL = iconsModule ? iconsModule.ICON_QQ_CHANNEL : '';
      const ICON_DISCORD = iconsModule ? iconsModule.ICON_DISCORD : '';

      Object.entries(config.social.qq_groups).forEach(([_, url], i) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.className = 'adaptive-btn';
        a.innerHTML = ICON_QQ + (t[`QQGroup${i + 1}`] || `QQ Group ${i + 1}`);
        grpContainer.appendChild(a);
      });

      const qqChannelButton = document.createElement('a');
      qqChannelButton.href = config.social.qq_channel;
      qqChannelButton.target = '_blank';
      qqChannelButton.className = 'adaptive-btn';
      qqChannelButton.innerHTML = ICON_QQ_CHANNEL + (t['QQChannel'] || 'QQ Channel');
      grpContainer.appendChild(qqChannelButton);

      const discordButton = document.createElement('a');
      discordButton.href = config.social.discord;
      discordButton.target = '_blank';
      discordButton.className = 'adaptive-btn';
      discordButton.innerHTML = ICON_DISCORD + (t['Discord'] || 'Discord');
      grpContainer.appendChild(discordButton);
    } else {
      titleCommunityEl.remove();
      grpContainer.remove();
    }
  }
} // End of updateUI function


// 页面初始化入口函数
export async function init(config, textsJsonPath, iconsJsPath, styleCssPath) {
  // 1. 加载所有必要的初始数据
  const textsResponse = await fetch(new URL(textsJsonPath, window.location.origin));
  const textsJson = await textsResponse.json();
  const iconsModule = await import(new URL(iconsJsPath, window.location.origin));

  // 2. 动态加载 CSS (如果尚未加载)
  if (styleCssPath) {
    // 这里的 resolvePath 必须使用当前的 config，所以直接调用
    const resolvedStylePath = resolvePath(styleCssPath, config);
    const existingLink = document.querySelector(`link[href="${resolvedStylePath}"]`);
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = resolvedStylePath;
      document.head.appendChild(link);
    }
  }

  // 设置 favicon
  if (config.favicon) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = resolvePath(config.favicon, config);
    link.type = 'image/x-icon';
    document.head.appendChild(link);
  }

  // 3. 处理语言选择器 (通用逻辑，应在 init 中设置一次)
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
  if (langSelect) {
    langSelect.value = initialLang;
    langSelect.setAttribute('title', textsJson[initialLang.startsWith('zh') ? 'zh' : 'en']['SelectLanguageTitle'] || "Select Language");

    if (!langSelect.dataset.mainListenerAdded) {
      langSelect.addEventListener('change', async (e) => { // **注意这里是 async 函数**
        const newLang = e.target.value;
        // 更新 URL 参数
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('lang', newLang);
        history.replaceState(null, '', currentUrl.toString());

        // 1. 调用 updateUI 函数更新主页/通用页面文本和元素
        await updateUI(config, textsJson, iconsModule); // 使用 await

        // 2. **关键改动：如果当前页面是新闻页，重新初始化新闻模块**
        const currentPathname = window.location.pathname;
        if (currentPathname.startsWith('/news/') || currentPathname.endsWith('/news.html') || currentPathname === '/news/') {
          try {
            const newsModule = await import(new URL('/js/news.js', window.location.origin));
            // 再次调用 news.js 的 initNews，传递必要的 config 和 newsJsonPath
            await newsModule.initNews(config, config.newsJson);
          } catch (error) {
            console.error('Error re-initializing news module on language change:', error);
          }
        }

        // 更新选择器的 title 文本
        const newLangShort = newLang.startsWith('zh') ? 'zh' : 'en';
        langSelect.setAttribute('title', textsJson[newLangShort]['SelectLanguageTitle'] || "Select Language");
      });
      langSelect.dataset.mainListenerAdded = 'true';
    }
  }

  // 4. 调用 updateUI 进行首次渲染
  await updateUI(config, textsJson, iconsModule);
}