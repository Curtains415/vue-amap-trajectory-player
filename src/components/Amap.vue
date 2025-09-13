<template>
  <div class="trajectory-player">
    <div class="control-panel">
      <a-button @click="togglePlay" type="primary">
        {{ playState === 'stopped' ? '播放' : playState === 'playing' ? '暂停' : '恢复' }}
      </a-button>
      <a-button @click="stop" danger>停止</a-button>
      <a-button @click="changeSpeed(1)" :type="currentSpeed === 1 ? 'primary' : 'default'">X1</a-button>
      <a-button @click="changeSpeed(2)" :type="currentSpeed === 2 ? 'primary' : 'default'">X2</a-button>
      <a-button @click="changeSpeed(4)" :type="currentSpeed === 4 ? 'primary' : 'default'">X4</a-button>
      <a-button @click="toggleFollowView" :type="followView ? 'primary' : 'default'">
        {{ followView ? '视角跟随: 开' : '视角跟随: 关' }}
      </a-button>
    </div>

    <div class="progress-panel">
      <div class="progress-info">
        <span>播放进度: {{ currentProgress.toFixed(2) }}%</span>
        <span>当前位置: {{ currentIndex + 1 }} / {{ trajectoryPoints.length }}</span>
        <span v-if="currentPosition">坐标: {{ currentPosition[0].toFixed(6) }}, {{ currentPosition[1].toFixed(6) }}</span>
      </div>
      <div class="progress-slider">
        <a-slider v-model:value="currentProgress" :min="0" :max="100" :step="0.01" @change="onProgressChange"
          :tooltipOpen="false" />
      </div>
    </div>

    <el-amap :center="mapCenter" :zoom="13" :map-style="'amap://styles/normal'" class="amap-demo" @init="onMapInit">
    </el-amap>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// 响应式状态
const playState = ref<'stopped' | 'playing' | 'paused'>('stopped')
const currentSpeed = ref(1)
const followView = ref(false)
const mapInstance = ref<any>(null)
const marker = ref<any>(null)
const trajectoryPoints = ref<[number, number][]>([])
const baseDuration = ref(30) // 基础播放时长（毫秒）- 数值越小运动越快
const currentPosition = ref<[number, number] | null>(null)
const mapCenter = ref([116.397428, 39.90923]) // 北京天安门
const currentProgress = ref(0) // 当前进度百分比 (0-100)
const currentIndex = ref(0) // 当前在轨迹中的索引位置
const cumulativeDistances = ref<number[]>([]) // 累积距离数组
const totalDistance = ref(0) // 总路径距离
const lastValidProgress = ref(0) // 上次有效进度值，用于防抖
const isManualSeeking = ref(false) // 标记是否正在手动拖拽进度条
const isMovingTriggered = ref(false) // 标记是否是moving事件触发的change

// 计算两点间距离
const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
  return Math.sqrt(
    Math.pow(point1[0] - point2[0], 2) +
    Math.pow(point1[1] - point2[1], 2)
  )
}

// 预计算路径的累积距离
const calculateCumulativeDistances = () => {
  if (trajectoryPoints.value.length === 0) return

  const distances = [0] // 起点距离为0
  let total = 0

  for (let i = 1; i < trajectoryPoints.value.length; i++) {
    const distance = calculateDistance(trajectoryPoints.value[i - 1], trajectoryPoints.value[i])
    total += distance
    distances.push(total)
  }

  cumulativeDistances.value = distances
  totalDistance.value = total
}

