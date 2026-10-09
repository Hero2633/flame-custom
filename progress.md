# 进度

- 已读取当前代码、依赖清单及 Dockerfile；确认只在本地实现。
- 已检查现有变更，未连接生产环境。
- 正在设计静态抓取与浏览器兜底共用的 URL、图片验证和缓存接口。
- 已新增抓取服务模块；原控制器尚待接入。
- 依赖安装首次因 registry.npmjs.org ECONNRESET 失败；准备降低并发重试，不修改全局 npm 配置。
- icojs 0.19.6 不存在，已核实选用支持 Node 20 的 0.19.5。
- 降低 npm 并发后依赖安装成功；固定直接依赖版本并更新 lockfile。
- 首批 15 项后端测试全部通过；新增真实 Chromium 和前端 hook 测试。
- 控制器只允许数据库中已保存的 URL 触发抓取；不更改现有书签数据。
- Dockerfile 增加 Chromium 及 su-exec；最终审查改为只降权浏览器子进程，保留 Flame 原有运行身份及可选 Docker socket 访问，默认不关闭 sandbox。
- 真实 Chromium 4 项测试通过（动态 Cookie 图标、blob 图标、导航超时后恢复、启动失败降级）。
- 前端首轮发现测试 act 回调返回值不满足 TS 类型，以及 React/Jest 自身定时器影响总数断言；修正测试为 void 回调并检查定时器清理调用。
- 前端 3 项测试及 TypeScript 检查已通过。CI 构建被项目原有其他文件的 ESLint warning 阻断；本次改动文件无对应告警，不扩散修改，另跑普通生产构建。
- 最终后端/真实 Chromium 联合测试：23/23 通过，无跳过；项目已有 ICO 额外解码验证成功。
- 前端：3/3 通过；TypeScript 检查通过；本次变更的四个前端文件 ESLint --max-warnings=0 通过。
- 普通生产构建成功，有项目既存警告；严格 CI 构建未通过（既存 ESLint warning 被视为 error）。
- Jest detectOpenHandles 将延迟退出提示定位为现有 Babel 私有属性插件的提示定时器，不是新增 hook。
- shell 语法、Node 语法、git diff --check、依赖树检查通过。测试后未发现对应 Chromium 进程残留。
- 未使用 Docker CLI、未构建镜像、未连接生产、未修改路由；正式 data 缓存未新增 v2（测试全部使用临时目录）。
- Docker wrapper 和 Alpine sandbox 仍需镜像构建/预发布验收，未宣称已验证。

## 构建 flame-custom:2.4.2
- 已确认 Docker context=default，endpoint=unix:///var/run/docker.sock，平台 linux/amd64，目标标签不存在。
- 读取 Dockerfile、浏览器包装脚本和 dockerignore；不修改源码，仅过滤构建上下文中的本地 .env、Git 历史及归档。
- 当前目录可用磁盘约 117 GiB；标准 /var/lib/docker 路径不存在，不据此推断 daemon 存储路径。
- Docker 实际存储 /data/docker-root，可用空间约 850 GiB。
- 构建日志：`/tmp/flame-custom-2.4.2-build.XdmaG4.log`。
- 后端依赖安装成功；前端在 Node 20 Alpine 构建环境编译成功，保留现有 ESLint/Babel 告警。
- npm 构建审计报告后端 50 项漏洞（含 31 high、6 critical）、前端构建依赖 73 项漏洞（含 34 high、5 critical）；本轮未自动升级依赖。
- 重新运行本地后端测试：20 通过、3 个需显式启用的真实浏览器用例跳过；无失败。
- 当前等待 Chromium 149.0.7827.53 及运行库首次下载完成，尚未宣称镜像完成。
- 构建已成功（退出码 0），镜像标签 `flame-custom:2.4.2` 已通过 image inspect/image ls 核验。
- 镜像 ID：`sha256:6e6449390c9095591487344ca76553d770013c1b80d59abff97c3481081f7241`。
- 平台 `linux/amd64`，Docker 报告大小 1,596,786,355 bytes（约 1.6 GB）。
- 构建保留既有 PASSWORD ENV 与 FROM/as 大小写警告；未改源码或依赖解决告警。
- 未启动/替换任何业务容器，未导出/推送镜像，未连接生产或修改路由；目标镜像的 sandbox 运行验收未执行。

## 方案 A 启动验证
- 按用户指令仅修改 `docker-compose.yaml`，增加 `VERSION=${VERSION:-2.4.2}`；未修改镜像或数据文件。
- 执行 `docker compose up -d --no-deps flame`，仅重建/启动 `flame` 服务。
- 容器现为 `Up`，restart_count=0，映射 `5005:5005`；启动日志显示数据库迁移完成、数据库已连接、服务监听 5005。
- `curl http://127.0.0.1:5005/` 返回 HTTP 200，Content-Type 为 HTML。
- 注意：项目 `.env` 已有 `VERSION=2.4.0`，Compose 插值优先使用该值；容器实际为 `VERSION=2.4.0`，所以并非 2.4.2。若要求备份版本严格跟随镜像，应后续改为显式 `VERSION=2.4.2` 或更新 `.env`，本轮未擅自改动。
- 只读确认其他容器仍在运行，未对其执行操作；日志中的一次 `Token expired` 与启动成功无关。

## VERSION 崩溃修复
- `db/utils/slugify.js` 现在优先使用合法的数字点分版本；缺失或非法时回退到 `package.json` 版本，阻止 `undefined.replace()` 和路径注入。
- 新增 `tests/db/slugify.test.js` 覆盖环境变量优先、缺失和非法值。
- 本修复只涉及备份文件名生成，不修改数据库内容、现有备份或 Clash/网络逻辑。

## flame-custom:2.4.3 构建
- 首次构建因 Docker Hub 匿名 token 请求 EOF 失败；重试后成功，未修改网络或 Docker 配置。
- 镜像标签：`flame-custom:2.4.3`；ID：`sha256:5816ec5b88b8f0196af06294562ed46bca80e4ace488d2fa78a571408abe31bf`。
- 平台 `linux/amd64`，大小约 1.6 GB。
- 使用临时 Node 容器验证镜像内 VERSION 缺失回退，输出 `db-010-backup.sqlite`；未启动 Flame 服务。
- 构建存在既有 `FROM/as` 大小写及 PASSWORD ENV 警告；未自动处理。
