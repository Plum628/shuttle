// 日期格式化辅助函数
function formatNewsDate(dateString, langCode) {
  // 使用 new Date() 构造函数，并传入年、月、日
  // 注意：月份在 JavaScript 的 Date 对象中是 0-11，所以需要减 1
  const parts = dateString.split('-'); // "2025-06-01" -> ["2025", "06", "01"]
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 月份是0-11，所以 6 月是 5
  const day = parseInt(parts[2], 10);

  // 这样创建的日期对象是本地时区下指定日期的午夜
  const date = new Date(year, month, day);

  let options;

  if (langCode.startsWith('zh')) {
    options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Intl.DateTimeFormat('zh-CN', options).format(date);
  } else {
    options = { month: '2-digit', day: '2-digit', year: 'numeric' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }
}

// 辅助函数：等待指定容器内的所有图片加载完成
// 注意：这个函数与 main.js 中的类似，但为了模块独立性，可以单独存在。
// 如果你想保持 DRY (Don't Repeat Yourself)，可以考虑将这个函数放到一个公共的工具文件中，然后导入。
async function waitForNewsImagesToLoad(container) {
  if (!container) {
    console.warn('Image container not found for news image loading check.');
    return;
  }

  // 获取所有 img 标签
  const images = Array.from(container.querySelectorAll('img'));

  const imagePromises = images.map(img => {
    // 对于 img 标签，如果已经加载，Promise 立即解决
    if (img.complete && img.naturalHeight !== 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      img.addEventListener('load', () => {
        // console.log('News image loaded:', img.src); // 调试日志
        resolve();
      }, { once: true });
      img.addEventListener('error', (e) => {
        console.warn('News image failed to load:', img.src, e);
        resolve(); // 即使加载失败也解决，避免卡住
      }, { once: true });
    });
  });

  await Promise.all(imagePromises);
  // console.log('所有新闻图片已加载。'); // 调试日志
}


export async function initNews(config, newsJsonPath) {
  // console.log('initNews called!');

  // 1. 加载新闻数据 (news.json)
  const newsResponse = await fetch(new URL(newsJsonPath, window.location.origin));
  if (!newsResponse.ok) {
    console.error('Failed to load news.json:', newsResponse.status, newsResponse.statusText);
    const newsContentArea = document.getElementById('news-content-area');
    if (newsContentArea) {
      newsContentArea.innerHTML = '<p>新闻数据加载失败，请稍后再试。</p>';
      newsContentArea.className = 'card news-list-container';
    }
    // 返回，但不隐藏加载器，让主页的 finally 块来处理，或者直接在这里抛出错误让外层捕获
    throw new Error('Failed to load news.json'); // 抛出错误，让 loadInitialData 的 catch 处理
  }
  const newsData = await newsResponse.json();
  // console.log('News Data:', newsData);

  // 2. 获取当前语言
  const urlParams = new URLSearchParams(window.location.search);
  let currentLang = urlParams.get('lang');
  if (!currentLang) {
    currentLang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  }
  const shortLang = currentLang.startsWith('zh') ? 'zh' : 'en';

  // 3. 加载文本数据 (texts.json)
  const textsResponse = await fetch(new URL(config.textsJson, window.location.origin));
  if (!textsResponse.ok) {
    console.error('Failed to load texts.json:', textsResponse.status, textsResponse.statusText);
    const newsContentArea = document.getElementById('news-content-area');
    if (newsContentArea) {
      newsContentArea.innerHTML = '<p>语言文本加载失败，请稍后再试。</p>';
    }
    throw new Error('Failed to load texts.json'); // 抛出错误
  }
  const textsJson = await textsResponse.json();
  const t = textsJson[shortLang];
  // console.log('Texts Data (t):', t);

  const newsContentArea = document.getElementById('news-content-area');
  if (!newsContentArea) {
    console.error('Error: news-content-area element not found!');
    throw new Error('News content area not found.'); // 抛出错误
  }

  // 4. 解析新闻 ID (从 URL 路径)
  let newsId = null;
  const pathParts = window.location.pathname.split('/').filter(part => part !== '');
  const newsPathIndex = pathParts.indexOf('news');

  if (newsPathIndex > -1 && newsPathIndex + 1 < pathParts.length) {
    const potentialId = pathParts[newsPathIndex + 1];
    if (newsData.some(item => item.id === potentialId)) {
      newsId = potentialId;
    }
  }

  // console.log('Resolved News ID:', newsId);

  // 5. 渲染新闻列表或单篇新闻
  if (newsId) {
    await renderSingleNews(newsId, newsData, shortLang, newsContentArea, t, currentLang, config);
  } else {
    // *** 关键修改：等待 renderNewsList 完成渲染，并等待其中的图片加载 ***
    await renderNewsList(newsData, currentLang, shortLang, newsContentArea, t);
  }

  // *** 关键修改：在 renderNewsList/renderSingleNews 完成并图片加载后，才让 initNews 完成 ***
  // 在这里等待新闻列表/单篇新闻中的图片加载
  await waitForNewsImagesToLoad(newsContentArea);

  // console.log('initNews completed, all news content and images should be loaded.');
}


