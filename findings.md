# 实现依据

- 当前服务 Node 20 Alpine；后端 CommonJS，前端 React 17。
- 已有未提交改动包括卡片、表单、API 路由及旧图标控制器；保留无关改动。
- 旧控制器同步写盘，按 origin 永久缓存；用正则解析 HTML，Touch Icon 固定优先，未校验图片。
- puppeteer-core 24.43.1 支持 Node >=18；cheerio 1.0.0 支持 >=18.17；sharp 0.34.5 支持 Node 20。
- 本地已有 Playwright Chromium 二进制，可用于真实浏览器集成测试，无需启动 Docker。
- 官方依据：Puppeteer Browser.createBrowserContext（隔离 cookies/cache）、LaunchOptions、request interception；sharp input metadata（仍需完整解码而非仅 metadata）。
- 不使用云端图标接口，避免泄露内网站点；不自动绕过 Chromium sandbox。
- 最终浏览器环境仅保留系统变量，调试使用 pipe，防止继承服务密码等敏感环境。
- Docker wrapper 只降低浏览器权限，未改变原应用启动身份，避免影响可选 Docker socket 集成。
- npm 为 Puppeteer 的依赖约束将 ws 由 8.13.0 合并升级到兼容原 ^8.2.3 的 8.21.3；其余既有包版本未改变。
- 本机真实 Chromium 测试以 root 运行，因此仅测试命令显式 NO_SANDBOX=true；未验证目标 Docker sandbox，代码默认保持开启。
