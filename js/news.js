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

export async function initNews(config, newsJsonPath) {
  // console.log('initNews called!'); // 添加日志，确认函数是否执行

  // 1. 加载新闻数据 (news.json)
  const newsResponse = await fetch(new URL(newsJsonPath, window.location.origin));
  if (!newsResponse.ok) {
    console.error('Failed to load news.json:', newsResponse.status, newsResponse.statusText);
    // 如果 news.json 加载失败，直接显示错误信息并返回
    const newsContentArea = document.getElementById('news-content-area');
    if (newsContentArea) {
      newsContentArea.innerHTML = '<p>新闻数据加载失败，请稍后再试。</p>';
      newsContentArea.className = 'card news-list-container'; // 或者其他错误样式
    }
    return;
  }
  const newsData = await newsResponse.json();
  // console.log('News Data:', newsData); // 打印数据，确认是否加载成功

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
    return;
  }
  const textsJson = await textsResponse.json();
  const t = textsJson[shortLang];
  // console.log('Texts Data (t):', t); // 打印文本数据

  const newsContentArea = document.getElementById('news-content-area');
  if (!newsContentArea) {
    console.error('Error: news-content-area element not found!');
    return; // 如果容器不存在，则无法渲染
  }

  // 4. 解析新闻 ID (从 URL 路径)
  let newsId = null;
  const pathParts = window.location.pathname.split('/').filter(part => part !== '');
  const newsPathIndex = pathParts.indexOf('news');

  if (newsPathIndex > -1 && newsPathIndex + 1 < pathParts.length) {
    // 检查 /news/ 后面是否跟着一个 ID
    const potentialId = pathParts[newsPathIndex + 1];
    // 验证这个 potentialId 是否确实是新闻 ID
    if (newsData.some(item => item.id === potentialId)) {
      newsId = potentialId;
    }
  }

  // console.log('Resolved News ID:', newsId); // 打印解析到的新闻 ID

  // 5. 渲染新闻列表或单篇新闻
  if (newsId) {
    // 传递 currentLang 而不是 shortLang 给 renderSingleNews，以便 formatNewsDate 使用
    await renderSingleNews(newsId, newsData, shortLang, newsContentArea, t, currentLang, config);
  } else {
    // 传递 currentLang 而不是 shortLang 给 renderNewsList，以便 formatNewsDate 使用
    renderNewsList(newsData, currentLang, shortLang, newsContentArea, t);
  }

  // 语言选择器事件监听 (这个应该由 main.js 处理，但如果 news.js 也有自己的逻辑，确保不冲突)
  // 如果 main.js 已经处理了 lang-select，这里就不要重复添加事件监听器了
  // 如果 news.js 需要语言选择器来刷新新闻内容，可以保留，但需要确保 initNews 不被重复调用
  // 暂时注释掉这部分，让 main.js 统一管理语言选择
  /*
  const langSelect = document.getElementById('lang-select');
  if (langSelect) {
    if (!langSelect.dataset.newsListenerAdded) {
      langSelect.addEventListener('change', async (e) => {
        const newLang = e.target.value;
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('lang', newLang);
        history.replaceState(null, '', currentUrl.toString());
        
        // 重新调用 initNews 来刷新新闻内容 (注意这里的递归调用可能会导致一些问题，
        // 更好的做法是让 main.js 的语言选择器调用一个统一的刷新函数)
        // 但为了兼容现有结构，暂时保留
        initNews(config, newsJsonPath); 
      });
      langSelect.dataset.newsListenerAdded = 'true';
    }
  }
  */
}