// 基于累积距离计算进度
const calculateProgressByDistance = (currentPos: { lng: number, lat: number }): number => {
  if (trajectoryPoints.value.length === 0 || totalDistance.value === 0) return 0

  let minDistance = Infinity
  let bestSegmentIndex = 0
  let bestProjectionRatio = 0

  // 找到最近的线段并计算投影点
  for (let i = 0; i < trajectoryPoints.value.length - 1; i++) {
    const p1 = trajectoryPoints.value[i]
    const p2 = trajectoryPoints.value[i + 1]

    // 计算当前点到线段的投影
    const segmentLength = calculateDistance(p1, p2)
    if (segmentLength === 0) continue

    // 向量计算
    const dx = p2[0] - p1[0]
    const dy = p2[1] - p1[1]
    const t = Math.max(0, Math.min(1,
      ((currentPos.lng - p1[0]) * dx + (currentPos.lat - p1[1]) * dy) / (dx * dx + dy * dy)
    ))

    // 投影点
    const projX = p1[0] + t * dx
    const projY = p1[1] + t * dy

    // 距离投影点的距离
    const distanceToProjection = calculateDistance([currentPos.lng, currentPos.lat], [projX, projY])

    if (distanceToProjection < minDistance) {
      minDistance = distanceToProjection
      bestSegmentIndex = i
      bestProjectionRatio = t
    }
  }

  // 计算在路径上的累积距离
  const segmentStartDistance = cumulativeDistances.value[bestSegmentIndex]
  const segmentLength = cumulativeDistances.value[bestSegmentIndex + 1] - segmentStartDistance
  const currentDistance = segmentStartDistance + segmentLength * bestProjectionRatio

  // 计算进度百分比
  const progress = (currentDistance / totalDistance.value) * 100

  // 实时更新进度，允许小幅波动以保证响应性
  const progressDiff = Math.abs(progress - lastValidProgress.value)
  if (progressDiff > 0.01 || progress > lastValidProgress.value) {
    lastValidProgress.value = progress
  }

  return lastValidProgress.value
}

// 根据当前位置找到对应的轨迹索引（用于resume和changeSpeed）
const findTrajectoryIndex = (currentPos: { lng: number, lat: number }): number => {
  if (trajectoryPoints.value.length === 0) return 0

  let minDistance = Infinity
  let nearestIndex = 0

  // 直接基于距离查找最近的轨迹点
  for (let i = 0; i < trajectoryPoints.value.length; i++) {
    const point = trajectoryPoints.value[i]
    const distance = calculateDistance([currentPos.lng, currentPos.lat], point)

    if (distance < minDistance) {
      minDistance = distance
      nearestIndex = i
    }
  }

  return nearestIndex
}

// 基于位置的进度计算
// 生成3000个模拟坐标点
const generateTrajectoryPoints = () => {
  const points: [number, number][] = []
  const startLng = 116.397428
  const startLat = 39.90923

  // 生成一个直线轨迹（从起点向东北方向延伸）
  for (let i = 0; i < 1000; i++) {
    // 向东北方向延伸，经度和纬度同时增加
    // 每个点之间的间距保持均匀
    const step = i * 0.0001 // 控制点之间的间距
    const lng = startLng + step * Math.cos(Math.PI / 4) // 45度角（东北方向）
    const lat = startLat + step * Math.sin(Math.PI / 4) // 45度角（东北方向）
    points.push([lng, lat])
  }

  trajectoryPoints.value = points
  if (points.length > 0) {
    currentPosition.value = points[0]
    mapCenter.value = points[0]
    // 预计算累积距离
    calculateCumulativeDistances()
  }
}

