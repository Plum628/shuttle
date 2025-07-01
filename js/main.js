export function showLoader() {
  const loader = document.getElementById('loading-overlay');
  const mainContent = document.querySelector('.overlay'); // 获取主内容

  if (loader) {
    loader.style.opacity = '1';
    loader.style.visibility = 'visible';
  }
  // 确保在加载时隐藏主内容，防止内容闪烁
  if (mainContent) {
    mainContent.style.opacity = '0';
    mainContent.style.visibility = 'hidden';
  }
  document.body.style.overflow = 'hidden'; // 隐藏滚动条
  document.documentElement.style.overflow = 'hidden'; // 针对 html 元素
}

export function hideLoader() {
  const loader = document.getElementById('loading-overlay');
  const mainContent = document.querySelector('.overlay'); // 获取主内容

  if (loader) {
    loader.style.opacity = '0';
    loader.style.visibility = 'hidden'; // 立即隐藏
  }
  if (mainContent) {
    mainContent.style.opacity = '1';
    mainContent.style.visibility = 'visible'; // 立即显示
  }

  document.body.style.overflow = 'auto'; // 将 body 的 overflow 明确设置为 auto
  document.documentElement.style.overflow = 'auto'; // 将 html 的 overflow 明确设置为 auto
}

async function waitForImagesToLoad(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.warn(`Container with selector "${containerSelector}" not found for image loading check.`);
    return;
  }

  // 获取所有图片元素，包括 img 标签和带有 background-image 的元素
  const images = Array.from(container.querySelectorAll('img'));
  // 这里可以根据需要添加更多选择器，比如查找具有特定背景图片的元素
  // const bgImageElements = Array.from(container.querySelectorAll('[style*="background-image"]'));

  const imagePromises = images.map(img => {
    // 对于 img 标签，如果已经加载，Promise 立即解决
    if (img.complete && img.naturalHeight !== 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      img.addEventListener('load', () => resolve(), { once: true });
      img.addEventListener('error', () => {
        console.warn('Image failed to load:', img.src);
        resolve(); // 即使加载失败也解决，避免卡住
      }, { once: true });
    });
  });

  // 针对 CSS background-image 的处理：
  // 这种处理更复杂，因为浏览器不会触发 load 事件。
  // 一种方法是预加载关键背景图片，或者接受它们可能稍后加载的事实。
  // 考虑到你提到的是 --bg-image，它通常是 body 的背景。
  // body 的背景图会在 CSS 解析后立即开始加载。
  // 通常，如果网络不是特别慢，并且图片没有被 JS 延迟设置，它应该会很快加载。
  // 如果它依然延迟，可能需要通过 JS 强制创建一个 Image 对象来预加载。

  // For now, let's focus on <img> tags and the font.
  // If --bg-image is still an issue, we can add more specific preloading.

  await Promise.all(imagePromises);
  console.log('所有关键图片已加载。');
}

// 辅助函数：将路径转换为绝对路径（支持 CDN）
function resolvePath(p, config) {
  if (!p) return '';
  if (config.useCdn) {
    return new URL(p.replace(/^\/+/, ''), config.cdnBase).toString();
  } else {
    return new URL(p.replace(/^\/+/, ''), window.location.origin).toString();
  }
}

// 新增辅助函数：获取当前 URL 的语言参数
function getCurrentLangParam() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('lang');
}

// 核心 UI 更新函数，负责根据当前语言和配置更新所有可见的UI元素
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
  fontFaceStyle.textContent = `
    @font-face {
      font-family: 'PvZ2Regular';
      src: url('${resolvePath(config.font, config)}') format('woff2');
      font-display: swap; /* Add font-display to prevent FOIT, allowing text to render with fallback first */
    }
  `;

  // **重要：在 updateUI 中添加 @font-face 规则后，再等待 document.fonts.ready**
  // 否则，document.fonts.ready 可能在 @font-face 规则被添加到 DOM 之前就解决了。
  if (document.fonts) {
    try {
      // 我们可以等待特定的字体，如果它在文档中被定义
      // 或者等待所有新添加的字体
      await document.fonts.ready;
      console.log('PvZ2Regular 字体已加载。');
    } catch (error) {
      console.error('字体加载出错:', error);
      // 即使字体加载出错，也继续执行，避免页面卡住
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

  // 导航栏按钮文本
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
      titleCommunityEl.textContent = t['Community'] || 'Community'; // 检查键是否存在
      grpContainer.innerHTML = '';
      // 确保 iconsModule 已经加载并且属性可用
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

  // 在所有 DOM 更新和图片/字体设置完成后，等待图片加载
  // 我们可以等待 .overlay 容器内的所有图片加载
  await waitForImagesToLoad('.overlay'); // 等待主内容区的图片加载
  // 如果 logo 和 icon 不在 .overlay 内部，你需要等待它们的父容器
  // 或者直接等待 logoEl 和 gameIconEl
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
  console.log('所有关键Logo和Icon图片已加载。');


  // 针对 --bg-image (body 背景图) 的额外检查：
  // CSS background-image 的加载不像 img 标签那样能通过 JS 监听 load 事件。
  // 最可靠的方式是提前预加载它。
  const bgImgPath = resolvePath(config.background, config);
  const bgPreloader = new Image();
  bgPreloader.src = bgImgPath;
  await new Promise(resolve => {
    if (bgPreloader.complete) return resolve();
    bgPreloader.onload = resolve;
    bgPreloader.onerror = () => {
      console.warn('Background image failed to load:', bgImgPath);
      resolve(); // 即使加载失败也解决
    };
  });
  console.log('背景图片已预加载。');

}

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

  // 3. 处理语言切换器
  const langSwitch = document.getElementById('lang-switch');
  if (langSwitch) {
    const langSwitchBtn = document.getElementById('lang-switch-btn');
    const langDropdown = document.getElementById('lang-dropdown');

    // 注入SVG图标
    if (langSwitchBtn) {
      langSwitchBtn.innerHTML = iconsModule.ICONS.language;
    }

    // 设置初始 title
    const initialLang = (new URLSearchParams(window.location.search).get('lang') || navigator.language).startsWith('zh') ? 'zh' : 'en';
    if (langSwitchBtn) {
      langSwitchBtn.setAttribute('title', textsJson[initialLang]['SelectLanguageTitle'] || 'Select Language');
    }

    // 点击按钮显示/隐藏下拉菜单
    if (langSwitchBtn && !langSwitchBtn.dataset.listenerAdded) {
      langSwitchBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // 防止点击事件冒泡到 window
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

  // 4. 调用 updateUI 进行首次渲染 (这个调用会负责等待字体和图片)
  await updateUI(config, textsJson, iconsModule);
}
