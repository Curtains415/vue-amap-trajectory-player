<template>
  <div class="trajectory-player">
    <!-- 控制面板 -->
    <div class="control-panel">
      <a-space wrap>
        <a-space>
          <span class="control-label">播放控制:</span>
          <a-button @click="togglePlay"
            :type="playState === 'stopped' ? 'primary' : playState === 'playing' ? 'default' : 'primary'">
            {{ playButtonText }}
          </a-button>
          <a-button @click="stop" :disabled="playState === 'stopped'" danger>
            停止
          </a-button>
        </a-space>

        <a-space>
          <span class="control-label">播放速度:</span>
          <a-select v-model:value="currentSpeed" @change="changeSpeed" style="width: 120px">
            <a-select-option v-for="option in speedOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-space>

        <a-checkbox v-model:checked="followView">
          {{ followViewText }}
        </a-checkbox>
      </a-space>
    </div>

    <!-- 进度面板 -->
    <div class="progress-panel">
      <a-space direction="vertical" style="width: 100%" size="small">
        <a-space wrap>
          <a-tag color="blue">进度: {{ currentProgress.toFixed(1) }}%</a-tag>
          <a-tag color="green">位置: {{ currentIndex + 1 }} / {{ trajectoryPoints.length }}</a-tag>
          <a-tag v-if="currentPosition" color="orange">
            坐标: ({{ currentPosition[0].toFixed(6) }}, {{ currentPosition[1].toFixed(6) }})
          </a-tag>
          <a-tag color="purple">速度: {{ currentSpeed }}x</a-tag>
        </a-space>
        <a-slider v-model:value="currentProgress" :min="0" :max="100" :step="0.01" @change="onProgressChange"
          :tooltip-open="false" />
      </a-space>
    </div>

    <!-- 地图容器 -->
    <el-amap :center="mapCenter" :zoom="13" :map-style="'amap://styles/normal'" class="map-container" @init="onMapInit">
    </el-amap>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Button as AButton,
  Select as ASelect,
  SelectOption as ASelectOption,
  Checkbox as ACheckbox,
  Space as ASpace,
  Tag as ATag,
  Slider as ASlider
} from 'ant-design-vue'
import { useTrajectoryPlayer } from '../composables/useTrajectoryPlayer'

const marker = ref(null)

// 生成轨迹点数据
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
  return points
}

// 轨迹点数组
const trajectoryPoints = ref(generateTrajectoryPoints())

// 地图中心点
const mapCenter = ref([116.397428, 39.90923])

// 地图初始化回调
const onMapInit = (map: any) => {
  // 创建marker
  marker.value = new AMap.Marker({
    map: map,
    position: new AMap.LngLat(mapCenter.value[0], mapCenter.value[1]),
    icon: "https://a.amap.com/jsapi_demos/static/demo-center-v2/car.png",
    offset: new AMap.Pixel(-13, -26),
  });

  new AMap.Polyline({
    path: trajectoryPoints.value,
    showDir: true,
    strokeColor: "#28F",  //线颜色
    strokeWeight: 6,      //线宽
  }).setMap(map);
  // 初始化轨迹播放器，传递地图实例、marker和轨迹点数组
  initializeTrajectory(map, marker.value, trajectoryPoints.value)
}

// 使用轨迹播放器hooks
const {
  // 状态
  playState,
  playButtonText,
  followViewText,
  currentSpeed,
  speedOptions,
  followView,
  currentPosition,
  currentProgress,
  currentIndex,
  // 方法
  togglePlay,
  stop,
  changeSpeed,
  onProgressChange,
  toggleFollowView,
  initializeTrajectory
} = useTrajectoryPlayer()

</script>

<style scoped>
.trajectory-player {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: Arial, sans-serif;
}

.control-panel {
  background: #fafafa;
  padding: 16px;
  border-bottom: 1px solid #d9d9d9;
}

.control-label {
  font-weight: 500;
  color: #262626;
  white-space: nowrap;
}

.progress-panel {
  background: #fafafa;
  padding: 16px;
  border-bottom: 1px solid #d9d9d9;
}

.map-container {
  flex: 1;
  width: 100%;
  min-height: 400px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .control-panel {
    padding: 12px;
  }

  .progress-panel {
    padding: 12px;
  }
}
</style>