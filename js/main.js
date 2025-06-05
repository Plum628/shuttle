
export async function init(config, textsJsonPath, iconsJsPath) {
  const textsResponse = await fetch(textsJsonPath);
  const textsJson = await textsResponse.json();
  const iconsModule = await import(iconsJsPath);
  const ICON_YOUTUBE    = iconsModule.ICON_YOUTUBE;
  const ICON_BILIBILI   = iconsModule.ICON_BILIBILI;
  const ICON_QQ         = iconsModule.ICON_QQ;
  const ICON_QQ_CHANNEL = iconsModule.ICON_QQ_CHANNEL;
  const ICON_DISCORD    = iconsModule.ICON_DISCORD;

  function render(selectedLangCode) {
    const USE_YOUTUBE    = ICON_YOUTUBE;
    const USE_BILIBILI   = ICON_BILIBILI;
    const USE_QQ         = ICON_QQ;
    const USE_QQ_CHANNEL = ICON_QQ_CHANNEL;
    const USE_DISCORD    = ICON_DISCORD;

    // 取短语言码，用于在 textsJson 中索引
    const shortLang = selectedLangCode.startsWith('zh') ? 'zh' : 'en';
    document.documentElement.lang = selectedLangCode;
    const t = textsJson[shortLang];

    // 更新 <title>
    document.title = t['Title'];

    // 动态注入自定义字体
    const fontFace = document.createElement('style');
    fontFace.textContent = `
      @font-face {
        font-family: 'PvZ2Regular';
        src: url('${config.font}') format('truetype');
      }
    `;
    document.head.appendChild(fontFace);

    // 渲染背景、logo、icon
    document.body.style.setProperty('--bg-image', `url('${config.background}')`);
    const logoEl = document.getElementById('game-title-logo');
    logoEl.src = config.logo;
    logoEl.alt = t['Title'];
    document.getElementById('game-icon').src = config.icon;

    // 渲染版本信息 & 下载标题
    document.getElementById('version').textContent = t['Version'];
    document.getElementById('title-download').textContent = t['Download'];

    // 渲染预告片
    const trailerContainer = document.getElementById('trailer-container');
    trailerContainer.innerHTML = '';
    const autoPlay = config['autoPlayTrailers'] ? '1' : '0';
    const autoMute = config['autoMuteTrailers'] ? '1' : '0';

    config.trailers[shortLang].forEach((link) => {
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

    // 渲染下载按钮
    const dlContainer = document.getElementById('downloads');
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

    // 渲染开发者 & 频道
    const devContainer = document.getElementById('developers');
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
    document.getElementById('title-developers').textContent = t['Developers'];

    // 渲染社区
    const grpContainer = document.getElementById('groups');
    grpContainer.innerHTML = '';

    // QQ 群
    Object.entries(config.social.qq_groups).forEach(([_, url], i) => {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.className = 'adaptive-btn';
      a.innerHTML = USE_QQ + t[`QQGroup${i+1}`];
      grpContainer.appendChild(a);
    });

    // QQ 频道
    const qqChannelButton = document.createElement('a');
    qqChannelButton.href = config.social.qq_channel;
    qqChannelButton.target = '_blank';
    qqChannelButton.className = 'adaptive-btn';
    qqChannelButton.innerHTML = USE_QQ_CHANNEL + t['QQChannel'];
    grpContainer.appendChild(qqChannelButton);

    // Discord
    const discordButton = document.createElement('a');
    discordButton.href = config.social.discord;
    discordButton.target = '_blank';
    discordButton.className = 'adaptive-btn';
    discordButton.innerHTML = USE_DISCORD + t['Discord'];
    grpContainer.appendChild(discordButton);
    document.getElementById('title-community').textContent = t['Community'];
  }

  // 获取 URL 中的 ?lang= 参数
  function getUrlLangParam() {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (!langParam) return null;
    return langParam.startsWith('zh') ? 'zh-CN' : 'en-US';
  }

  // 程序入口：先决定语言再调用 render
  const urlLang = getUrlLangParam();
  const browserLang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const initialLang = urlLang || browserLang;
  document.getElementById('lang-select').value = initialLang;
  render(initialLang);

  // 监听语言切换
  document.getElementById('lang-select').addEventListener('change', (e) => {
    const newLang = e.target.value;
    history.replaceState(null, '', '/?lang=' + newLang);
    render(newLang);
  });
}