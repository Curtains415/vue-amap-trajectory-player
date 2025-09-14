# useTrajectoryPlayer Hooks 技术文档

## 概述

`useTrajectoryPlayer` 是一个基于 Vue 3 Composition API 的轨迹播放器 hooks，专为高德地图轨迹动画设计。它提供了完整的轨迹播放控制功能，包括播放/暂停、速度调节、进度控制和视角跟随等特性。

## 核心特性

* 🎮 **完整的播放控制**：支持播放、暂停、停止、恢复等操作

* ⚡ **多速度播放**：内置 1x、2x、4x 速度选项，支持自定义速度

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
| options.baseDuration | number                  | 30  | 基础播放时长（毫秒） |

### 返回值

#### 响应式状态

| 属性               | 类型                                          | 描述              |
| ---------------- | ------------------------------------------- | --------------- |
| playState        | Ref<'stopped' \| 'playing' \| 'paused'>     | 播放状态            |
| currentSpeed     | Ref<number>                                 | 当前播放速度          |
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
| changeSpeed                 | speed: number                                             | void                      | 改变播放速度     |
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
      <select @change="changeSpeed($event.target.value)">
        <option v-for="option in speedOptions" 
                :key="option.value" 
                :value="option.value">
          {{ option.label }}
        </option>
      </select>
      
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
  currentSpeed,
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
  changeSpeed,
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

// 自定义速度选项
speedOptions.value = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '5x', value: 5 },
  { label: '10x', value: 10 }
]
```

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

## Amap.vue 组件暂停恢复逻辑修复

### 问题描述

在 Amap.vue 组件中，存在暂停后切换速度再恢复播放时，新速度不生效的问题：

1. **问题表现**: 暂停前是 X1 速度，暂停后切换到 X4 速度，恢复播放时仍然是 X1 速度
2. **根本原因**: `resume()` 函数只是简单调用 `marker.value.resumeMove()`，没有检测暂停期间的速度变化
3. **影响范围**: 用户体验不一致，暂停期间的速度切换无法正确应用

### 修复方案

#### 1. 添加暂停状态记录

```typescript
// 添加变量记录暂停时的duration值
const pausedDuration = ref<number | null>(null)
```

#### 2. 修改 pause() 函数

```typescript
const pause = () => {
  if (!marker.value) return
  
  // 记录暂停时的duration值
  pausedDuration.value = currentDuration.value
  
  marker.value.pauseMove()
  playState.value = 'paused'
}
```

#### 3. 重构 resume() 函数

```typescript
const resume = () => {
  if (playState.value === 'paused' && marker.value) {
    playState.value = 'playing'
    
    // 检查暂停期间是否切换了速度
    if (pausedDuration.value !== null && pausedDuration.value !== currentDuration.value) {
      // 速度发生变化，需要重新创建moveAlong动画
      const currentPos = marker.value.getPosition()
      const currentLng = currentPos.lng
      const currentLat = currentPos.lat
      
      // 停止当前移动
      marker.value.stopMove()
      
      // 找到当前位置在轨迹中的最近索引
      const nearestIndex = findTrajectoryIndex(currentPos)
      
      // 构建从当前精确位置开始的新路径
      let remainingPath: [number, number][]
      
      if (nearestIndex < trajectoryPoints.value.length - 1) {
        remainingPath = [[currentLng, currentLat], ...trajectoryPoints.value.slice(nearestIndex + 1)]
      } else {
        remainingPath = [[currentLng, currentLat], trajectoryPoints.value[trajectoryPoints.value.length - 1]]
      }
      
      if (remainingPath.length > 1) {
        // 计算剩余距离
        let remainingDistance = 0
        for (let i = 0; i < remainingPath.length - 1; i++) {
          remainingDistance += calculateDistance(remainingPath[i], remainingPath[i + 1])
        }
        
        // 基于剩余距离和新的duration计算播放时长
        const totalDist = totalDistance.value || 1
        const remainingDuration = (currentDuration.value * remainingDistance / totalDist)
        
        // 使用新的duration重新创建moveAlong动画
        marker.value.moveAlong(remainingPath, {
          duration: Math.max(remainingDuration, 5),
          autoRotation: true,
        })
      }
    } else {
      // 速度没有变化，直接恢复播放
      marker.value.resumeMove()
    }
    
    // 清除暂停状态记录
    pausedDuration.value = null
  }
}
```

### 修复效果

1. **速度切换生效**: 暂停后切换速度，恢复播放时立即应用新速度
2. **动画连续性**: 重新创建的动画从当前精确位置开始，保证轨迹连续
3. **性能优化**: 只在速度变化时重新创建动画，无变化时直接恢复
4. **用户体验**: 暂停期间的速度切换能够正确响应，交互更直观

### 技术要点

1. **状态同步**: 通过 `pausedDuration` 变量记录暂停时的状态
2. **条件判断**: 恢复时比较当前速度与暂停时速度，决定处理方式
3. **动画重建**: 速度变化时停止当前动画，重新计算并创建新动画
4. **位置精确**: 使用 `marker.getPosition()` 获取当前精确位置，确保轨迹连续

### 与 useTrajectoryPlayer.ts 的一致性

此修复使 Amap.vue 组件的暂停恢复逻辑与 useTrajectoryPlayer.ts hooks 保持一致，确保两个版本的轨迹播放器都能正确处理暂停期间的速度切换。

## 更新日志

### v1.2.0 (最新)

* 🐛 修复 Amap.vue 组件暂停恢复逻辑问题

* ✨ 添加暂停期间速度变化检测机制

* 🔧 优化暂停恢复时的动画处理

* 📝 完善技术文档，记录修复详情

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

