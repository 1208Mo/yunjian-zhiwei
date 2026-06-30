---
name: yunjian-zhiwei-dev
description: 云间知味（yunjian-zhiwei）AI 荐餐应用的开发指南。当在该项目中新增/修改页面、组件、Context store、AI 接口、SSE 流式逻辑、千帆 ERNIE 调用、本地回落引擎，或需要遵循项目既有约定（React 18 + Vite + TailwindCSS 前端，Express 本地后端 + Vercel Serverless 双端共用 api/_lib，hash 路由，纯静态可降级）时，务必使用本 skill。涉及「今日菜单 / 趣味荐餐 / TA来挑菜共识 / 拍照识别食材 / 分享房间」等功能开发也应触发。
---

# 云间知味 开发指南

「云间知味」是一个帮中国年轻人决定「今天吃什么」的 AI 荐餐 Web 应用。前端 React + Vite + Tailwind，后端用千帆 ERNIE 大模型生成菜单，**本地 Express 与 Vercel Serverless 共用同一套业务逻辑**，且在拿不到后端时能降级到本地规则引擎。开发时遵循下面的既有约定，保持一致性。

## 技术栈与运行方式

- **前端**：React 18.3 + Vite 5.4 + React Router 6（**hash 路由**，因为部署到纯静态托管）+ TailwindCSS 3.4
- **后端**：Node 20 + Express（`server/index.js`，本地开发）/ Vercel Serverless（`api/*.js`，生产），二者业务逻辑共用 `api/_lib/`
- **大模型**：百度智能云千帆 ERNIE（OpenAI 兼容接口），密钥只留服务端（`QIANFAN_API_KEY`）
- **状态**：React Context（无 Redux），provider 嵌套在 `src/App.jsx`
- **dev**：`npm run dev` 同时起 Vite 与 Express（Vite 把 `/api` 代理到 `:8787`）

## 目录与职责

```
src/
  pages/      路由页：业务逻辑（生成、轮询、表单态）放这里
  components/ 纯 UI 组件（卡片、chip、进度条等），不含业务逻辑
  store/      Context provider（*.jsx），跨页共享 + localStorage 持久化
  api/client.js  前端 API 客户端：postJson / streamSse 封装
  engine/recommend.js  本地规则推荐引擎（AI 失败时的回落）
  data/       本地菜谱库 recipes.js、趣味数据 fun.js
  utils/      menu 归一化、剪贴板、图片压缩等纯函数
api/
  *.js        Vercel Serverless 函数（menu/dish/fun/pick/vision/room/health）
  _lib/qianfan.js  大模型调用 + 所有 prompt 构造（核心共享逻辑）
  _lib/room.js     分享房间存储
server/index.js  本地 Express，路由与 api/*.js 一一对应
```

**关键原则：页面承担业务逻辑（调用、轮询、回落决策），组件保持纯 UI。** 参考 `src/pages/Consensus.jsx`、`src/pages/TodayMenu.jsx`。

## 新增/修改一个 AI 接口（端到端链路）

后端逻辑必须**本地 Express 与 Vercel Serverless 双端一致**，做法是把 prompt 构造与模型调用都放进 `api/_lib/qianfan.js`，两端只做路由薄封装。新增一个 AI 接口按以下步骤：

1. **写 prompt 构造**：在 `api/_lib/qianfan.js` 加 `buildXxxPrompt(body)`，返回 `{ system, user }`。严格约定模型**输出 JSON**，在 system 里写明完整 JSON 结构，并把硬性约束（忌口/厨具/数量）写清楚。
2. **加 Serverless 路由**：在 `api/xxx.js` 调用 `buildXxxPrompt` + `callErnie` / `callErnieStream`，再 `parseJsonLoose` 解析。
3. **加本地路由**：在 `server/index.js` 加对应的 `app.post("/api/xxx")`，逻辑与第 2 步保持一致（流式接口直接复用 `streamJson(res, system, user, resultKey)`）。
4. **加前端调用**：在 `src/api/client.js` 用 `postJson` 或 `streamSse` 封装一个导出函数。
5. **页面接入**：在对应 page 调用，并准备**本地回落**（AI 失败时走 `engine/recommend.js` 或本地数据，**静默降级，不向用户暴露「AI 不可用」**）。

### 流式（SSE）约定

长输出（菜单/点菜单）走 SSE 让前端边生成边展示。后端事件格式固定：

```
event: delta  data: { text }      逐块增量文本
event: done   data: { [key]: 解析后的对象 }   最终结果
event: error  data: { error }     失败信息
```

后端用 `callErnieStream(system, user, onDelta)` 拿增量，结束时 `parseJsonLoose(full)` 解析并发 `done`。前端用 `streamSse(path, body, onDelta)`，`onDelta(text)` 用于驱动「正在生成」进度，返回值是 `done` 里的对象。默认整体超时 120s（菜单生成常需 30~80s）。

### 模型调用注意

- `callErnie` / `callErnieStream` 默认模型 `ernie-3.5-8k`，视觉用 `callErnieVision`（默认 `ernie-4.5-turbo-vl-32k`）。模型可经 `QIANFAN_MODEL` / `QIANFAN_VL_MODEL` 覆盖。
- 所有调用走 `fetchWithRetry`，对 401/429/5xx 做指数退避重试（瞬时限流常见）。新接口直接复用，别自己写 fetch。
- `max_tokens` 按模型区分（3.5 上限 2048，其它 4096），用 `maxTokensFor(model)`。
- **解析模型 JSON 一律用 `parseJsonLoose`**：它会清洗 markdown 围栏、结尾多余逗号、模型漏写字段名等常见脏数据。不要直接 `JSON.parse`。

## 新增一个跨页共享状态（store）

参考 `src/store/menuResult.jsx`：

- 用 `createContext` + `Provider` + `useXxx()` hook 三件套。
- 需要刷新不丢的数据，约定 localStorage key 形如 `yjzw.xxx.vN`；**只持久化稳定结果态，loading/error 不持久化**（`loadPersisted` 时强制 `loading:false, error:""`）。
- 新 provider 记得按层级加进 `src/App.jsx` 的嵌套结构里。

## 样式约定

- Tailwind 工具类优先，主题色在 `tailwind.config.js`：暖陶土棕（brand）+ 暖中性灰（ink）。
- 移动端优先：`max-w-md` 容器；已有 `fadeup/pop/shimmer/float/wiggle` 等自定义动画可直接用。

## 改动后自检

- 改了 AI 接口：确认 `api/*.js` 与 `server/index.js` 两端逻辑一致。
- 改了前端：`npm run dev` 本地验证；注意拿不到后端时本地回落是否仍能正常出结果。
- 不要把密钥写进前端或提交进仓库。
