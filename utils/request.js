/**
 * 统一网络请求封装
 * - 自动携带 JWT token
 * - 统一处理后端 { code, msg, data } 响应
 * - 401 自动清除登录态并跳转登录页
 */
import { BASE_URL, TOKEN_KEY } from './config'

export function getToken() {
	return uni.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token) {
	if (token) {
		uni.setStorageSync(TOKEN_KEY, token)
	} else {
		uni.removeStorageSync(TOKEN_KEY)
	}
}

export function isLogin() {
	return !!getToken()
}

function gotoLogin() {
	setTimeout(() => {
		uni.reLaunch({ url: '/pages/login/login' })
	}, 600)
}

function buildQuery(data) {
	if (!data || typeof data !== 'object') return ''
	const parts = []
	Object.keys(data).forEach(function (k) {
		const v = data[k]
		if (v === '' || v === null || v === undefined) return
		parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v))
	})
	return parts.length ? ('?' + parts.join('&')) : ''
}

function rawRequest(method, url, data) {
	return new Promise((resolve, reject) => {
		const header = { 'Content-Type': 'application/json' }
		const token = getToken()
		if (token) header.Authorization = 'Bearer ' + token

		// GET 请求手动把参数拼到 URL，避免部分环境 data 不进 query 导致筛选/分页失效
		let finalUrl = BASE_URL + url
		let payload = data || {}
		if (method.toUpperCase() === 'GET') {
			finalUrl += buildQuery(data)
			payload = {}
		}

		uni.request({
			url: finalUrl,
			method: method,
			data: payload,
			header: header,
			success(res) {
				if (res.statusCode === 401) {
					setToken('')
					uni.showToast({ title: '请先登录', icon: 'none' })
					gotoLogin()
					return reject(new Error('未登录'))
				}
				if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.code === 0) {
					return resolve(res.data.data)
				}
				const msg = (res.data && res.data.msg) || ('请求失败(' + res.statusCode + ')')
				uni.showToast({ title: msg, icon: 'none' })
				reject(new Error(msg))
			},
			fail() {
				uni.showToast({ title: '网络异常，请确认后端服务已启动', icon: 'none' })
				reject(new Error('网络异常'))
			}
		})
	})
}

export default {
	get(url, data) { return rawRequest('GET', url, data) },
	post(url, data) { return rawRequest('POST', url, data) },
	put(url, data) { return rawRequest('PUT', url, data) },
	delete(url, data) { return rawRequest('DELETE', url, data) },
	getToken,
	setToken,
	isLogin
}
