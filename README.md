# Vue AMap Trajectory Player

一个基于 Vue3 + TypeScript 的高德地图轨迹播放演示项目，展示如何实现轨迹播放控制、速度调节、进度控制等功能。这是一个学习和参考用的示例项目，而非可复用的组件库。

## 功能特性

- 🎮 **轨迹播放控制** - 支持播放、暂停、停止、重新播放
- ⚡ **速度调节** - 支持 1x、2x、4x 多种播放速度
- 📊 **进度控制** - 支持拖拽进度条跳转到指定位置
- 🗺️ **地图跟随** - 支持地图视角跟随轨迹移动
- 📱 **响应式设计** - 适配不同屏幕尺寸
- 🎯 **TypeScript 支持** - 完整的类型定义

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **高德地图 API** - 地图服务和轨迹动画
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Vite** - 快速的前端构建工具

## 安装

```bash
# 克隆项目
git clone https://github.com/your-username/vue-amap-trajectory-player.git

# 进入项目目录
cd vue-amap-trajectory-player

# 安装依赖
npm install
```

## 配置

1. 获取高德地图 API Key
   - 访问 [高德开放平台](https://lbs.amap.com/)
   - 注册账号并创建应用
   - 获取 Web 端 API Key

2. 配置环境变量
   ```bash
   # 复制环境变量示例文件
   cp .env.example .env
   ```
   
   然后在 `.env` 文件中填入你的高德地图 API Key：
   ```
   VITE_AMAP_API_KEY=your_actual_api_key_here
   ```
   
   ⚠️ **注意**: `.env` 文件包含敏感信息，请勿提交到版本控制系统

## 使用

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 项目结构

```
src/
├── components/
│   ├── Amap.vue              # 高德地图轨迹播放组件
│   └── TrajectoryPlayer.vue  # 轨迹播放器控制面板
├── composables/
│   └── useTrajectoryPlayer.ts # 轨迹播放器 hooks
├── docs/
│   └── useTrajectoryPlayer-hooks-documentation.md # hooks 技术文档
├── pages/
│   ├── HomePage.vue          # 主页面
│   └── TrajectoryPlayerV2.vue # hooks 版本轨迹播放器
├── router/
│   └── index.ts              # 路由配置
├── style.css                 # 全局样式
└── main.ts                   # 应用入口
```

## 核心组件

### Amap.vue
主要的地图组件，包含：
- 地图初始化和配置
- 轨迹数据生成和处理
- Marker 动画控制
- 播放状态管理

### TrajectoryPlayer.vue
轨迹播放控制面板，包含：
- 播放/暂停/停止按钮
- 速度调节控制
- 进度条和时间显示
- 地图跟随开关

### useTrajectoryPlayer Hooks
基于 Vue 3 Composition API 的轨迹播放器 hooks，提供：
- 完整的播放控制功能
- 响应式状态管理
- 多速度播放支持
- 精确进度控制
- 视角跟随功能
- 性能优化的实现

📖 **详细文档**: [useTrajectoryPlayer Hooks 技术文档](src/docs/useTrajectoryPlayer-hooks-documentation.md)

### TrajectoryPlayerV2.vue
使用 hooks 重构的轨迹播放器页面，展示了如何使用 `useTrajectoryPlayer` hooks 来实现轨迹播放功能。

## API 说明

### 播放控制
- `play()` - 开始播放轨迹
- `pause()` - 暂停播放
- `stop()` - 停止播放并重置
- `resume()` - 恢复播放

### 速度控制
- `changeSpeed(speed: number)` - 改变播放速度
- 支持速度：1, 2, 4

### 进度控制
- `onProgressChange(progress: number)` - 跳转到指定进度
- 进度范围：0-100

## 开发

```bash
# 代码检查
npm run lint

# 代码格式化
npm run lint:fix

# 类型检查
npm run check
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础轨迹播放功能
- 支持播放控制和速度调节
- 支持进度控制和地图跟随