// 地图初始化
const onMapInit = (map: any) => {
  mapInstance.value = map
  marker.value = new AMap.Marker({
    map: map,
    position: mapCenter.value,
    icon: "https://a.amap.com/jsapi_demos/static/demo-center-v2/car.png",
    offset: new AMap.Pixel(-13, -26),
  });
  new AMap.Polyline({
    map: map,
    path: trajectoryPoints.value,
    showDir: true,
    strokeColor: "#28F",  //线颜色
    strokeWeight: 6,      //线宽
  });
  marker.value.on('moving', function (e) {
    // 获取当前位置
    const currentPos = e.target.getPosition()
    currentPosition.value = [currentPos.lng, currentPos.lat]

    // 只有在非手动拖拽状态下才实时计算并更新进度
    if (trajectoryPoints.value.length > 0 && !isManualSeeking.value) {
      const newProgress = calculateProgressByDistance(currentPos)

      // 设置标记表示这是moving事件触发的更新
      isMovingTriggered.value = true

      // 直接更新进度，保证实时性
      currentProgress.value = parseFloat(newProgress.toFixed(2))
      if (currentProgress.value == 100) {
        playState.value = 'stopped'
      }
      // 清除标记
      setTimeout(() => {
        isMovingTriggered.value = false
      }, 0)

      // 根据进度计算对应的索引位置（用于显示）
      const progressRatio = newProgress / 100
      currentIndex.value = Math.floor(progressRatio * (trajectoryPoints.value.length - 1))
    }

    // 只有在开启视角跟随时才设置地图中心
    if (followView.value) {
      map.setCenter(e.target.getPosition(), true)
    }
  });
  map.setFitView();
}

// 统一的播放控制方法
const togglePlay = () => {
  if (trajectoryPoints.value.length === 0) return

  switch (playState.value) {
    case 'stopped':
      play()
      break
    case 'playing':
      pause()
      break
    case 'paused':
      resume()
      break
  }
}

const play = () => {
  if (trajectoryPoints.value.length < 2 || !marker.value) return

  playState.value = 'playing'
  // 验证路径数据格式
  if (trajectoryPoints.value.every(point =>
    point &&
    Array.isArray(point) &&
    point.length === 2 &&
    typeof point[0] === 'number' &&
    typeof point[1] === 'number' &&
    !isNaN(point[0]) &&
    !isNaN(point[1])
  )) {
    // 检查当前进度值，决定播放起点
    if (currentProgress.value >= 100) {
      // 进度为100%时，重置为0并从头开始播放
      currentProgress.value = 0
      const duration = baseDuration.value / currentSpeed.value
      marker.value.moveAlong(trajectoryPoints.value, {
        duration: duration,
        autoRotation: true,
      })
    } else if (currentProgress.value > 0) {
      // 从当前进度位置开始播放
      const currentPos = getPositionByProgress(currentProgress.value)
      if (currentPos) {
        // 将小车移动到当前进度对应的位置
        marker.value.setPosition(currentPos)

        // 找到当前位置在轨迹中的最近索引
        const nearestIndex = findTrajectoryIndex({ lng: currentPos[0], lat: currentPos[1] })

        // 构建从当前位置开始的剩余路径
        let remainingPath: [number, number][]

        if (nearestIndex < trajectoryPoints.value.length - 1) {
          // 从当前位置到下一个轨迹点，然后继续剩余路径
          remainingPath = [currentPos, ...trajectoryPoints.value.slice(nearestIndex + 1)]
        } else {
          // 如果已经接近终点，直接到终点
          remainingPath = [currentPos, trajectoryPoints.value[trajectoryPoints.value.length - 1]]
        }

        if (remainingPath.length > 1) {
          // 计算剩余距离和时长
          let remainingDistance = 0
          for (let i = 0; i < remainingPath.length - 1; i++) {
            remainingDistance += calculateDistance(remainingPath[i], remainingPath[i + 1])
          }

          // 基于剩余距离计算播放时长
          const totalDist = totalDistance.value || 1
          const remainingDuration = (baseDuration.value * remainingDistance / totalDist) / currentSpeed.value

          // 从当前位置开始播放剩余路径
          marker.value.moveAlong(remainingPath, {
            duration: Math.max(remainingDuration, 5), // 确保最小时长
            autoRotation: true,
          })
        }
      } else {
        // 如果无法获取当前位置，从起点开始播放
        const duration = baseDuration.value / currentSpeed.value
        marker.value.moveAlong(trajectoryPoints.value, {
          duration: duration,
          autoRotation: true,
        })
      }
    } else {
      // 进度为0，从起点开始播放（保持原有逻辑）
      const duration = baseDuration.value / currentSpeed.value
      marker.value.moveAlong(trajectoryPoints.value, {
        duration: duration,
        autoRotation: true,
      })
    }
  } else {
    console.warn('Invalid trajectory points data:', trajectoryPoints.value)
    stop()
  }
}

