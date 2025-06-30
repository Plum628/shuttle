// 导入 main.js 的 render 函数，尽管当前代码中没有直接使用，但保留以防未来需要
import { render as mainRender } from './main.js'; 

export async function initNews(config, newsJsonPath) {
  const newsResponse = await fetch(new URL(newsJsonPath, window.location.origin));
  const newsData = await newsResponse.json();

  const urlParams = new URLSearchParams(window.location.search);
  let currentLang = urlParams.get('lang');
  if (!currentLang) {
    currentLang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  }
  const shortLang = currentLang.startsWith('zh') ? 'zh' : 'en';

  const newsContentArea = document.getElementById('news-content-area');
  
  const textsResponse = await fetch(new URL(config.textsJson, window.location.origin));
  const textsJson = await textsResponse.json();
  const t = textsJson[shortLang];
  
  // *** 关键改动1: 从 URL 路径中解析 newsId ***
  let newsId = null;
  const pathParts = window.location.pathname.split('/').filter(part => part !== ''); // 过滤掉空字符串
  
  // 查找 'news' 在路径中的位置
  const newsPathIndex = pathParts.indexOf('news');

  if (newsPathIndex > -1 && newsPathIndex + 1 < pathParts.length) {
    // 'news' 后面紧跟的部分很可能是 ID
    const potentialId = pathParts[newsPathIndex + 1];
    // 简单检查 potentialId 是否看起来像一个ID（例如，不是另一个目录名或空字符串）
    // 这里假设你的新闻ID不会包含斜杠
    if (newsData.some(item => item.id === potentialId)) { // 检查ID是否在新闻数据中存在
        newsId = potentialId;
    }
  }


  if (newsId) {
    // 传递 t 和 currentLang 给 renderSingleNews，以便它能生成按钮
    await renderSingleNews(newsId, newsData, shortLang, newsContentArea, t, currentLang);
  } else {
    renderNewsList(newsData, currentLang, shortLang, newsContentArea, t);
  }

  const langSelect = document.getElementById('lang-select');
  if (langSelect) {
    if (!langSelect.dataset.newsListenerAdded) {
      langSelect.addEventListener('change', async (e) => {
        const newLang = e.target.value;
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('lang', newLang);
        history.replaceState(null, '', currentUrl.toString());

        const updatedTextsResponse = await fetch(new URL(config.textsJson, window.location.origin));
        const updatedTextsJson = await updatedTextsResponse.json();
        
        // 重新调用 initNews 来刷新新闻内容
        initNews(config, newsJsonPath); 
      });
      langSelect.dataset.newsListenerAdded = 'true';
    }
  }
}

function renderNewsList(newsData, currentLang, shortLang, container, t) {
  container.innerHTML = '<h2>' + t['NewsListTitle'] + '</h2>';
  container.className = 'card news-list-container';

  newsData.sort((a, b) => new Date(b.date) - new Date(a.date));

  newsData.forEach(newsItem => {
    const newsTitle = newsItem.title[shortLang] || newsItem.title['en'] || 'Untitled';
    const newsSummary = newsItem.summary ? (newsItem.summary[shortLang] || newsItem.summary['en'] || '') : '';
    const newsDate = newsItem.date;
    const newsCoverUrl = newsItem.cover_url; // 例如：'assets/news_covers/123.jpg'

    const newsLink = document.createElement('a');
    newsLink.href = `/news/${newsItem.id}/?lang=${currentLang}`;
    newsLink.className = 'news-list-item-link';
    
    const newsCard = document.createElement('div');
    newsCard.className = 'news-list-item';

    // *** 关键改动：将 newsCoverUrl 转换为绝对路径 ***
    // 假设 newsCoverUrl 存储在 news.json 中是相对于根目录的路径，例如 "assets/news_covers/123.jpg"
    // 我们需要确保在前面加上一个斜杠，使其成为绝对路径
    const absoluteCoverUrl = newsCoverUrl ? `/${newsCoverUrl.startsWith('/') ? newsCoverUrl.substring(1) : newsCoverUrl}` : '';

    newsCard.innerHTML = `
      ${newsCoverUrl ? `<img src="${absoluteCoverUrl}" alt="${newsTitle} Cover" class="news-cover">` : ''}
      <div class="news-content-text">
        <h3>${newsTitle}</h3>
        <div class="news-title-divider"></div> ${newsSummary ? `<p class="news-summary">${newsSummary}</p>` : ''}
      </div>
      <p class="news-date">${newsDate}</p>
    `;
    
    newsLink.appendChild(newsCard);
    container.appendChild(newsLink);
  });
}

// 接收 t 和 currentLang 参数
async function renderSingleNews(newsId, newsData, shortLang, container, t, currentLang) {
  const newsItem = newsData.find(item => item.id === newsId);

  if (!newsItem) {
    container.innerHTML = '<p>新闻未找到。</p>';
    container.className = 'card news-detail-container';
    return;
  }

  let markdownContent = '';
  // 注意：这里的 markdown 文件路径仍然是相对于 news 目录的，不受 URL 美化影响
  const preferredLangPath = `/news/${newsItem.file}.${shortLang}.md`;
  const fallbackLangPath = `/news/${newsItem.file}.en.md`;

  try {
    let response = await fetch(new URL(preferredLangPath, window.location.origin));
    if (!response.ok) {
      response = await fetch(new URL(fallbackLangPath, window.location.origin));
      if (!response.ok) {
        throw new Error('Markdown file not found for any language.');
      }
    }
    markdownContent = await response.text();
  } catch (error) {
    console.error('Error fetching markdown:', error);
    container.innerHTML = '<p>无法加载新闻内容。</p>';
    container.className = 'card news-detail-container';
    return;
  }

  const renderedHtml = marked.parse(markdownContent);

  // 构建返回按钮的HTML字符串
  // *** 关键改动3: 修改返回按钮的 href ***
  const backButtonHtml = `
    <div style="text-align: center; margin-top: 30px;">
        <a href="/news/?lang=${currentLang}" class="adaptive-btn" id="back-to-news-list-btn">${t['BackToNewsList']}</a>
    </div>
  `;

  container.innerHTML = `
    <h2 class="news-detail-title">${newsItem.title[shortLang] || newsItem.title['en']}</h2>
    <div class="news-detail-date-wrapper">${newsItem.date}</div> <div class="news-detail-content">${renderedHtml}</div>
    ${backButtonHtml}
  `;
  container.className = 'card news-detail-container';
  document.title = (newsItem.title[shortLang] || newsItem.title['en']) + ' - PvZ2: SHUTTLE';
  window.scrollTo(0, 0);
}