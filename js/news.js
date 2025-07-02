// 日期格式化辅助函数
function formatNewsDate(dateString, langCode) {
  const parts = dateString.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

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

// 等待指定容器内的所有图片加载完成
async function waitForNewsImagesToLoad(container) {
  if (!container) {
    console.warn('Image container not found for news image loading check.');
    return;
  }

  // 获取所有 img 标签
  const images = Array.from(container.querySelectorAll('img'));

  const imagePromises = images.map(img => {
    if (img.complete && img.naturalHeight !== 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      img.addEventListener('load', () => {
        resolve();
      }, { once: true });
      img.addEventListener('error', (e) => {
        console.warn('News image failed to load:', img.src, e);
        resolve();
      }, { once: true });
    });
  });

  await Promise.all(imagePromises);
}


export async function initNews(config, newsJsonPath) {
  // 1. 加载新闻数据 (news.json)
  const newsResponse = await fetch(new URL(newsJsonPath, window.location.origin));
  if (!newsResponse.ok) {
    console.error('Failed to load news.json:', newsResponse.status, newsResponse.statusText);
    const newsContentArea = document.getElementById('news-content-area');
    if (newsContentArea) {
      newsContentArea.innerHTML = '<p>新闻数据加载失败，请稍后再试。</p>';
      newsContentArea.className = 'card news-list-container';
    }
    throw new Error('Failed to load news.json');
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
    throw new Error('Failed to load texts.json');
  }
  const textsJson = await textsResponse.json();
  const t = textsJson[shortLang];

  const newsContentArea = document.getElementById('news-content-area');
  if (!newsContentArea) {
    console.error('Error: news-content-area element not found!');
    throw new Error('News content area not found.');
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

  // 5. 渲染新闻列表或单篇新闻
  if (newsId) {
    await renderSingleNews(newsId, newsData, shortLang, newsContentArea, t, currentLang, config);
  } else {
    await renderNewsList(newsData, currentLang, shortLang, newsContentArea, t);
  }

  // 在这里等待新闻列表/单篇新闻中的图片加载
  await waitForNewsImagesToLoad(newsContentArea);
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
}

async function renderSingleNews(newsId, newsData, shortLang, container, t, currentLang, config) {
  const newsItem = newsData.find(item => item.id === newsId);

  if (!newsItem) {
    container.innerHTML = `<p>${t['NewsNotFound'] || 'News not found.'}</p>`;
    container.className = 'card news-detail-container';
    return;
  }

  let markdownContent = '';
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
    return;
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
}