const pause = () => {
  if (!marker.value) return
  marker.value.pauseMove()
  playState.value = 'paused'
}

const resume = () => {
  if (playState.value === 'paused' && marker.value) {
    playState.value = 'playing'
    marker.value.resumeMove()
  }
}

const stop = () => {
  playState.value = 'stopped'
  if (marker.value) {
    marker.value.stopMove()
  }

  // 重置小车位置到起点
  if (trajectoryPoints.value.length > 0 && marker.value) {
    marker.value.setPosition(trajectoryPoints.value[0])
    // 重置进度信息
    currentProgress.value = 0
    currentIndex.value = 0
    currentPosition.value = trajectoryPoints.value[0]
    lastValidProgress.value = 0 // 重置防抖进度值
  }
}

const changeSpeed = (speed: number) => {
  currentSpeed.value = speed

  if (playState.value === 'playing' && marker.value) {
    // 获取当前精确位置
    const currentPos = marker.value.getPosition()
    const currentLng = currentPos.lng
    const currentLat = currentPos.lat

    // 暂停当前播放
    marker.value.stopMove()

    // 找到当前位置在轨迹中的最近索引
    const nearestIndex = findTrajectoryIndex(currentPos)

    // 构建从当前精确位置开始的新路径，确保路径连续性
    let remainingPath: [number, number][]

    if (nearestIndex < trajectoryPoints.value.length - 1) {
      // 从当前位置到下一个轨迹点，然后继续剩余路径
      remainingPath = [[currentLng, currentLat], ...trajectoryPoints.value.slice(nearestIndex + 1)]
    } else {
      // 如果已经接近终点，直接到终点
      remainingPath = [[currentLng, currentLat], trajectoryPoints.value[trajectoryPoints.value.length - 1]]
    }

    if (remainingPath.length > 1) {
      // 计算剩余距离和时长
      let remainingDistance = 0
      for (let i = 0; i < remainingPath.length - 1; i++) {
        remainingDistance += calculateDistance(remainingPath[i], remainingPath[i + 1])
      }

      // 基于剩余距离计算播放时长
      const totalDist = totalDistance.value || 1
      const remainingDuration = (baseDuration.value * remainingDistance / totalDist) / currentSpeed.value

      // 从当前精确位置以新速度继续播放
      marker.value.moveAlong(remainingPath, {
        duration: Math.max(remainingDuration, 5), // 确保最小时长
        autoRotation: true,
      })
    }
  }
  // 暂停状态下切换速度时，速度值已经更新，恢复播放时会应用新速度
  // 不需要额外处理，因为resume函数会读取当前的currentSpeed.value
}

