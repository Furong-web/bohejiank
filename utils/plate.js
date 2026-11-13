// 餐盘（本次饮食记录）共享：用本地存储做轻量购物车，避免新增后端表
const KEY = 'mint_plate'

export function getPlate() {
  return uni.getStorageSync(KEY) || []
}

export function addToPlate(item) {
  const list = getPlate()
  const exist = list.find(i => i.foodId === item.foodId)
  if (exist) {
    exist.grams = Number(item.grams)
    if (item.calories != null) exist.calories = item.calories
  } else {
    list.push({
      foodId: item.foodId,
      name: item.name,
      grams: Number(item.grams),
      calories: item.calories != null ? Number(item.calories) : null
    })
  }
  uni.setStorageSync(KEY, list)
  return list
}

export function removeFromPlate(foodId) {
  const list = getPlate().filter(i => i.foodId !== foodId)
  uni.setStorageSync(KEY, list)
  return list
}

export function clearPlate() {
  uni.setStorageSync(KEY, [])
}
