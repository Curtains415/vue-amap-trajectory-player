# useTrajectoryPlayer Hooks 技术文档

## 概述

`useTrajectoryPlayer` 是一个基于 Vue 3 Composition API 的轨迹播放器 hooks，专为高德地图轨迹动画设计。它提供了完整的轨迹播放控制功能，包括播放/暂停、速度调节、进度控制和视角跟随等特性。

## 核心特性

* 🎮 **完整的播放控制**：支持播放、暂停、停止、恢复等操作

* ⚡ **多速度播放**：基于 baseDuration 动态计算的 X1、X2、X4 速度选项，支持自定义时长

* 📍 **精确进度控制**：基于距离计算的精确进度定位

* 👁️ **视角跟随**：可选的地图视角自动跟随功能

* 🔄 **响应式状态**：所有状态都是响应式的，便于 UI 绑定

* 🚀 **性能优化**：已修复视角跟随卡顿问题，确保流畅体验

## API 接口

### 类型定义

```typescript
export interface TrajectoryPlayerOptions {
  baseDuration?: number // 基础播放时长（毫秒），默认 30
}
```

### 参数

| 参数                   | 类型                      | 默认值 | 描述         |
| -------------------- | ----------------------- | --- | ---------- |
| options              | TrajectoryPlayerOptions | {}  | 配置选项       |
| options.baseDuration | number                  | 300  | 基础播放时长（毫秒） |

### 返回值

#### 响应式状态

| 属性               | 类型                                          | 描述              |
| ---------------- | ------------------------------------------- | --------------- |
| playState        | Ref<'stopped' \| 'playing' \| 'paused'>     | 播放状态            |
| currentDuration  | Ref<number>                                 | 当前播放时长（毫秒）      |
| followView       | Ref<boolean>                                | 视角跟随开关          |
| currentProgress  | Ref<number>                                 | 当前进度百分比 (0-100) |
| currentIndex     | Ref<number>                                 | 当前轨迹点索引         |
| currentPosition  | Ref<\[number, number] \| null>              | 当前位置坐标          |
| trajectoryPoints | Ref<\[number, number]\[]>                   | 轨迹点数组           |
| speedOptions     | Ref\<Array<{label: string, value: number}>> | 速度选项            |

#### 计算属性

| 属性             | 类型                  | 描述       |
| -------------- | ------------------- | -------- |
| playButtonText | ComputedRef<string> | 播放按钮文本   |
| followViewText | ComputedRef<string> | 视角跟随状态文本 |

#### 方法

| 方法                          | 参数                                                        | 返回值                       | 描述         |
| --------------------------- | --------------------------------------------------------- | ------------------------- | ---------- |
| initializeTrajectory        | mapRef: any, markerRef: any, points: \[number, number]\[] | void                      | *初始化轨迹播放器* |
| togglePlay                  | -                                                         | void                      | 切换播放状态     |
| play                        | -                                                         | void                      | 开始播放       |
| pause                       | -                                                         | void                      | 暂停播放       |
| resume                      | -                                                         | void                      | 恢复播放       |
| stop                        | -                                                         | void                      | 停止播放       |
| changeDuration              | duration: number                                          | void                      | 改变播放时长（毫秒） |
| onProgressChange            | value: number                                             | void                      | 进度条变化处理    |
| toggleFollowView            | -                                                         | void                      | 切换视角跟随     |
| getPositionByProgress       | progress: number                                          | \[number, number] \| null | 根据进度获取位置   |
| calculateProgressByDistance | currentPos: {lng: number, lat: number}                    | number                    | 根据位置计算进度   |

## 使用示例

### 基础使用

