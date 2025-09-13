import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import VueAMap, { initAMapApiLoader } from '@vuemap/vue-amap'
import '@vuemap/vue-amap/dist/style.css'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

// 初始化高德地图API
initAMapApiLoader({
  key: '607ddc131bade72f00f7ddc78fbe0f68',
  plugins: [
    'AMap.Scale',
    'AMap.OverView',
    'AMap.ToolBar',
    'AMap.MapType',
    'AMap.PlaceSearch',
    'AMap.Geolocation',
    'AMap.Geocoder',
    'AMap.MoveAnimation'
  ],
})

// 创建Vue应用实例
const app = createApp(App)

// 使用插件
app.use(VueAMap)
app.use(router)
app.use(Antd)

// 挂载应用
app.mount('#app')
