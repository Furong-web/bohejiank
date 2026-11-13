# 薄荷健康小程序

面向减肥人群的一站式健康减脂微信小程序，采用**前后端分离**架构。

- **前端**：uni-app + Vue2（打开即用，无需额外 UI 依赖，内置薄荷绿自研组件样式）
- **后端**：Node.js + Express
- **数据库**：MySQL
- **鉴权**：JWT + bcrypt 密码加密，登录状态保持 7 天

## 功能清单

| 模块 | 说明 |
| --- | --- |
| 开屏宣传页 | 品牌展示、功能亮点、倒计时自动进入 |
| 首页 | 今日概览（体重/摄入/消耗/连续天数）、8 个快速通道入口、今日推荐文章 |
| 热量查询 | 48 种食物热量速查，关键字/分类筛选、分页加载、按克数计算并记录摄入 |
| BMI 自测 + 减脂工具 | BMI 分级评估（中国标准）、BMR 基础代谢、TDEE 每日总消耗、建议摄入与达成周期估算 |
| 运动消耗 | 24 种运动 MET 检索，按时长/体重估算消耗并一键记录 |
| 每日打卡 | 日期选择、体重/摄入/消耗/备注，每人每天一条，数据云端持久化 |
| 打卡历史 | 分页列表、删除记录 |
| 减肥知识库 | 8 篇科学减脂文章，搜索/分类/分页，阅读量统计，收藏与取消收藏 |
| 数据统计 | 近 7/30 天汇总（当前体重、体重变化、日均摄入/消耗、打卡/连续天数），体重折线图 + 摄入消耗柱状图（Canvas 自绘） |
| 导出数据 | 打卡记录导出 CSV（含 BOM，Excel 打开不乱码），支持微信文件分享与剪贴板兜底 |
| 个人中心 | 编辑资料、修改密码（bcrypt 加密）、我的收藏、退出登录 |

## 目录结构

```
薄荷健康小程序/
├── pages/                  # uni-app 页面（20 个）
│   ├── splash/             # 开屏宣传页
│   ├── home/               # 首页（快速通道）
│   ├── login/ register/    # 登录 / 注册
│   ├── food/               # 热量查询 / 食物详情
│   ├── tools/              # BMI 自测 / 运动消耗
│   ├── record/             # 记录 Tab / 每日打卡 / 打卡历史
│   ├── knowledge/          # 知识库 / 文章详情 / 我的收藏
│   └── mine/               # 我的 / 资料 / 密码 / 统计 / 导出 / 使用说明
├── components/mint-chart/  # 自研 Canvas 折线图/柱状图组件
├── utils/                  # 请求封装 / 计算工具 / 配置
├── static/tab/             # tabBar 图标（81x81 透明底）
├── pages.json              # 页面与 tabBar 配置
├── manifest.json           # 小程序应用配置
└── server/                 # Node.js 后端
    ├── app.js              # 服务入口
    ├── config.js           # 端口 / JWT / MySQL 配置
    ├── database.sql        # 建库建表 + 种子数据
    ├── scripts/init-db.js  # 数据库初始化脚本
    └── routes/             # auth / user / foods / exercises / articles / checkins
```

## 环境要求

- Node.js >= 16（本机已验证 v22）
- MySQL 5.7+ / 8.0
- HBuilderX（或微信开发者工具配合 uni-app CLI）
- 微信开发者工具

## 一、启动后端

```bash
# 1. 进入后端目录
cd server

# 2. 安装依赖
npm install

# 3. 配置数据库连接（按需修改 host/user/password）
#    编辑 server/config.js 中的 db 字段，默认:
#    127.0.0.1:3306  root  空密码  数据库名 mint_health

# 4. 初始化数据库（建库建表 + 种子数据 + 演示账号）
npm run init-db

# 5. 启动服务（默认 http://127.0.0.1:3000）
npm start
```

