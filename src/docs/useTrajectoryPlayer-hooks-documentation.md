# useTrajectoryPlayer Hooks 技术文档

## API 接口

### 类型定义

```typescript
export interface TrajectoryPlayerOptions {
  baseDuration?: number // 基础播放时长（毫秒），默认 1000
  followView?: boolean // 是否视角跟随
}
```

### 参数

| 参数                   | 类型                      | 默认值 | 描述         |
| -------------------- | ----------------------- | --- | ---------- |
| options              | TrajectoryPlayerOptions | {}  | 配置选项       |
| options.baseDuration | number                  | 1000  | 基础播放时长（毫秒） |
| options.followView | boolean                  | true  | 是否视角跟随 |

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
import { useTrajectoryPlayer } from '#/composables/useTrajectoryPlayer'

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
  baseDuration: 60, // 更长的基础播放时长
  followView: false // 关闭视角跟随
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