async function renderNewsList(newsData, currentLang, shortLang, container, t) {
  container.innerHTML = `<h2>${t['NewsListTitle'] || 'News List'}</h2>`;
  container.className = 'card news-list-container';

  newsData.sort((a, b) => new Date(b.date) - new Date(a.date));

  newsData.forEach(newsItem => {
    const newsTitle = newsItem.title[shortLang] || newsItem.title['en'] || 'Untitled';
    const newsSummary = newsItem.summary ? (newsItem.summary[shortLang] || newsItem.summary['en'] || '') : '';
    const formattedDate = formatNewsDate(newsItem.date, currentLang);

    let newsCoverPath = '';
    if (typeof newsItem.cover_url === 'string') {
      newsCoverPath = newsItem.cover_url;
    } else if (typeof newsItem.cover_url === 'object' && newsItem.cover_url !== null) {
      newsCoverPath = newsItem.cover_url[shortLang] || newsItem.cover_url['en'] || '';
    }

    // 确保图片路径是绝对路径，并考虑 CDN
    // 这里我们假设 newsCoverPath 是相对于网站根目录的路径，例如 'assets/news/some-image.png'
    // 并且 config 中有 resolvePath 函数或类似的逻辑来处理 CDN
    // 因为 news.js 无法直接访问 main.js 的 resolvePath，这里需要一个独立的解析逻辑
    // 或者将 resolvePath 提取到一个共享工具文件并导入
    // 为了简化，我们假设 newsCoverPath 已经是可用 URL 片段，并直接构建 URL。
    // 如果 config.useCdn 适用于新闻图片，你可能需要将 resolvePath 也移植到 news.js 或通过参数传递。
    // For now, let's assume it's relative to root or fully qualified.
    const finalCoverUrl = newsCoverPath ? new URL(newsCoverPath, window.location.origin).toString() : '';


    const newsLink = document.createElement('a');
    newsLink.href = `/news/${newsItem.id}/?lang=${currentLang}`;
    newsLink.className = 'news-list-item-link';

    const newsCard = document.createElement('div');
    newsCard.className = 'news-list-item';

    newsCard.innerHTML = `
      ${finalCoverUrl ? `<img src="${finalCoverUrl}" alt="${newsTitle} Cover" class="news-cover">` : ''}
      <div class="news-content-text">
        <h3>${newsTitle}</h3>
        <div class="news-title-divider"></div>
        ${newsSummary ? `<p class="news-summary">${newsSummary}</p>` : ''}
      </div>
      <p class="news-date">${formattedDate}</p>
    `;

    newsLink.appendChild(newsCard);
    container.appendChild(newsLink);
  });
  // console.log('News list rendered.');
  // 无需返回 Promise，因为图片加载将在 initNews 内部的 waitForNewsImagesToLoad 处理
}

async function renderSingleNews(newsId, newsData, shortLang, container, t, currentLang, config) {
  const newsItem = newsData.find(item => item.id === newsId);

  if (!newsItem) {
    container.innerHTML = `<p>${t['NewsNotFound'] || 'News not found.'}</p>`;
    container.className = 'card news-detail-container';
    return;
  }

  let markdownContent = '';
  // 这里的 newsResolvePath 确保可以正确解析 CDN 和本地路径，与 main.js 中的逻辑保持一致
  const newsResolvePath = (p) => {
    if (!p) return '';
    if (config.useCdn && config.cdnBase) {
      return new URL(p.replace(/^\/+/, ''), config.cdnBase).toString();
    } else {
      return new URL(p.replace(/^\/+/, ''), window.location.origin).toString();
    }
  };

  const preferredLangPath = newsResolvePath(`/news/${newsItem.file}.${shortLang}.md`);
  const fallbackLangPath = newsResolvePath(`/news/${newsItem.file}.en.md`);

  try {
    let response = await fetch(preferredLangPath);
    if (!response.ok) {
      response = await fetch(fallbackLangPath);
      if (!response.ok) {
        throw new Error('Markdown file not found for any language.');
      }
    }
    markdownContent = await response.text();
  } catch (error) {
    console.error('Error fetching markdown:', error);
    container.innerHTML = `<p>${t['FailedToLoadNews'] || 'Failed to load news content.'}</p>`;
    container.className = 'card news-detail-container';
    return; // 不要抛出错误，因为这里已经处理了显示错误信息
  }

  const renderedHtml = window.marked ? window.marked.parse(markdownContent) : markdownContent;
  if (!window.marked) {
    console.warn("Marked.js is not loaded. Markdown content will be displayed as plain text.");
  }

  const formattedDate = formatNewsDate(newsItem.date, currentLang);

  const backButtonHtml = `
    <div style="text-align: center; margin-top: 30px;">
        <a href="/news/?lang=${currentLang}" class="adaptive-btn" id="back-to-news-list-btn">${t['BackToNewsList'] || 'Back to News List'}</a>
    </div>
  `;

  container.innerHTML = `
    <h2 class="news-detail-title">${newsItem.title[shortLang] || newsItem.title['en']}</h2>
    <div class="news-detail-date-wrapper">${formattedDate}</div>
    <div class="news-detail-content">${renderedHtml}</div>
    ${backButtonHtml}
  `;
  container.className = 'card news-detail-container';
  document.title = (newsItem.title[shortLang] || newsItem.title['en'] || 'News') + ' - PvZ2: SHUTTLE';
  window.scrollTo(0, 0);

  // 单篇新闻也可能包含图片，等待它们加载
  // 这里通常指 markdown 内部的图片，它们的加载是异步的
  // 如果 markdown 内部图片使用了 img 标签，waitForNewsImagesToLoad 会处理
  // 如果是背景图或其他方式，可能需要更复杂的处理
  // 我们依赖 waitForNewsImagesToLoad 遍历 container 来处理
}