```vue
<template>
  <div class="trajectory-player">
    <!-- 地图容器 -->
    <div id="map" style="width: 100%; height: 400px;"></div>
    
    <!-- 控制面板 -->
    <div class="controls">
      <button @click="togglePlay">{{ playButtonText }}</button>
      <button @click="stop">停止</button>
      <button @click="toggleFollowView">{{ followViewText }}</button>
      
      <!-- 速度控制 -->
      <div class="speed-controls">
        <button v-for="option in speedOptions" 
                :key="option.value"
                :class="{ active: currentDuration === option.value }"
                @click="changeDuration(option.value)">
          {{ option.label }}
        </button>
      </div>
      
      <!-- 进度条 -->
      <input type="range" 
             min="0" 
             max="100" 
             :value="currentProgress"
             @input="onProgressChange($event.target.value)" />
    </div>
    
    <!-- 状态显示 -->
    <div class="status">
      <span>进度: {{ currentProgress.toFixed(1) }}%</span>
      <span>位置: {{ currentIndex }}/{{ trajectoryPoints.length }}</span>
      <span>状态: {{ playState }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTrajectoryPlayer } from '@/composables/useTrajectoryPlayer'

// 初始化 hooks
const {
  // 状态
  playState,
  currentDuration,
  followView,
  currentProgress,
  currentIndex,
  trajectoryPoints,
  speedOptions,
  
  // 计算属性
  playButtonText,
  followViewText,
  
  // 方法
  initializeTrajectory,
  togglePlay,
  stop,
  changeDuration,
  onProgressChange,
  toggleFollowView
} = useTrajectoryPlayer({ baseDuration: 30 })

// 地图和标记实例
let map: any = null
let marker: any = null

// 示例轨迹数据
const generateTrajectoryPoints = (): [number, number][] => {
  const points: [number, number][] = []
  const startLng = 116.397428
  const startLat = 39.90923
  
  for (let i = 0; i < 100; i++) {
    const step = i * 0.001
    const lng = startLng + step * Math.cos(Math.PI / 4)
    const lat = startLat + step * Math.sin(Math.PI / 4)
    points.push([lng, lat])
  }
  
  return points
}

// 初始化地图
const initMap = () => {
  map = new AMap.Map('map', {
    zoom: 15,
    center: [116.397428, 39.90923]
  })
  
  marker = new AMap.Marker({
    map: map,
    position: [116.397428, 39.90923],
    icon: "https://a.amap.com/jsapi_demos/static/demo-center-v2/car.png",
    offset: new AMap.Pixel(-13, -26)
  })
  
  // 生成轨迹数据
  const points = generateTrajectoryPoints()
  
  // 绘制轨迹线
  new AMap.Polyline({
    path: points,
    showDir: true,
    strokeColor: "#28F",
    strokeWeight: 6
  }).setMap(map)
  
  // 初始化轨迹播放器
  initializeTrajectory(map, marker, points)
}

onMounted(() => {
  initMap()
})
</script>
```

### 高级配置

```typescript
// 自定义配置
const {
  // ... 其他返回值
} = useTrajectoryPlayer({
  baseDuration: 60 // 更长的基础播放时长
})

// 监听状态变化
watch(playState, (newState) => {
  console.log('播放状态变化:', newState)
})

watch(currentProgress, (progress) => {
  console.log('播放进度:', progress + '%')
})

// speedOptions 基于 baseDuration 动态计算
// X1 = baseDuration, X2 = baseDuration/2, X4 = baseDuration/4
// 例如：baseDuration = 300 时
// speedOptions = [
//   { label: 'X1', value: 300 },  // 慢速
//   { label: 'X2', value: 150 },  // 正常
//   { label: 'X4', value: 75 }    // 快速
// ]
```

## speedOptions 动态计算机制

### 概述

`speedOptions` 不再使用硬编码的固定值，而是基于 `baseDuration` 参数动态计算生成。这种设计提供了更好的灵活性和一致性。

### 计算规则

```typescript
const speedOptions = computed(() => [
  { label: 'X1', value: baseDuration.value },     // 慢速：等于基础时长
  { label: 'X2', value: baseDuration.value / 2 }, // 正常：基础时长的一半
  { label: 'X4', value: baseDuration.value / 4 }  // 快速：基础时长的四分之一
])
```

### 示例

| baseDuration | X1 (慢速) | X2 (正常) | X4 (快速) |
|--------------|-----------|-----------|----------|
| 300ms        | 300ms     | 150ms     | 75ms     |
| 600ms        | 600ms     | 300ms     | 150ms    |
| 1200ms       | 1200ms    | 600ms     | 300ms    |

