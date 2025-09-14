<template>
  <div class="test-page">
    <!-- 导航按钮 -->
    <div class="navigation-bar">
      <h1 class="title">Vue AMap 轨迹播放器演示</h1>
      <div class="nav-buttons">
        <button class="nav-btn" @click="navigateToHome">原版组件</button>
        <button class="nav-btn active">Hooks 版本</button>
      </div>
    </div>
    
    <!-- 组件容器 -->
    <div class="component-container">
      <TrajectoryPlayerV2 />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import TrajectoryPlayerV2 from '../components/TrajectoryPlayerV2.vue'

const router = useRouter()

const navigateToHome = () => {
  router.push('/')
}
</script>

<style scoped>
.test-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.navigation-bar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.nav-buttons {
  display: flex;
  gap: 0.5rem;
}

.nav-btn {
  padding: 0.5rem 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.nav-btn.active {
  background: rgba(255, 255, 255, 0.9);
  color: #667eea;
  border-color: white;
}

.component-container {
  flex: 1;
  overflow: hidden;
}
</style>