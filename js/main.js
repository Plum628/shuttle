export function showLoader() {
  const loader = document.getElementById('loading-overlay');
  const mainContent = document.querySelector('.overlay');

  if (loader) {
    loader.style.opacity = '1';
    loader.style.visibility = 'visible';
  }
  // 确保在加载时隐藏主内容，防止内容闪烁
  if (mainContent) {
    mainContent.style.opacity = '0';
    mainContent.style.visibility = 'hidden';
  }
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
}

export function hideLoader() {
  const loader = document.getElementById('loading-overlay');
  const mainContent = document.querySelector('.overlay');

  if (loader) {
    loader.style.opacity = '0';
    loader.style.visibility = 'hidden';
  }
  if (mainContent) {
    mainContent.style.opacity = '1';
    mainContent.style.visibility = 'visible';
  }

  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';
}

async function waitForImagesToLoad(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    return;
  }

  // 获取所有图片元素，包括 img 标签和带有 background-image 的元素
  const images = Array.from(container.querySelectorAll('img'));

  const imagePromises = images.map(img => {
    // 对于 img 标签，如果已经加载，Promise 立即解决
    if (img.complete && img.naturalHeight !== 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => {
        console.warn('Image failed to load:', img.src);
        resolve();
      }, { once: true });
    });
  });

  await Promise.all(imagePromises);
}

// 将路径转换为绝对路径（支持 CDN）
function resolvePath(p, config) {
  if (!p) return '';
  if (config.useCdn) {
    return new URL(p.replace(/^\/+/, ''), config.cdnBase).toString();
  } else {
    return new URL(p.replace(/^\/+/, ''), window.location.origin).toString();
  }
}

// 获取当前 URL 的语言参数
function getCurrentLangParam() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('lang');
}

// 根据当前语言和配置更新所有可见的UI元素
async function updateUI(config, textsJson, iconsModule) {
  const urlParams = new URLSearchParams(window.location.search);
  let currentLang = urlParams.get('lang');
  if (!currentLang) {
    currentLang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  }
  const currentLangShort = currentLang.startsWith('zh') ? 'zh' : 'en';

  document.documentElement.lang = currentLang;
  const t = textsJson[currentLangShort];

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
      src: url('${resolvePath(config.font, config)}') format('woff2');
      font-display: swap; /* Add font-display to prevent FOIT, allowing text to render with fallback first */
    }
  `;

  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch (error) {
      console.error('字体加载出错:', error);
    }
  } else {
    console.warn('浏览器不支持 Font Loading API，字体可能延迟显示。');
  }

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

  // 导航栏按钮文本和链接
  const homeBtn = document.getElementById('home-btn');
  const newsBtn = document.getElementById('news-btn');

  // 获取当前的语言参数，用于构建链接
  const langParam = getCurrentLangParam();
  const langQuery = langParam ? `?lang=${langParam}` : '';

  if (homeBtn) {
    homeBtn.textContent = t['NavbarHome'];
    homeBtn.setAttribute('aria-label', t['NavbarHome']);
    homeBtn.href = `/${langQuery}`;
  }
  if (newsBtn) {
    newsBtn.textContent = t['NavbarNews'];
    homeBtn.setAttribute('aria-label', t['NavbarNews']);
    newsBtn.href = `/news/${langQuery}`;
  }

  // 导航栏激活状态
  const currentPath = window.location.pathname;
  if (homeBtn) homeBtn.classList.remove('active');
  if (newsBtn) newsBtn.classList.remove('active');

  // 主页按钮高亮逻辑
  if (currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('/index')) {
    if (homeBtn) homeBtn.classList.add('active');
  }
  // 新闻页按钮高亮逻辑
  else if (currentPath.startsWith('/news/') || currentPath.endsWith('/news.html')) {
    if (newsBtn) newsBtn.classList.add('active');
  }

  // 主页特定元素的渲染逻辑
  const isHomePage = currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('/index');

  // 版本信息
  const versionEl = document.getElementById('version');
  if (versionEl) {
    if (isHomePage) {
      versionEl.textContent = `${t['Version']}: v${config.version}`;
    } else {
      versionEl.remove();
    }
  }

  // 下载部分
  const titleDownloadEl = document.getElementById('title-download');
  const dlContainer = document.getElementById('downloads');
  if (titleDownloadEl && dlContainer) {
    if (isHomePage) {
      titleDownloadEl.textContent = t['Download'] || 'Download';
      dlContainer.innerHTML = '';
      const regionKey = currentLangShort === 'zh' ? 'cn' : 'en';
      const linksToShow = config.downloads[regionKey] || [];
      linksToShow.forEach((link, i) => {
        const a = document.createElement('a');
        a.href = link;
        a.textContent = t[`Download-${regionKey}-${i + 1}`] || `Download ${i + 1}`;
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
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.setAttribute('frameborder', '0');

        if (link.includes('bilibili.com')) {
          const bvid = link.split('BV')[1].split('/')[0];
          iframe.src = `//player.bilibili.com/player.html?bvid=BV${bvid}&high_quality=1&autoplay=${autoPlay}&muted=${autoMute}`;
        } else if (link.includes('youtube.com') || link.includes('youtu.be')) {
          let vid;
          const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
          const match = link.match(youtubeRegex);
          if (match && match[1]) {
            vid = match[1];
          } else {
            console.warn('Could not extract YouTube video ID from link:', link);
            return;
          }
          iframe.src = `https://www.youtube.com/embed/${vid}?rel=0&autoplay=${autoPlay}&mute=${autoMute}`;
        } else {
          console.warn('Unsupported video link type:', link);
          return;
        }

        wrap.appendChild(iframe);
        trailerContainer.appendChild(wrap);
      });
      titleTrailerEl.textContent = t['Trailers'] || 'Trailers';
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
      titleDevelopersEl.textContent = t['Developers'] || 'Developers';
      devContainer.innerHTML = '';
      const ICON_BILIBILI = iconsModule.ICONS.bilibili;
      const ICON_YOUTUBE = iconsModule.ICONS.youtube;

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
      titleCommunityEl.textContent = t['Community'] || 'Community';
      grpContainer.innerHTML = '';
      const ICON_QQ = iconsModule.ICONS.qq;
      const ICON_QQ_CHANNEL = iconsModule.ICONS.qqChannel;
      const ICON_DISCORD = iconsModule.ICONS.discord;

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

  await waitForImagesToLoad('.overlay');
  await Promise.all([
    new Promise(resolve => {
      if (logoEl && logoEl.complete) return resolve();
      if (logoEl) logoEl.addEventListener('load', resolve, { once: true });
      else resolve();
    }),
    new Promise(resolve => {
      if (gameIconEl && gameIconEl.complete) return resolve();
      if (gameIconEl) gameIconEl.addEventListener('load', resolve, { once: true });
      else resolve();
    })
  ]);

  const bgImgPath = resolvePath(config.background, config);
  const bgPreloader = new Image();
  bgPreloader.src = bgImgPath;
  await new Promise(resolve => {
    if (bgPreloader.complete) return resolve();
    bgPreloader.onload = resolve;
    bgPreloader.onerror = () => {
      console.warn('Background image failed to load:', bgImgPath);
      resolve();
    };
  });
}