// 根据进度值计算对应的坐标点
const getPositionByProgress = (progress: number): [number, number] | null => {
  // 参数有效性检查
  if (typeof progress !== 'number' || isNaN(progress)) {
    console.warn('Invalid progress value:', progress)
    return null
  }

  // 边界条件处理
  if (progress <= 0) {
    return trajectoryPoints.value.length > 0 ? trajectoryPoints.value[0] : null
  }
  if (progress >= 100) {
    return trajectoryPoints.value.length > 0 ? trajectoryPoints.value[trajectoryPoints.value.length - 1] : null
  }

  // 检查必要的数据
  if (trajectoryPoints.value.length === 0 || cumulativeDistances.value.length === 0 || totalDistance.value === 0) {
    console.warn('Trajectory data not available for position calculation')
    return null
  }

  // 根据进度百分比计算目标距离
  const targetDistance = (progress / 100) * totalDistance.value

  // 在累积距离数组中找到对应的线段
  let segmentIndex = 0
  for (let i = 0; i < cumulativeDistances.value.length - 1; i++) {
    if (targetDistance <= cumulativeDistances.value[i + 1]) {
      segmentIndex = i
      break
    }
  }

  // 边界检查
  if (segmentIndex >= trajectoryPoints.value.length - 1) {
    return trajectoryPoints.value[trajectoryPoints.value.length - 1]
  }

  // 获取线段的起点和终点
  const startPoint = trajectoryPoints.value[segmentIndex]
  const endPoint = trajectoryPoints.value[segmentIndex + 1]

  // 计算在当前线段内的距离比例
  const segmentStartDistance = cumulativeDistances.value[segmentIndex]
  const segmentEndDistance = cumulativeDistances.value[segmentIndex + 1]
  const segmentLength = segmentEndDistance - segmentStartDistance

  if (segmentLength === 0) {
    return startPoint
  }

  const distanceInSegment = targetDistance - segmentStartDistance
  const ratio = distanceInSegment / segmentLength

  // 线性插值计算精确坐标
  const lng = startPoint[0] + (endPoint[0] - startPoint[0]) * ratio
  const lat = startPoint[1] + (endPoint[1] - startPoint[1]) * ratio

  return [lng, lat]
}

// 进度条change事件处理
const onProgressChange = (value: number) => {
  // 记录当前播放状态
  const wasPlaying = playState.value === 'playing'

  marker.value.stopMove()

  // 根据进度值找到对应的坐标点索引
  const targetDistance = (value / 100) * totalDistance.value
  let targetIndex = 0

  // 在累积距离数组中找到对应的索引
  for (let i = 0; i < cumulativeDistances.value.length - 1; i++) {
    if (targetDistance <= cumulativeDistances.value[i + 1]) {
      targetIndex = i
      break
    }
  }

  // 获取从目标索引开始的后续坐标数组
  const remainingPath = trajectoryPoints.value.slice(targetIndex)

  if (remainingPath.length > 1) {
    // 根据当前进度值计算精确的当前距离
    const currentDistance = (value / 100) * totalDistance.value
    // 计算剩余距离
    const remainingDistance = totalDistance.value - currentDistance

    // 计算播放时长（基于剩余距离和当前速度）
    const totalDist = totalDistance.value || 1
    const remainingDuration = (baseDuration.value * remainingDistance / totalDist) / currentSpeed.value

    // 使用moveAlong播放剩余路径
    marker.value.moveAlong(remainingPath, {
      duration: Math.max(remainingDuration, 5), // 确保最小时长
      autoRotation: true,
    })

    // 根据原来的播放状态设置正确的状态
    if (wasPlaying) {
      playState.value = 'playing'
    } else if (playState.value !== 'playing') {
      marker.value.pauseMove()
    }
  } else {
    // 如果只剩一个点或没有剩余路径，直接移动到目标位置
    const position = getPositionByProgress(value)
    if (position) {
      // 计算当前位置到目标位置的距离
      const currentPos = marker.value.getPosition()
      const distance = calculateDistance([currentPos.lng, currentPos.lat], position)

      // 基于距离和当前速度计算duration，保持与其他动画一致的速度感知
      const totalDist = totalDistance.value || 1
      const duration = Math.max((baseDuration.value * distance / totalDist) / currentSpeed.value, 5)

      marker.value.moveTo(position, {
        duration: duration,
        autoRotation: true,
      })
    }
  }
}

// 切换视角跟随状态
const toggleFollowView = () => {
  followView.value = !followView.value
}

// 组件挂载时生成轨迹数据
onMounted(() => {
  generateTrajectoryPoints()
})
</script>

<style scoped>
.trajectory-player {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.control-panel {
  padding: 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.progress-panel {
  padding: 16px;
  background: #fafafa;
  border-bottom: 1px solid #ddd;
}

.progress-info {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.progress-info span {
  padding: 4px 8px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.progress-slider {
  margin-top: 12px;
  padding: 0 8px;
}

.amap-demo {
  flex: 1;
}
</style>