看到 `薄荷健康后端服务已启动` 即成功。

> 也可以用 MySQL CLI 手动导入：`mysql -u root -p < database.sql`，演示账号由 `npm run init-db` 创建。

## 二、运行前端

1. 用 **HBuilderX** 打开本项目根目录（含 `pages.json` 的目录）。
2. 菜单「运行 -> 运行到小程序模拟器 -> 微信开发者工具」。
   - 首次运行需在 HBuilderX 中配置微信开发者工具安装路径；
   - 微信开发者工具需开启「设置 -> 安全设置 -> 服务端口」。
3. 在 `manifest.json` 中填入自己的小程序 AppID（测试可留空使用测试号）。
4. 在微信开发者工具「详情 -> 本地设置」勾选 **不校验合法域名**（必须，否则无法访问本地后端）。
5. 编译运行后即可看到开屏宣传页。

**真机预览**：把手机与电脑连同一 WiFi，修改 `utils/config.js` 中 `BASE_URL` 为电脑局域网 IP（如 `http://192.168.1.100:3000`），再预览。

## 三、演示账号

| 用户名 | 密码 |
| --- | --- |
| demo | 123456 |

也可以自行注册新账号（密码 bcrypt 加密存储）。

## 四、接口一览

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | /api/auth/register | 注册（返回 JWT） | 否 |
| POST | /api/auth/login | 登录（返回 JWT） | 否 |
| GET | /api/auth/me | 当前用户信息 | 是 |
| PUT | /api/user/profile | 更新资料 | 是 |
| PUT | /api/user/password | 修改密码 | 是 |
| GET | /api/user/summary | 打卡/收藏/体重汇总 | 是 |
| GET | /api/user/favorites | 我的收藏（分页） | 是 |
| GET | /api/foods | 食物列表（关键字/分类/分页） | 否 |
| GET | /api/foods/:id | 食物详情 | 否 |
| GET | /api/exercises | 运动列表（分页） | 否 |
| GET | /api/articles | 文章列表（分页） | 否 |
| GET | /api/articles/:id | 文章详情（阅读量+1） | 可选 |
| POST | /api/articles/:id/favorite | 收藏/取消收藏 | 是 |
| POST | /api/checkins | 打卡（设置/累加两种模式） | 是 |
| GET | /api/checkins | 打卡历史（分页） | 是 |
| GET | /api/checkins/today | 今日记录 | 是 |
| GET | /api/checkins/bydate | 某日记录 | 是 |
| GET | /api/checkins/stats | 近 N 天统计（图表数据） | 是 |
| GET | /api/checkins/export | 导出 CSV | 是 |
| DELETE | /api/checkins/:id | 删除打卡记录 | 是 |

统一响应格式：`{ "code": 0, "msg": "ok", "data": ... }`，非 0 表示业务错误。

## 五、打包发布

1. **前端**：HBuilderX 菜单「发行 -> 小程序-微信」，生成 `unpackage/dist/build/mp-weixin`，用微信开发者工具打开该目录，上传代码并提审。
2. **后端**：部署到云服务器（如腾讯云轻量），安装 Node 与 MySQL，导入数据库后用 `npm start` 或 `pm2 start app.js` 守护运行；记得把前端 `BASE_URL` 改为线上域名（需 HTTPS 与合法域名备案）。

## 六、常见问题

| 问题 | 解决 |
| --- | --- |
| 请求失败 / 网络异常 | 确认后端已启动（访问 http://127.0.0.1:3000 应返回 JSON） |
| 真机连不上后端 | BASE_URL 改为局域网 IP，关闭电脑防火墙对应端口或放行 3000 |
| 提示「数据库不存在/表不存在」 | 在 server 目录执行 `npm run init-db` |
| MySQL 账号密码错误 | 修改 `server/config.js` 的 db 配置 |
| 图表不显示 | 打卡几天数据后自动展示；确认没有禁用 Canvas |