function renderNewsList(newsData, currentLang, shortLang, container, t) {
  container.innerHTML = `<h2>${t['NewsListTitle'] || 'News List'}</h2>`;
  container.className = 'card news-list-container';

  newsData.sort((a, b) => new Date(b.date) - new Date(a.date));

  newsData.forEach(newsItem => {
    const newsTitle = newsItem.title[shortLang] || newsItem.title['en'] || 'Untitled';
    const newsSummary = newsItem.summary ? (newsItem.summary[shortLang] || newsItem.summary['en'] || '') : '';
    // *** 修改点1: 使用 formatNewsDate 函数格式化日期 ***
    const formattedDate = formatNewsDate(newsItem.date, currentLang);

    let newsCoverPath = '';
    // *** 关键改动：处理 cover_url 为对象的情况 ***
    if (typeof newsItem.cover_url === 'string') {
      // 如果 cover_url 仍然是字符串 (旧格式)，直接使用
      newsCoverPath = newsItem.cover_url;
    } else if (typeof newsItem.cover_url === 'object' && newsItem.cover_url !== null) {
      // 如果 cover_url 是对象，根据 shortLang 选择对应的路径
      // 优先使用当前语言，如果当前语言没有，则尝试使用英文 'en'，否则为空
      newsCoverPath = newsItem.cover_url[shortLang] || newsItem.cover_url['en'] || '';
    }

    // 确保图片路径是绝对路径，并考虑 CDN
    // (这里的 logic 假设 newsCoverPath 已经是一个像 "/assets/news/image.png" 的路径)
    const finalCoverUrl = newsCoverPath ? `/${newsCoverPath.startsWith('/') ? newsCoverPath.substring(1) : newsCoverPath}` : '';

    const newsLink = document.createElement('a');
    newsLink.href = `/news/${newsItem.id}/?lang=${currentLang}`; // 绝对路径
    newsLink.className = 'news-list-item-link';

    const newsCard = document.createElement('div');
    newsCard.className = 'news-list-item';

    newsCard.innerHTML = `
      ${finalCoverUrl ? `<img src="${finalCoverUrl}" alt="${newsTitle} Cover" class="news-cover">` : ''}
      <div class="news-content-text">
        <h3>${newsTitle}</h3>
        <div class="news-title-divider"></div> ${newsSummary ? `<p class="news-summary">${newsSummary}</p>` : ''}
      </div>
      <p class="news-date">${formattedDate}</p> `;

    newsLink.appendChild(newsCard);
    container.appendChild(newsLink);
  });
}

// 接收 t 和 currentLang 参数，以及 config (用于 resolvePath)
async function renderSingleNews(newsId, newsData, shortLang, container, t, currentLang, config) {
  const newsItem = newsData.find(item => item.id === newsId);

  if (!newsItem) {
    container.innerHTML = `<p>${t['NewsNotFound'] || 'News not found.'}</p>`;
    container.className = 'card news-detail-container';
    return;
  }

  let markdownContent = '';
  // 确保这里的 Markdown 文件路径是绝对路径，并支持 CDN
  // newsItem.file 可能是 "first-news"
  // 那么路径应该是 /news/first-news.zh.md 或 /news/first-news.en.md
  // 并且这个路径需要通过 resolvePath 处理

  // 临时方案：在 news.js 内部定义一个简化的 resolvePath，或者从 main.js 导入
  // 考虑到 modularity，我们应该导入 resolvePath 或者在这个模块内定义一个
  // 鉴于 main.js 已经有了，我们尝试从 main.js 导入
  // 但是，如果 main.js 中的 resolvePath 不是 export 的，那就有点麻烦了

  // 假设 config 包含了 cdnBase 和 useCdn，我们在 news.js 也需要一个 resolvePath
  // 为了避免重复代码，我们可以让 main.js export resolvePath
  // 但目前，我们先在 news.js 内部创建一个类似的，以便独立运行
  const newsResolvePath = (p) => {
    if (!p) return '';
    if (config.useCdn && config.cdnBase) { // 确保 cdnBase 存在
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

  // 确保 marked 已加载到全局作用域 (通常由 <script src="...marked.min.js"></script> 解决)
  const renderedHtml = window.marked ? window.marked.parse(markdownContent) : markdownContent;
  if (!window.marked) {
    console.warn("Marked.js is not loaded. Markdown content will be displayed as plain text.");
  }

  const formattedDate = formatNewsDate(newsItem.date, currentLang);

  // 构建返回按钮的HTML字符串
  const backButtonHtml = `
    <div style="text-align: center; margin-top: 30px;">
        <a href="/news/?lang=${currentLang}" class="adaptive-btn" id="back-to-news-list-btn">${t['BackToNewsList'] || 'Back to News List'}</a>
    </div>
  `;

  container.innerHTML = `
    <h2 class="news-detail-title">${newsItem.title[shortLang] || newsItem.title['en']}</h2>
    <div class="news-detail-date-wrapper">${formattedDate}</div> <div class="news-detail-content">${renderedHtml}</div>
    ${backButtonHtml}
  `;
  container.className = 'card news-detail-container';
  document.title = (newsItem.title[shortLang] || newsItem.title['en'] || 'News') + ' - PvZ2: SHUTTLE';
  window.scrollTo(0, 0);
}