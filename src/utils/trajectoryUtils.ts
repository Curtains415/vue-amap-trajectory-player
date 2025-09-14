// 轨迹点类型定义
export type TrajectoryPoint = [number, number] // [lng, lat]

// 计算两点之间的距离（单位：公里）
export function calculateDistance(point1: TrajectoryPoint, point2: TrajectoryPoint): number {
  const R = 6371 // 地球半径（公里）
  const dLat = (point2[1] - point1[1]) * Math.PI / 180
  const dLng = (point2[0] - point1[0]) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1[1] * Math.PI / 180) * Math.cos(point2[1] * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 预计算路径的累积距离
export function calculateCumulativeDistances(points: TrajectoryPoint[]): { distances: number[], total: number } {
  if (points.length === 0) return { distances: [], total: 0 }

  const distances = [0] // 起点距离为0
  let totalDistance = 0

  for (let i = 1; i < points.length; i++) {
    const segmentDistance = calculateDistance(points[i - 1], points[i])
    totalDistance += segmentDistance
    distances.push(totalDistance)
  }

  return { distances, total: totalDistance }
}

// 基于累积距离计算进度
export function calculateProgressByDistance(
  currentPos: { lng: number, lat: number },
  trajectoryPoints: TrajectoryPoint[],
  cumulativeDistances: number[],
  totalDistance: number
): number {
  if (trajectoryPoints.length === 0 || totalDistance === 0) return 0

  let minDistance = Infinity
  let nearestIndex = 0
  let nearestProgress = 0

  // 找到距离当前位置最近的轨迹点
  for (let i = 0; i < trajectoryPoints.length; i++) {
    const distance = calculateDistance([currentPos.lng, currentPos.lat], trajectoryPoints[i])
    if (distance < minDistance) {
      minDistance = distance
      nearestIndex = i
    }
  }

  // 基于最近点的累积距离计算进度
  if (nearestIndex < cumulativeDistances.length) {
    nearestProgress = (cumulativeDistances[nearestIndex] / totalDistance) * 100
  }

  // 如果不是最后一个点，尝试更精确的插值计算
  if (nearestIndex < trajectoryPoints.length - 1) {
    const currentPoint = trajectoryPoints[nearestIndex]
    const nextPoint = trajectoryPoints[nearestIndex + 1]
    
    // 计算当前位置在当前段中的位置
    const segmentTotalDistance = calculateDistance(currentPoint, nextPoint)
    const distanceFromCurrent = calculateDistance([currentPos.lng, currentPos.lat], currentPoint)
    const distanceFromNext = calculateDistance([currentPos.lng, currentPos.lat], nextPoint)
    
    // 如果当前位置在当前段的路径上（通过三角不等式判断）
    if (Math.abs(distanceFromCurrent + distanceFromNext - segmentTotalDistance) < 0.001) {
      // 在段内进行插值
      const segmentProgress = distanceFromCurrent / segmentTotalDistance
      const segmentDistance = cumulativeDistances[nearestIndex + 1] - cumulativeDistances[nearestIndex]
      const interpolatedDistance = cumulativeDistances[nearestIndex] + segmentProgress * segmentDistance
      nearestProgress = (interpolatedDistance / totalDistance) * 100
    }
  }

  return Math.min(100, Math.max(0, nearestProgress))
}

// 根据当前位置找到对应的轨迹索引
export function findTrajectoryIndex(currentPos: { lng: number, lat: number }, trajectoryPoints: TrajectoryPoint[]): number {
  if (trajectoryPoints.length === 0) return 0

  let minDistance = Infinity
  let nearestIndex = 0

  for (let i = 0; i < trajectoryPoints.length; i++) {
    const distance = calculateDistance([currentPos.lng, currentPos.lat], trajectoryPoints[i])
    if (distance < minDistance) {
      minDistance = distance
      nearestIndex = i
    }
  }

  return nearestIndex
}

// 根据进度值计算对应的坐标点
export function getPositionByProgress(
  progress: number,
  trajectoryPoints: TrajectoryPoint[],
  cumulativeDistances: number[],
  totalDistance: number
): TrajectoryPoint | null {
  if (trajectoryPoints.length === 0 || totalDistance === 0) return null

  // 将进度转换为目标距离
  const targetDistance = (progress / 100) * totalDistance

  // 在累积距离数组中找到对应的索引
  for (let i = 0; i < cumulativeDistances.length - 1; i++) {
    if (targetDistance <= cumulativeDistances[i + 1]) {
      // 在当前段内进行插值
      const segmentStart = cumulativeDistances[i]
      const segmentEnd = cumulativeDistances[i + 1]
      const segmentProgress = (targetDistance - segmentStart) / (segmentEnd - segmentStart)
      
      const startPoint = trajectoryPoints[i]
      const endPoint = trajectoryPoints[i + 1]
      
      // 线性插值计算精确位置
      const lng = startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress
      const lat = startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress
      
      return [lng, lat]
    }
  }

  // 如果超出范围，返回最后一个点
  return trajectoryPoints[trajectoryPoints.length - 1]
}

// 生成模拟轨迹点
export function generatePoints(count: number, centerLng: number, centerLat: number): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = []
  const radius = 0.01 // 大约1公里的范围
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI * 3 // 3圈螺旋
    const distance = (i / count) * radius
    
    const lng = centerLng + distance * Math.cos(angle)
    const lat = centerLat + distance * Math.sin(angle)
    
    points.push([lng, lat])
  }
  
  return points
}

// 验证轨迹数据格式
export function validateTrajectoryData(points: TrajectoryPoint[]): boolean {
  return points.every(point => 
    Array.isArray(point) && 
    point.length === 2 && 
    typeof point[0] === 'number' && 
    typeof point[1] === 'number' &&
    !isNaN(point[0]) && 
    !isNaN(point[1])
  )
}