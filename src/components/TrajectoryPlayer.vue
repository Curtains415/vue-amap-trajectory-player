<template>
  <div class="trajectory-player">
    <!-- 地图容器 -->
    <div class="map-container">
      <el-amap
        ref="mapRef"
        :center="mapCenter"
        :zoom="13"
        :map-style="'amap://styles/normal'"
        class="amap-demo"
        @init="onMapInit"
      >
        <!-- 轨迹路径 -->
        <el-amap-polyline
          v-if="trajectoryPath.length > 0"
          :path="trajectoryPath"
          :stroke-color="'#3366FF'"
          :stroke-weight="4"
          :stroke-opacity="0.8"
        />
        
        <!-- 小车marker通过JavaScript创建，支持MoveAnimation -->
      </el-amap>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <!-- 播放控制按钮 -->
      <div class="play-controls">
        <button
          @click="play"
          :disabled="isPlaying && !isPaused"
          class="control-btn play-btn"
        >
          <Play :size="20" />
        </button>
        
        <button
          @click="pause"
          :disabled="!isPlaying || isPaused"
          class="control-btn pause-btn"
        >
          <Pause :size="20" />
        </button>
        
        <button
          @click="resume"
          :disabled="!isPaused"
          class="control-btn resume-btn"
        >
          <RotateCcw :size="20" />
        </button>
        
        <button
          @click="stop"
          :disabled="!isPlaying && !isPaused"
          class="control-btn stop-btn"
        >
          <Square :size="20" />
        </button>
      </div>

      <!-- 速度控制 -->
      <div class="speed-controls">
        <span class="speed-label">速度:</span>
        <button
          v-for="speed in speedOptions"
          :key="speed"
          @click="setSpeed(speed)"
          :class="['speed-btn', { active: currentSpeed === speed }]"
        >
          X{{ speed }}
        </button>
      </div>

      <!-- 进度条 -->
      <div class="progress-controls">
        <span class="progress-label">进度:</span>
        <input
          type="range"
          v-model="progressValue"
          :min="0"
          :max="trajectoryPoints.length - 1"
          @input="onProgressChange"
          class="progress-slider"
        />
        <span class="progress-text">
          {{ currentIndex + 1 }} / {{ trajectoryPoints.length }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { Play, Pause, RotateCcw, Square } from 'lucide-vue-next'

// 地图相关
const mapRef = ref()
const mapInstance = ref()
const mapCenter = ref([116.397428, 39.90923]) // 北京天安门

// 轨迹数据
const trajectoryPoints = ref<[number, number][]>([])
const trajectoryPath = computed(() => trajectoryPoints.value)

// 播放状态
const isPlaying = ref(false)
const isPaused = ref(false)
const currentIndex = ref(0)
const currentPosition = ref<[number, number] | null>(null)
const currentAngle = ref(0)

// 进度更新定时器
let progressTimer: number | null = null

// 速度控制
const speedOptions = [1, 2, 4]
const currentSpeed = ref(1)
const baseDuration = 30 // 每段基础持续时间(ms)，设置为30ms让1000个点的轨迹在合理时间内完成（约30秒）

// 进度条
const progressValue = ref(0)

// AMap相关
let animationMarker: any = null
let isAnimationReady = ref(false)

// 小车图标 - 使用简单的图标URL
const carIcon = 'data:image/svg+xml;base64,' + btoa(`
  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="10" width="20" height="12" rx="2" fill="#FF6B6B" stroke="#fff" stroke-width="2"/>
    <circle cx="10" cy="24" r="3" fill="#333"/>
    <circle cx="22" cy="24" r="3" fill="#333"/>
    <rect x="8" y="12" width="4" height="3" fill="#87CEEB"/>
    <rect x="14" y="12" width="4" height="3" fill="#87CEEB"/>
    <rect x="20" y="12" width="4" height="3" fill="#87CEEB"/>
  </svg>
`)

// 生成1000个模拟坐标点
const generateTrajectoryPoints = () => {
  const points: [number, number][] = []
  const startLng = 116.397428
  const startLat = 39.90923
  
  // 生成一个螺旋形轨迹
  for (let i = 0; i < 1000; i++) {
    const angle = (i * 0.1) % (2 * Math.PI)
    const radius = 0.01 + (i * 0.00002)
    const lng = startLng + radius * Math.cos(angle)
    const lat = startLat + radius * Math.sin(angle)
    points.push([lng, lat])
  }
  
  trajectoryPoints.value = points
  if (points.length > 0) {
    currentPosition.value = points[0]
    mapCenter.value = points[0]
  }
}

// 计算两点间的角度
const calculateAngle = (from: [number, number], to: [number, number]): number => {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  return Math.atan2(dy, dx) * 180 / Math.PI
}

// 播放控制函数
const play = () => {
  if (!isAnimationReady.value || !animationMarker) {
    console.log('Animation not ready or marker not found')
    return
  }
  
  if (isPaused.value) {
    resume()
    return
  }
  
  isPlaying.value = true
  isPaused.value = false
  
  // 从当前位置开始播放
  const startIndex = currentIndex.value
  const remainingPath = trajectoryPoints.value.slice(startIndex)
  
  if (remainingPath.length > 1) {
    // 使用moveAlong方法开始轨迹动画
    // 计算总动画时长：基础时长 * 路径长度 / 速度倍数
    const totalDuration = (remainingPath.length * baseDuration) / currentSpeed.value
    
    console.log('Starting animation with path length:', remainingPath.length, 'total duration:', totalDuration, 'ms')
    
    animationMarker.moveAlong(remainingPath, totalDuration)
    
    // 启动进度更新定时器
    startProgressTimer()
  }
}

const pause = () => {
  if (!animationMarker) return
  
  isPaused.value = true
  animationMarker.pauseMove()
  
  // 暂停时停止进度更新
  stopProgressTimer()
}

const resume = () => {
  if (!animationMarker || !isPaused.value) return
  
  isPaused.value = false
  animationMarker.resumeMove()
  
  // 恢复时重新启动进度更新
  startProgressTimer()
}

const stop = () => {
  if (!animationMarker) return
  
  isPlaying.value = false
  isPaused.value = false
  currentIndex.value = 0
  progressValue.value = 0
  
  animationMarker.stopMove()
  
  // 停止时清除进度更新定时器
  stopProgressTimer()
  
  if (trajectoryPoints.value.length > 0) {
    animationMarker.setPosition(new AMap.LngLat(trajectoryPoints.value[0][0], trajectoryPoints.value[0][1]))
    currentPosition.value = trajectoryPoints.value[0]
    currentAngle.value = 0
  }
}

// 进度更新定时器管理
const startProgressTimer = () => {
  stopProgressTimer() // 先清除现有定时器
  progressTimer = setInterval(() => {
    updateProgress()
  }, 100) // 每100ms更新一次进度
}

const stopProgressTimer = () => {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

// 设置播放速度
const setSpeed = (speed: number) => {
  currentSpeed.value = speed
  
  // 如果正在播放，需要重新启动动画以应用新速度
  if (isPlaying.value && !isPaused.value && animationMarker) {
    // 1. 获取当前位置
    const currentPos = animationMarker.getPosition()
    if (!currentPos) return
    
    // 2. 停止当前动画和定时器
    animationMarker.stopMove()
    stopProgressTimer()
    
    // 3. 找到当前位置在轨迹中的索引
    let currentTrajectoryIndex = 0
    let minDistance = Infinity
    
    trajectoryPoints.value.forEach((point, index) => {
      const distance = Math.sqrt(
        Math.pow(currentPos.lng - point[0], 2) + 
        Math.pow(currentPos.lat - point[1], 2)
      )
      if (distance < minDistance) {
        minDistance = distance
        currentTrajectoryIndex = index
      }
    })
    
    // 4. 计算剩余路径（从当前位置到终点）
    const remainingPath = trajectoryPoints.value.slice(currentTrajectoryIndex)
    
    // 5. 如果还有剩余路径，用新速度重新开始动画
    if (remainingPath.length > 1) {
      const totalDuration = (remainingPath.length * baseDuration) / currentSpeed.value
      animationMarker.moveAlong(remainingPath, totalDuration)
      
      // 6. 更新当前索引和进度，重新启动定时器
      currentIndex.value = currentTrajectoryIndex
      progressValue.value = currentTrajectoryIndex
      startProgressTimer()
    }
  }
}

// 进度条变化处理
const onProgressChange = () => {
  if (!animationMarker) return
  
  const newIndex = parseInt(progressValue.value.toString())
  currentIndex.value = newIndex
  
  if (trajectoryPoints.value[newIndex]) {
    // 停止当前动画
    animationMarker.stopMove()
    
    // 设置新位置
    animationMarker.setPosition(new AMap.LngLat(trajectoryPoints.value[newIndex][0], trajectoryPoints.value[newIndex][1]))
    currentPosition.value = trajectoryPoints.value[newIndex]
    
    // 计算角度
    if (newIndex > 0) {
      const prevPoint = trajectoryPoints.value[newIndex - 1]
      const currentPoint = trajectoryPoints.value[newIndex]
      currentAngle.value = calculateAngle(prevPoint, currentPoint)
    }
    
    // 如果正在播放，从新位置继续播放
    if (isPlaying.value && !isPaused.value) {
      const remainingPath = trajectoryPoints.value.slice(newIndex)
      if (remainingPath.length > 1) {
        const totalDuration = (remainingPath.length * baseDuration) / currentSpeed.value
        animationMarker.moveAlong(remainingPath, totalDuration)
      }
    }
  }
}

// 地图初始化
const onMapInit = (map: any) => {
  mapInstance.value = map
  
  // 直接初始化动画marker，因为插件已在main.ts中配置
  initAnimationMarker()
}

// 初始化动画marker
const initAnimationMarker = () => {
  if (!mapInstance.value || trajectoryPoints.value.length === 0) return
  
  // 如果已存在marker，先移除
  if (animationMarker) {
    mapInstance.value.remove(animationMarker)
  }
  
  // 创建带动画功能的marker
  animationMarker = new AMap.Marker({
    position: new AMap.LngLat(trajectoryPoints.value[0][0], trajectoryPoints.value[0][1]),
    icon: carIcon,
    offset: new AMap.Pixel(-16, -16),
    anchor: 'center'
  })
  
  // 添加到地图
  mapInstance.value.add(animationMarker)
  
  // 监听动画结束事件
  animationMarker.on('moveend', () => {
    // 动画结束，清理状态和定时器
    isPlaying.value = false
    isPaused.value = false
    stopProgressTimer()
    
    // 确保进度条显示为100%
    currentIndex.value = trajectoryPoints.value.length - 1
    progressValue.value = trajectoryPoints.value.length - 1
  })
  
  isAnimationReady.value = true
  currentPosition.value = trajectoryPoints.value[0]
  
  console.log('Animation marker initialized:', animationMarker)
}

// 更新进度
const updateProgress = () => {
  if (!animationMarker) return
  
  const currentPos = animationMarker.getPosition()
  if (currentPos) {
    // 找到最接近的轨迹点索引
    let minDistance = Infinity
    let closestIndex = 0
    
    trajectoryPoints.value.forEach((point, index) => {
      const distance = Math.sqrt(
        Math.pow(currentPos.lng - point[0], 2) + 
        Math.pow(currentPos.lat - point[1], 2)
      )
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = index
      }
    })
    
    currentIndex.value = closestIndex
    progressValue.value = closestIndex
    currentPosition.value = [currentPos.lng, currentPos.lat]
  }
}

// 监听当前索引变化，同步进度条
watch(currentIndex, (newIndex) => {
  progressValue.value = newIndex
})

// 组件挂载时生成轨迹数据
onMounted(() => {
  generateTrajectoryPoints()
  
  // 如果地图已经初始化，立即初始化动画marker
  if (mapInstance.value) {
    initAnimationMarker()
  }
})

// 监听轨迹数据变化，重新初始化动画marker
watch(trajectoryPoints, () => {
  if (mapInstance.value && trajectoryPoints.value.length > 0) {
    initAnimationMarker()
  }
}, { deep: true })

// 组件卸载时清理定时器
onUnmounted(() => {
  stopProgressTimer()
})
</script>

<style scoped>
.trajectory-player {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.map-container {
  flex: 1;
  position: relative;
}

.amap-demo {
  width: 100%;
  height: 100%;
}

.control-panel {
  background: white;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.play-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: #3366FF;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover:not(:disabled) {
  background: #2952CC;
  transform: translateY(-1px);
}

.control-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.speed-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.speed-label {
  font-weight: 500;
  color: #333;
}

.speed-btn {
  padding: 8px 16px;
  border: 2px solid #3366FF;
  border-radius: 6px;
  background: white;
  color: #3366FF;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.speed-btn:hover {
  background: #f0f4ff;
}

.speed-btn.active {
  background: #3366FF;
  color: white;
}

.progress-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.progress-label {
  font-weight: 500;
  color: #333;
  min-width: 40px;
}

.progress-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e0e0e0;
  outline: none;
  cursor: pointer;
}

.progress-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3366FF;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.progress-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3366FF;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.progress-text {
  font-size: 14px;
  color: #666;
  min-width: 80px;
  text-align: right;
}
</style>