// server.js

// 导入必要的模块
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// 模拟 CommonJS 的 __dirname 和 __filename
// 在 ES 模块中，__dirname 和 __filename 不直接可用，需要手动构造
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000; // 可以通过环境变量设置端口，默认为 3000

// --- 1. 静态文件服务 ---
// Express 的 express.static 中间件用于提供静态资源
// 我们将项目根目录设置为静态文件服务目录，这样浏览器就可以直接访问
// index.html, news.html, assets/, js/ 等
app.use(express.static(__dirname));

// --- 2. URL 重写 / 路由处理 ---

// 路由到新闻详情页：/news/:id 形式的 URL
// 例如: /news/first-news/, /news/second-news/?lang=zh-CN
app.get('/news/:id', (req, res) => {
    // 这里的 req.params.id 会捕获 URL 中的 ID (例如 'first-news')
    // req.query.lang 会捕获查询参数 (例如 'zh-CN')

    // 无论请求的 ID 是什么，我们都返回 news.html 文件。
    // 前端的 news.js 会负责从 window.location.pathname 中解析出 ID
    // 并根据 ID 从 news.json 和 Markdown 文件中加载内容。
    res.sendFile(path.join(__dirname, 'news.html'));
});

// 路由到新闻列表页：/news/ 或 /news
app.get('/news', (req, res) => {
    res.sendFile(path.join(__dirname, 'news.html'));
});

// 路由到主页：/ 或 /index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 处理所有其他未匹配的请求 (可选：404 页面)
app.use((req, res) => {
    res.status(404).send('404 Not Found - Custom Node.js Server');
});


// --- 3. 启动服务器 ---
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});