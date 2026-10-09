# 网站图标自动获取

本实现用于书签/应用图标：先轻量抓取，失败且网页可达时才使用 Chromium。
不保证与用户电脑 Chrome 的结果完全相同：服务器网络、登录状态、证书和主题可能不同。

## 获取顺序

1. 读取 `data/uploads/favicons/v2` 中未过期且仍可解码的 PNG。
2. 请求书签的完整 URL，跟随最多 5 次 HTTP 重定向。
3. 用 HTML 解析器读取 `rel="icon"`，支持属性顺序、HTML 实体、
   相对路径和 `<base>`。以 32px 普通图标为优先，不把 Apple Touch Icon 放在最前。
4. 尝试最终页面站点的 `/favicon.ico` 和 `/favicon.png`。
5. 仅当取得可用 HTML 且以上失败时，启动 Chromium：
   - 每次独立浏览器/上下文，不借用或保存用户登录状态；
   - 加载网页脚本，默认等待 2.5 秒，再读取实时 DOM 中的图标；
   - 支持动态链接、data/blob URL、页面自行设置的 Cookie；
   - 不做截图，不把截图误当 favicon。
6. 降级尝试 Apple Touch Icon、manifest 图标、明确标记的 Logo。
   最后保留 New API / One API 的 `/api/status` 自定义 Logo 兼容分支，
   同样执行 URL 和图片内容校验，不让它抢占标准图标。

所有候选必须成功解码，统一输出最大 128px、保留透明通道的 PNG。
支持 PNG、ICO、JPEG、WebP、GIF 首帧及可安全光栅化的 SVG 等。
HTTP 200 的登录页、空响应和无法解码的图片不会作为成功结果保存。
不调用 Google 等外部图标服务，避免把私网站点发送到云端。

源码：`services/favicon/`，接口：`controllers/favicon/getFavicon.js`。

## 缓存和失败恢复

- 以完整 URL（不含 hash）计算键，区分同域名不同路径。
- 磁盘默认 24 小时；浏览器成功响应缓存 1 小时。
- 旧目录中的缓存不删除、不使用；前端增加 `v=2` 避免继续使用旧接口响应。
- 失败仅内存缓存 15 秒；HTTP 错误响应 `no-store`。
- 同 URL 并发抓取合并；临时文件写完后原子替换。
- 前端最多在失败后 20 秒、40 秒各重试一次；URL 改变重置状态，
  组件卸载取消重试定时器。
- 写缓存失败仍可返回已取得的图片，并记录 `WRITE_FAILED`。

## 配置

| 环境变量 | 默认值 | 用途 |
|---|---|---|
| `FAVICON_BROWSER_ENABLED` | `true` | `false` 禁用浏览器兜底 |
| `FAVICON_CHROMIUM_PATH` | `/usr/bin/chromium-browser` | Chromium 可执行文件 |
| `FAVICON_BROWSER_TIMEOUT_MS` | `12000` | 单次浏览器阶段时限，范围 3000–20000 |
| `FAVICON_BROWSER_WAIT_MS` | `2500` | DOM 加载后的动态等待，范围 200–5000 |
| `FAVICON_CACHE_TTL_HOURS` | `24` | 磁盘缓存有效期，范围 1–168 |
| `FAVICON_ALLOW_PRIVATE` | `true` | 允许 RFC1918/IPv6 ULA 内网站点 |
| `FAVICON_ALLOW_SELF_SIGNED` | `true` | 保留局域网自签名兼容；设 `false` 强制验证证书 |
| `FAVICON_BROWSER_NO_SANDBOX` | `false` | **不建议启用**，见安全边界 |

单次轻量请求 4 秒，轻量阶段 12 秒，总获取预算 30 秒（清理进程/写缓存不计入）。
最多 4 个抓取任务、16 个排队任务；最多 1 个 Chromium 任务。
静态响应上限 2 MiB、图片解码上限约 1600 万像素。
浏览器每页最多 100 次被拦截的请求、观察到的数据量超过 16 MiB 时终止；
这些是软件防护，不是容器级 CPU/内存硬配额。

## 运行与生产安全

`.docker/Dockerfile` 添加 Alpine Chromium，`.docker/chromium.sh` 仅将浏览器
子进程降权为 `node`，保留 Flame 原有启动身份与 Docker socket 兼容性。
Docker 镜像将 `FAVICON_CHROMIUM_PATH` 设为 `/usr/local/bin/flame-chromium`。
包装脚本只修改本次 Puppeteer 临时 profile 目录的属主；不改 Docker 网络。
构建后需在预发布环境检查主机是否允许 Chromium sandbox 使用所需的命名空间。
如果 sandbox 不可用，浏览器阶段记录失败并继续图标降级，应用本身不会退出。
**不要为省事启用 `privileged` 或默认关闭 sandbox。**

非容器开发环境需安装 Chromium，并设置 `FAVICON_CHROMIUM_PATH`；
`puppeteer-core` 不会下载浏览器。缺少浏览器只影响动态兜底。

公开接口只能抓取已经保存为书签/应用的完整 URL，不能用于任意地址浏览。
为兼容现有 `<img>`，图标接口不要求用户的自定义认证头；
它不提供书签枚举接口，但知道私有书签完整地址的人仍可能访问其图标。
不要把 Flame 的此接口无保护地暴露到公网。

网络抓取禁止 URL 中的账号密码、非 HTTP(S)、回环、链路本地/云元数据、
组播等目标；内网业务地址默认允许。
浏览器拦截非 GET/HEAD、子框架导航、弹窗、下载及部分非必要资源。
网页仍会执行第三方脚本、GET 请求，DNS 检查也不等同于防火墙隔离；
请仅添加可信站点，并使用容器资源上限及网络访问控制作为纵深防护。
浏览器不复用管理员登录 Cookie，不自动登录。
浏览器启动环境只传递必要的系统变量，不继承 Flame 密码、JWT secret 等；
调试连接使用管道，不开放远程调试端口。

`FAVICON_BROWSER_NO_SANDBOX=true` 仅为已经具备外部隔离的特殊环境提供，
会降低安全性，必须显式评估；不能将其视为生产推荐配置。

生产路由不可达仍会导致 `HOST_UNREACHABLE`，此功能不修改路由，也不能绕过网络故障。

## 排障与验证

日志格式：`[favicon] {"key":"URL哈希","stage":"page|icon|browser|...","code":"..."}`。
不记录 Cookie、响应正文或带查询参数的原始 URL。
错误响应区分 `INVALID_URL`、`UNREGISTERED_SITE`、`ADDRESS_BLOCKED`、
`HOST_UNREACHABLE`、`ICON_NOT_FOUND`、`BUSY` 等。

```bash
npm run test:favicon
CI=true npm test --prefix client -- --watchAll=false --runInBand useFavicon.test.tsx
npm run build --prefix client

# 指定已安装的浏览器，运行真实 Chromium 集成测试。
FAVICON_CHROMIUM_PATH=/path/to/chromium npm run test:favicon:browser
```

测试使用临时 HTTP 服务和临时缓存，不访问生产实例，不改正式数据库。

官方参考：
- https://pptr.dev/api/puppeteer.browser.createbrowsercontext
- https://pptr.dev/guides/network-interception
- https://pptr.dev/troubleshooting
- https://sharp.pixelplumbing.com/api-input/
- https://html.spec.whatwg.org/multipage/links.html#rel-icon