### 优势

1. **统一配置**: 只需修改 `baseDuration` 即可调整所有速度档位
2. **保持比例**: 各档位之间的倍数关系始终保持一致
3. **易于维护**: 减少硬编码，提高代码可维护性
4. **灵活扩展**: 可轻松添加新的速度档位

## 与 Amap.vue 组件的对比优势

### 1. 代码复用性

* **Hooks**: 逻辑可在多个组件间复用

* **组件**: 逻辑耦合在单个组件内

### 2. 测试友好

* **Hooks**: 可独立测试业务逻辑

* **组件**: 需要完整的组件环境

### 3. 关注点分离

* **Hooks**: 业务逻辑与 UI 分离

* **组件**: 逻辑与视图混合

### 4. 灵活性

* **Hooks**: 可按需使用部分功能

* **组件**: 必须使用完整组件

### 5. 类型安全

* **Hooks**: 完整的 TypeScript 类型支持

* **组件**: 类型支持相对有限

## 性能优化

### 已修复的问题

1. **视角跟随卡顿问题**

   * **问题**: moving 事件中条件判断与实际操作不一致

   * **修复**: 统一使用 `mapInstance.value` 进行条件判断和操作

   * **效果**: 视角跟随功能流畅无卡顿

2. **内存泄漏预防**

   * 正确清理事件监听器

   * 及时重置状态和引用

3. **计算优化**

   * 预计算累积距离，避免重复计算

   * 使用高效的距离计算算法

### 性能建议

1. **轨迹点数量**: 建议控制在 1000 个点以内
2. **播放速度**: 避免过高的播放速度导致渲染压力
3. **视角跟随**: 在不需要时关闭以节省性能
4. **进度更新**: 避免过于频繁的手动进度调整

## 最佳实践

### 1. 错误处理

```typescript
// 检查轨迹数据有效性
if (trajectoryPoints.value.length < 2) {
  console.warn('轨迹点数量不足，无法播放')
  return
}

// 检查地图实例
if (!map || !marker) {
  console.error('地图或标记实例未初始化')
  return
}
```

### 2. 状态管理

```typescript
// 使用 computed 进行状态派生
const canPlay = computed(() => {
  return trajectoryPoints.value.length >= 2 && playState.value === 'stopped'
})

const canPause = computed(() => {
  return playState.value === 'playing'
})
```

### 3. 事件处理

```typescript
// 防抖处理进度变化
import { debounce } from 'lodash-es'

const debouncedProgressChange = debounce((value: number) => {
  onProgressChange(value)
}, 100)
```

## 注意事项

1. **地图实例**: 确保在地图完全加载后再调用 `initializeTrajectory`
2. **轨迹数据**: 轨迹点应为有效的经纬度坐标
3. **内存管理**: 组件销毁时记得清理相关资源
4. **浏览器兼容**: 需要支持 ES6+ 的现代浏览器

## 测试路由

项目中的测试页面路由地址：

* **开发环境**: `http://localhost:5173/trajectory-v2-test`

* **组件路径**: `src/pages/TrajectoryPlayerV2Test.vue`

* **Hooks 文件**: `src/composables/useTrajectoryPlayer.ts`

## 更新日志

### v1.2.0 (最新)

* 🔄 **重构速度控制系统**：speedOptions 基于 baseDuration 动态计算

* 🎛️ **优化速度档位**：X1、X2、X4 对应不同的播放时长

* ⚙️ **提升配置灵活性**：统一通过 baseDuration 控制所有速度档位

* 📝 **完善文档**：详细说明动态计算机制和使用方法

### v1.1.0

* 🐛 修复视角跟随卡顿问题

* ⚡ 优化性能表现

* 📝 完善类型定义

* 🔧 改进错误处理

### v1.0.0

* 🎉 初始版本发布

* ✨ 基础播放控制功能

* 📍 进度控制和视角跟随

* 🚀 多速度播放支持