// 页面初始化入口函数
export async function init(config, textsJsonPath, iconsJsPath, styleCssPath) {
  // 加载所有必要的初始数据
  const textsResponse = await fetch(new URL(textsJsonPath, window.location.origin));
  const textsJson = await textsResponse.json();
  const iconsModule = await import(new URL(iconsJsPath, window.location.origin));

  // 动态加载 CSS
  if (styleCssPath) {
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

  // 处理语言切换器
  const langSwitch = document.getElementById('lang-switch');
  if (langSwitch) {
    const langSwitchBtn = document.getElementById('lang-switch-btn');
    const langDropdown = document.getElementById('lang-dropdown');

    // 注入SVG图标
    if (langSwitchBtn) {
      langSwitchBtn.innerHTML = iconsModule.ICONS.language;
    }

    const initialLang = (new URLSearchParams(window.location.search).get('lang') || navigator.language).startsWith('zh') ? 'zh' : 'en';
    if (langSwitchBtn) {
      langSwitchBtn.setAttribute('title', textsJson[initialLang]['SelectLanguageTitle'] || 'Select Language');
    }

    // 点击按钮显示/隐藏下拉菜单
    if (langSwitchBtn && !langSwitchBtn.dataset.listenerAdded) {
      langSwitchBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        langDropdown.classList.toggle('show');
      });
      langSwitchBtn.dataset.listenerAdded = 'true';
    }

    // 点击下拉菜单中的语言选项
    if (langDropdown && !langDropdown.dataset.listenerAdded) {
      langDropdown.addEventListener('click', async (event) => {
        if (event.target.tagName === 'A') {
          event.preventDefault();
          showLoader();
          const newLang = event.target.dataset.lang;
          langDropdown.classList.remove('show');

          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('lang', newLang);
          history.replaceState(null, '', currentUrl.toString());

          try {
            await updateUI(config, textsJson, iconsModule);

            const currentPathname = window.location.pathname;
            if (currentPathname.startsWith('/news/') || currentPathname.endsWith('/news.html') || currentPathname === '/news/') {
              const newsModule = await import(new URL(config.newsJs, window.location.origin));
              await newsModule.initNews(config, config.newsJson);
            }
          } catch (error) {
            console.error('语言切换期间出错：', error);
          } finally {
            hideLoader();
          }
        }
      });
      langDropdown.dataset.listenerAdded = 'true';
    }

    // 点击窗口其他地方隐藏下拉菜单
    window.addEventListener('click', (event) => {
      if (langDropdown && langDropdown.classList.contains('show')) {
        if (!langSwitch.contains(event.target)) {
          langDropdown.classList.remove('show');
        }
      }
    });
  }

  // 调用 updateUI 进行首次渲染 (这个调用会负责等待字体和图片)
  await updateUI(config, textsJson, iconsModule);
}
