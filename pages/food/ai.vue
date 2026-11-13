<template>
	<view class="page">
		<view class="ai-hero">
			<view class="ai-hero-title">AI 饮食助手</view>
			<view class="ai-hero-sub">本地智能引擎 · 非云端大模型，数据不出端</view>
		</view>

		<view class="tabs">
			<view class="tab" :class="{ active: tab === 0 }" @click="tab = 0">文字识别</view>
			<view class="tab" :class="{ active: tab === 1 }" @click="tab = 1">拍照记录</view>
			<view class="tab" :class="{ active: tab === 2 }" @click="tab = 2">营养顾问</view>
		</view>

		<!-- 文字识别 -->
		<view class="card" v-if="tab === 0">
			<view class="tip">输入一顿饭，例如：<text class="example" @click="text='一碗米饭+两个鸡翅+一根香蕉'">一碗米饭+两个鸡翅+一根香蕉</text></view>
			<textarea class="ai-input" v-model="text" placeholder="用中文描述你吃了什么，自动估算总热量" :auto-height="true" />
			<button class="btn-primary" @click="parseText">解析热量</button>

			<view class="result" v-if="parseResult">
				<view class="result-item" v-for="(it, i) in parseResult.items" :key="i">
					<view class="result-name">
						{{ it.name }} · {{ it.grams }}g
						<text v-if="it.source === 'ai'" class="ai-tag">AI估算</text>
					</view>
					<view class="result-kcal">{{ it.kcal }} 千卡</view>
				</view>
				<view class="result-unmatched" v-if="parseResult.unmatched.length">
					未识别：{{ parseResult.unmatched.join('、') }}
				</view>
				<view class="result-total">
					<text>合计</text>
					<text class="result-total-num">{{ parseResult.totalKcal }} 千卡</text>
				</view>
				<view class="result-actions">
					<button class="btn-ghost" @click="toPlate">加入餐盘分析</button>
					<button class="btn-primary sm" @click="recordParse">记录摄入</button>
				</view>
			</view>
		</view>

		<!-- 拍照引导 -->
		<view class="card" v-if="tab === 1">
			<view class="declare">拍照后自动识别食物并估算热量（使用混元视觉免费额度）。</view>
			<view class="photo-box" @click="choosePhoto">
				<image v-if="photo" :src="photo" class="photo-img" mode="aspectFill" />
				<view v-if="photo && scanning" class="photo-scan">
					<view class="scan-bar"></view>
					<view class="scan-text">AI 识别中…</view>
				</view>
				<view v-else-if="!photo" class="photo-placeholder">
					<view class="photo-plus">＋</view>
					<view class="photo-tip">点击拍照 / 选图</view>
				</view>
			</view>

			<!-- 识别结果 -->
			<view class="result mock" v-if="mockResult">
				<view class="mock-badge">{{ mockResult.real ? 'AI 识别结果' : '演示识别结果 · 未配置视觉 Key' }}</view>
				<view class="result-item" v-for="(it, i) in mockResult.items" :key="i">
					<view class="result-name">{{ it.name }} · {{ it.grams }}g</view>
					<view class="result-kcal">{{ it.kcal }} 千卡</view>
				</view>
				<view class="result-total">
					<text>合计</text>
					<text class="result-total-num">{{ mockResult.totalKcal }} 千卡</text>
				</view>
				<view class="result-actions">
					<button class="btn-primary sm" @click="recordMock">记录摄入</button>
				</view>
			</view>

			<template v-if="!mockResult">
				<view class="tip">或手动在下方输入图中食物，用文字引擎估算：</view>
				<textarea class="ai-input" v-model="photoText" placeholder="如：一个汉堡+一份薯条" :auto-height="true" />
				<button class="btn-primary" @click="parsePhoto">解析并记录这张图</button>
			</template>
		</view>

		<!-- 营养顾问（大模型流式对话） -->
		<view class="chat-card" v-if="tab === 2">
			<view class="chat-declare">AI 营养顾问 · 由腾讯混元大模型驱动，回答仅供健康参考，不构成医疗建议</view>
			<scroll-view scroll-y class="chat-body" :scroll-into-view="'msg-' + (messages.length - 1)" scroll-with-animation>
				<view v-if="!messages.length" class="chat-empty">
					<view class="chat-empty-title">你好，我是小薄荷 🍃</view>
					<view class="chat-empty-sub">你的专属营养顾问，问我减脂、饮食、运动问题吧</view>
				</view>
				<view class="msg-row" :class="m.role === 'user' ? 'is-user' : 'is-ai'" :id="'msg-' + i" v-for="(m, i) in messages" :key="i">
					<view v-if="m.type === 'voice'" class="bubble bubble-user voice-bubble" @click="playVoice(m.voice)">
						<text class="voice-ico">▶</text><text class="voice-text">{{ m.content }}</text>
					</view>
					<view v-else class="bubble" :class="m.role === 'user' ? 'bubble-user' : 'bubble-ai'">{{ m.content }}</view>
				</view>
				<view class="msg-row is-ai" v-if="streaming">
					<view class="bubble bubble-ai"><text class="cursor">▍</text></view>
				</view>
			</scroll-view>
		</view>

		<!-- 底部悬浮输入栏：豆包风格，相机 / 语音·打字 / 加号上传，可拖动 -->
		<view class="chat-dock" v-if="tab === 2" :style="{ bottom: dockBottom + 'px' }">
			<view class="dock-handle" @touchstart="dragStart" @touchmove="dragMove" @touchend="dragEnd">
				<view class="dock-handle-bar"></view>
			</view>

			<!-- 语音输入模式 -->
			<view v-if="voiceMode" class="voice-bar">
				<view class="dock-ico" @click="toggleVoice">
					<text class="dock-ico-char">⌨</text>
				</view>
				<view class="voice-btn" :class="{ recording: recording }"
					@touchstart.prevent="startRecord" @touchend.prevent="stopRecord" @touchcancel.prevent="stopRecord">
					{{ recording ? '松开发送' : '按住 说话' }}
				</view>
			</view>

			<!-- 文字输入模式 -->
			<view v-else class="chat-input-bar">
				<view class="dock-ico" @click="openPlus">
					<text class="dock-ico-char">＋</text>
				</view>
				<input class="chat-input" :value="q" placeholder="输入你的饮食/减脂疑问" confirm-type="send" :adjust-position="true" @input="onInput" @confirm="ask" />
				<view class="dock-ico" @click="toggleVoice">
					<text class="dock-ico-char">🎤</text>
				</view>
				<view class="dock-ico" @click="openCamera">
					<text class="dock-ico-char">📷</text>
				</view>
			</view>

			<view class="chips" v-if="!voiceMode">
				<view class="chip" v-for="s in quickQuestions" :key="s" @click="askQuick(s)">{{ s }}</view>
			</view>
		</view>

		<!-- 加号菜单：页面内底部弹层，选项点击同步调起相册/相机（H5 不丢手势） -->
		<view class="plus-mask" v-if="showPlus" @click="showPlus = false">
			<view class="plus-sheet" @click.stop>
				<view class="plus-item" @click="showPlus = false; openCamera()">📷 拍照记录食物</view>
				<view class="plus-item" @click="showPlus = false; pickFoodPhoto('album')">🖼️ 从相册选择</view>
				<view class="plus-item" @click="showPlus = false; pickFile()">📎 上传文件</view>
				<view class="plus-item plus-cancel" @click="showPlus = false">取消</view>
			</view>
		</view>

		<!-- #ifdef H5 -->
		<!-- H5 真实相机页面：getUserMedia 实时取景，可拍照 -->
		<view class="cam-mask" v-if="cameraOpen" @click.self="closeCamera">
			<!-- 用普通容器承载 JS 动态创建的原生 video，避开 uni-video 播放器包装 -->
			<view id="camBox" class="cam-video"></view>
			<view class="cam-error" v-if="cameraError">{{ cameraError }}</view>
			<view class="cam-bar">
				<view class="cam-btn" @click="closeCamera">取消</view>
				<view class="cam-btn cam-shoot" @click="capturePhoto">拍照</view>
				<view class="cam-btn" @click="switchCamera">翻转</view>
			</view>
		</view>
		<!-- H5 上传文件：原生 file input -->
		<input id="fileInput" type="file" class="cam-hidden" @change="onFilePicked" />
		<!-- #endif -->
	</view>
</template>

<script>
import http from '@/utils/request'
import { addToPlate } from '@/utils/plate'
import { BASE_URL } from '@/utils/config'
import { getToken } from '@/utils/request'

export default {
	onLoad(query) {
		const q = (query && query.q || '').trim()
		if (q) this.text = q + '的热量'
		this.initRecorder()
	},
	data() {
		return {
			tab: 0,
			text: '',
			photo: '',
			photoText: '',
			parseResult: null,
			mockResult: null,
			scanning: false,
			q: '',
			messages: [],
			streaming: false,
			dockBottom: 0,
			voiceMode: false,
			recording: false,
			recorder: null,
			showPlus: false,
			cameraOpen: false,
			cameraError: '',
			quickQuestions: ['每天要吃多少蛋白质？', '减脂要完全戒主食吗？', '为什么体重不掉？', '多喝水能减脂吗？', '坚果能吃吗？']
		}
	},
	methods: {
		onInput(e) {
			this.q = e && e.detail ? e.detail.value : e
		},
		dragStart(e) {
			this._dragY = e.touches[0].clientY
			this._dragB = this.dockBottom
			this._winH = uni.getSystemInfoSync().windowHeight
		},
		dragMove(e) {
			const dy = e.touches[0].clientY - this._dragY
			// 往上拖 dy 为负 -> bottom 增大；限制在 0 ~ (屏高 - 面板高约 380px)
			const max = Math.max(0, this._winH - 380)
			this.dockBottom = Math.min(max, Math.max(0, this._dragB - dy))
		},
		dragEnd() {},
		parseText() {
			const that = this
			this.parseResult = null
			http.post('/api/ai/parse-text', { text: this.text }).then(function (res) {
				that.parseResult = res
			}).catch(function () {})
		},
		toPlate() {
			if (!this.parseResult) return
			const that = this
			this.parseResult.items.forEach(function (it) {
				addToPlate({ foodId: it.foodId, name: it.name, grams: it.grams, calories: it.kcal / (it.grams / 100) })
			})
			uni.showToast({ title: '已加入餐盘', icon: 'success' })
			setTimeout(function () { uni.navigateTo({ url: '/pages/food/plate' }) }, 500)
		},
		recordParse() {
			if (!this.parseResult) return
			const that = this
			http.post('/api/checkins', { addIntake: this.parseResult.totalKcal }).then(function () {
				uni.showToast({ title: '已记录 ' + that.parseResult.totalKcal + ' 千卡', icon: 'success' })
			})
		},
		choosePhoto() {
			const that = this
			uni.chooseImage({
				count: 1,
				sourceType: ['album', 'camera'],
				success(res) {
					const p = res.tempFilePaths && res.tempFilePaths[0]
					that.photo = p || ''
					that.runScan(p)
				},
				fail() {}
			})
		},
		// 拍照/选图后的识别入口：优先真实视觉接口（免费额度），未配置时回退演示数据
		runScan(filePath) {
			const that = this
			this.mockResult = null
			this.scanning = true
			clearTimeout(this._scanTimer)
			// 扫描动画至少展示 1.2 秒，避免接口太快导致闪烁
			this._scanTimer = setTimeout(function () {
				that.scanning = false
				// 拿不到真实结果就回退演示数据
				if (!that.mockResult) that.mockResult = that.demoResult()
			}, 1600)

			if (!filePath) return
			this.toBase64(filePath, function (b64) {
				if (!b64) return
				http.post('/api/ai/vision', { image: b64 }).then(function (res) {
					const items = (res && res.items) || []
					that.scanning = false
					clearTimeout(that._scanTimer)
					if (res && res.configured === false) {
						// 后端未配置视觉 key：保留演示数据
						that.mockResult = that.demoResult()
					} else if (items.length) {
						that.mockResult = { items: items, totalKcal: res.totalKcal, real: true }
					} else {
						that.mockResult = null
						uni.showToast({ title: '未识别出食物，可手动输入', icon: 'none' })
					}
				}).catch(function () {
					that.scanning = false
					clearTimeout(that._scanTimer)
					that.mockResult = that.demoResult()
				})
			})
		},
		// 演示数据（后端未配置视觉 key 时使用，不产生费用）
		demoResult() {
			return {
				items: [
					{ name: '红烧肉', grams: 120, kcal: 432 },
					{ name: '米饭', grams: 150, kcal: 174 },
					{ name: '清炒青菜', grams: 100, kcal: 45 }
				],
				totalKcal: 651
			}
		},
		// 把图片文件转成 base64（H5 用 canvas，小程序用 FileSystemManager）
		toBase64(filePath, cb) {
			// #ifdef H5
			const img = new Image()
			img.crossOrigin = 'anonymous'
			img.onload = function () {
				try {
					const canvas = document.createElement('canvas')
					const maxW = 1024
					const scale = Math.min(1, maxW / img.width)
					canvas.width = Math.round(img.width * scale)
					canvas.height = Math.round(img.height * scale)
					const ctx = canvas.getContext('2d')
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
					cb(canvas.toDataURL('image/jpeg', 0.7).split(',')[1])
				} catch (e) { cb('') }
			}
			img.onerror = function () { cb('') }
			img.src = filePath
			// #endif
			// #ifndef H5
			uni.getFileSystemManager().readFile({
				filePath: filePath,
				encoding: 'base64',
				success: function (res) { cb(res.data) },
				fail: function () { cb('') }
			})
			// #endif
		},
		recordMock() {
			if (!this.mockResult) return
			const that = this
			http.post('/api/checkins', { addIntake: this.mockResult.totalKcal }).then(function () {
				uni.showToast({ title: '已记录 ' + that.mockResult.totalKcal + ' 千卡', icon: 'success' })
			})
		},
		// 底部加号：展开自定义底部弹层（页面内元素，点击直接同步调用，H5 也能调起相册/相机）
		openPlus() {
			this.showPlus = true
		},
		// 选图后跳到「拍照记录」页做食物录入
		pickFoodPhoto(sourceType) {
			const that = this
			uni.chooseImage({
				count: 1,
				sourceType: [sourceType],
				success(res) {
					const p = res.tempFilePaths && res.tempFilePaths[0]
					if (!p) return
					that.photo = p
					that.photoText = ''
					that.tab = 1
					that.runScan(p)
				},
				fail() { uni.showToast({ title: '已取消', icon: 'none' }) }
			})
		},
		// 相机入口：小程序走原生相机，H5 打开页内实时相机
		openCamera() {
			// #ifdef H5
			this.startCamera()
			// #endif
			// #ifndef H5
			this.pickFoodPhoto('camera')
			// #endif
		},
		// H5 实时相机：getUserMedia 取景（video 元素由 JS 动态创建，避免被编译成 uni-video 播放器）
		startCamera() {
			const that = this
			this.cameraError = ''
			this.cameraOpen = true
			this.$nextTick(function () {
				const box = document.getElementById('camBox')
				if (!box || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
					that.cameraError = '当前浏览器不支持摄像头，请用手机或微信小程序'
					return
				}
				box.innerHTML = ''
				const video = document.createElement('video')
				video.id = 'camVideo'
				video.autoplay = true
				video.playsInline = true
				video.muted = true
				video.style.width = '100%'
				video.style.height = '100%'
				video.style.objectFit = 'cover'
				box.appendChild(video)
				navigator.mediaDevices.getUserMedia({ video: { facingMode: that._facing || 'environment' }, audio: false })
					.then(function (stream) {
						that._stream = stream
						video.srcObject = stream
						video.play().catch(function () {})
					})
					.catch(function (err) {
						that.cameraError = '无法访问摄像头：' + (err && err.message ? err.message : err)
					})
			})
		},
		// H5 拍照：当前帧绘到 canvas -> base64 -> 识别
		capturePhoto() {
			const that = this
			const video = document.getElementById('camVideo')
			if (!video || !video.videoWidth) {
				uni.showToast({ title: '相机未就绪', icon: 'none' })
				return
			}
			const w = video.videoWidth
			const h = video.videoHeight
			const canvas = document.createElement('canvas')
			canvas.width = w
			canvas.height = h
			const ctx = canvas.getContext('2d')
			ctx.drawImage(video, 0, 0, w, h)
			const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
			this.closeCamera()
			this.photo = dataUrl
			this.tab = 1
			this.runScan(dataUrl)
		},
		closeCamera() {
			if (this._stream) {
				this._stream.getTracks().forEach(function (t) { t.stop() })
				this._stream = null
			}
			const box = document.getElementById('camBox')
			if (box) box.innerHTML = ''
			this.cameraOpen = false
		},
		switchCamera() {
			this._facing = this._facing === 'user' ? 'environment' : 'user'
			this.closeStreamOnly()
			this.startCamera()
		},
		closeStreamOnly() {
			if (this._stream) {
				this._stream.getTracks().forEach(function (t) { t.stop() })
				this._stream = null
			}
		},
		// 上传文件：小程序走 chooseMessageFile，H5 走原生 file input
		pickFile() {
			// #ifdef H5
			const inp = document.getElementById('fileInput')
			if (inp) inp.click()
			return
			// #endif
			// #ifndef H5
			const that = this
			if (!uni.chooseMessageFile) {
				uni.showToast({ title: '当前环境不支持文件选择', icon: 'none' })
				return
			}
			uni.chooseMessageFile({
				count: 1,
				type: 'file',
				success(res) {
					const f = res.tempFiles && res.tempFiles[0]
					if (!f) return
					that.tab = 2
					that.messages.push({ role: 'user', content: '📎 已选择文件：' + f.name })
					that.q = '我上传了一个文件：' + f.name + '，请结合我的饮食减脂问题给建议。'
					that.send()
				}
			})
			// #endif
		},
		// H5 文件选择回调：图片走识别，其它文件带入对话
		onFilePicked(e) {
			const that = this
			const input = e.target
			const file = input.files && input.files[0]
			input.value = '' // 允许重复选同一文件
			if (!file) return
			const reader = new FileReader()
			reader.onload = function () {
				const dataUrl = reader.result
				if (file.type && file.type.indexOf('image') === 0) {
					that.photo = dataUrl
					that.photoText = ''
					that.tab = 1
					that.runScan(dataUrl)
				} else {
					that.tab = 2
					that.messages.push({ role: 'user', content: '📎 已选择文件：' + file.name })
					that.q = '我上传了一个文件：' + file.name + '，请结合我的饮食减脂问题给建议。'
					that.send()
				}
			}
			reader.readAsDataURL(file)
		},
		// 语音 / 打字 切换
		toggleVoice() {
			this.voiceMode = !this.voiceMode
		},
		initRecorder() {
			const that = this
			if (!uni.getRecorderManager) return
			this.recorder = uni.getRecorderManager()
			this.recorder.onStop(function (res) {
				that._voicePath = res.tempFilePath
				that._voiceDur = Math.max(1, Math.round((res.duration || 1000) / 1000))
				that.recognizeVoice(res.tempFilePath, res.duration)
			})
			this.recorder.onError(function () {
				that.recording = false
				uni.showToast({ title: '录音失败', icon: 'none' })
			})
		},
		// 语音识别：优先用微信同声传译插件（免费），不可用则回退演示转写
		recognizeVoice(path, duration) {
			const that = this
			// #ifdef MP-WEIXIN
			try {
				const plugin = requirePlugin && requirePlugin('WechatSI')
				if (plugin && plugin.getRecordRecognitionManager) {
					const mgr = plugin.getRecordRecognitionManager()
					mgr.onRecognize = function (res) {}
					mgr.onStop = function (res) {
						const txt = (res && res.result) || ''
						that.sendVoice(txt.trim() ? txt : that.mockTranscript())
					}
					mgr.onError = function () { that.sendVoice(that.mockTranscript()) }
					mgr.start({ lang: 'zh_CN', duration: duration || 60000 })
					mgr.stop()
					return
				}
			} catch (e) {}
			// #endif
			that.sendVoice(that.mockTranscript())
		},
		startRecord() {
			if (this.recording || this.streaming) return
			try {
				this.recorder.start({ format: 'mp3', duration: 60000 })
				this.recording = true
			} catch (e) {
				uni.showToast({ title: '无法启动录音', icon: 'none' })
			}
		},
		stopRecord() {
			if (!this.recording) return
			this.recording = false
			try { this.recorder.stop() } catch (e) {}
		},
		// 语音消息：展示气泡 + 转写文本
		sendVoice(transcript) {
			if (!this._voicePath) return
			const dur = this._voiceDur || 1
			this.messages.push({ role: 'user', type: 'voice', content: dur + '″ 语音', voice: this._voicePath, dur: dur })
			const txt = transcript || this.mockTranscript()
			this.messages.push({ role: 'user', content: '🎤 ' + txt })
			this._voicePath = null
			this.q = txt
			this.send()
		},
		mockTranscript() {
			const list = [
				'帮我看看今天这顿饭大概多少热量',
				'减脂期晚上能吃西瓜吗',
				'为什么我最近体重不掉',
				'每天蛋白质要吃多少',
				'坚果一天能吃多少'
			]
			return list[Math.floor(Math.random() * list.length)]
		},
		playVoice(path) {
			if (!path) return
			if (this._audio) { try { this._audio.stop() } catch (e) {} }
			const a = uni.createInnerAudioContext()
			a.src = path
			a.play()
			this._audio = a
		},
		parsePhoto() {
			const that = this
			http.post('/api/ai/parse-text', { text: this.photoText }).then(function (res) {
				that.parseResult = res
				const total = res.totalKcal
				http.post('/api/checkins', { addIntake: total }).then(function () {
					uni.showToast({ title: '已记录 ' + total + ' 千卡', icon: 'success' })
				})
			}).catch(function () {})
		},
		ask() {
			this.send()
		},
		askQuick(s) {
			this.q = s
			this.send()
		},
		send() {
			const text = (this.q || '').trim()
			if (!text || this.streaming) return
			const that = this
			// 追加用户消息
			this.messages.push({ role: 'user', content: text })
			this.q = ''
			// 追加空的 AI 占位气泡
			this.messages.push({ role: 'assistant', content: '' })
			this.streaming = true
			this._gotChunk = false
			this._sseBuffer = ''

			// 传给后端的最近历史（含当前占位气泡之前的内容）
			const history = this.messages
				.filter(m => m.content !== '')
				.slice(-8)
				.map(m => ({ role: m.role, content: m.content }))

			uni.request({
				url: BASE_URL + '/api/ai/chat',
				method: 'POST',
				data: { messages: history },
				header: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
				enableChunked: true,
				timeout: 60000,
				success(res) {
					if (res.statusCode === 401) {
						uni.showToast({ title: '请先登录', icon: 'none' })
						that.streaming = false
						that.messages.pop()
						return
					}
					if (res.statusCode !== 200) {
						const msg = (res.data && res.data.msg) || '请求失败'
						uni.showToast({ title: msg, icon: 'none' })
						that.streaming = false
						that.messages.pop()
						return
					}
					// 环境不支持分块时，结束时一次性拿到完整 SSE 文本，直接解析
					if (!that._gotChunk && typeof res.data === 'string' && res.data.indexOf('data:') !== -1) {
						that.consumeSSE(res.data)
					}
					// 结束兜底：流正常走完但事件里没有 [DONE] 时，手动收尾
					if (that.streaming) {
						that.streaming = false
						const last = that.messages[that.messages.length - 1]
						if (last && !last.content) that.messages.pop()
					}
				},
				fail(err) {
					// 仅在真的没收到任何数据时才提示；看门狗/重复收尾不弹错
					if (!that._gotChunk && that.streaming) {
						uni.showToast({ title: '网络异常，请确认后端服务已启动', icon: 'none' })
						that.streaming = false
						that.messages.pop()
					}
					console.error('chat request fail', err)
				}
			}).then(task => {
				// 流式分块回调必须挂在 RequestTask 上，组件选项里的 onChunkReceived 不会被调用
				if (task && task.onChunkReceived) {
					task.onChunkReceived(function (chunk) { that.handleChunk(chunk) })
				}
			})
		},
		// 解析 SSE 分块，追加到 AI 气泡
		handleChunk(chunk) {
			if (!this.streaming) return
			const arr = chunk.data instanceof ArrayBuffer ? new Uint8Array(chunk.data) : null
			let text = ''
			try {
				text = arr ? decodeURIComponent(escape(String.fromCharCode.apply(null, arr))) : String(chunk.data)
			} catch (e) {
				text = arr ? String.fromCharCode.apply(null, arr) : String(chunk.data)
			}
			this._gotChunk = true
			this.consumeSSE(String(text || ''))
		},
		// 解析 SSE 文本帧（增量 or 完整），写入最后一个 AI 气泡
		consumeSSE(text) {
			if (!this.streaming) return
			// 用换行缓冲 SSE 帧
			this._sseBuffer = (this._sseBuffer || '') + text
			const frames = this._sseBuffer.split('\n')
			this._sseBuffer = frames.pop() || ''
			const last = this.messages[this.messages.length - 1]
			for (const f of frames) {
				const s = f.trim()
				if (!s.startsWith('data:')) continue
				const payload = s.slice(5).trim()
				if (payload === '[DONE]') {
					this.streaming = false
					this._sseBuffer = ''
					if (last && !last.content) this.messages.pop()
					return
				}
				let json
				try { json = JSON.parse(payload) } catch (e) { continue }
				if (json.delta) {
					if (last) last.content += json.delta
				} else if (json.error) {
					this.streaming = false
					this._sseBuffer = ''
					uni.showToast({ title: json.error, icon: 'none' })
					if (last && !last.content) this.messages.pop()
					return
				}
			}
			// 流结束但没有任何内容：给出提示，避免光标一直闪
			if (!this.streaming && last && !last.content) this.messages.pop()
		}
	}
}
</script>

<style>
.page {
	padding: 20rpx 0 40rpx;
}

.ai-hero {
	background: linear-gradient(160deg, #2BB673, #1E9E60);
	padding: 44rpx 40rpx 36rpx;
	color: #ffffff;
}

.ai-hero-title {
	font-size: 42rpx;
	font-weight: 700;
}

.ai-hero-sub {
	font-size: 22rpx;
	opacity: 0.85;
	margin-top: 10rpx;
}

.tabs {
	display: flex;
	margin: 24rpx 24rpx 0;
	background: #ffffff;
	border-radius: 40rpx;
	padding: 8rpx;
}

.tab {
	flex: 1;
	text-align: center;
	font-size: 26rpx;
	color: #5A655E;
	padding: 16rpx 0;
	border-radius: 34rpx;
	transition: all 0.2s;
}

.tab.active {
	background: #2BB673;
	color: #ffffff;
	font-weight: 600;
}

.card {
	background: #ffffff;
	border-radius: 24rpx;
	padding: 28rpx;
	margin: 20rpx 24rpx;
	box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.04);
}

.tip {
	font-size: 24rpx;
	color: #9AA79F;
	margin-bottom: 16rpx;
}

.example {
	color: #2BB673;
	margin-left: 6rpx;
}

.ai-input {
	width: 100%;
	box-sizing: border-box;
	background: #F5F7F6;
	border-radius: 16rpx;
	padding: 20rpx;
	font-size: 26rpx;
	min-height: 120rpx;
}

/* H5 下 textarea 内部真实输入区域撑满 */
.ai-input .uni-textarea-textarea,
.ai-input /deep/ textarea {
	width: 100%;
	height: 100% !important;
	font-size: 26rpx !important;
}

.btn-primary {
	background: #2BB673;
	color: #ffffff;
	font-size: 28rpx;
	border-radius: 40rpx;
	line-height: 2.8;
	margin-top: 24rpx;
}

.btn-primary.sm {
	margin-top: 0;
	padding: 0 40rpx;
	line-height: 2.6;
}

.btn-primary::after,
.btn-ghost::after {
	border: none;
}

.result {
	margin-top: 24rpx;
	border-top: 1rpx solid #F0F3F1;
	padding-top: 20rpx;
}

.result-item {
	display: flex;
	justify-content: space-between;
	padding: 14rpx 0;
	font-size: 26rpx;
	color: #555555;
}

.result-kcal {
	color: #FF9F43;
	font-weight: 600;
}

.ai-tag {
	display: inline-block;
	margin-left: 10rpx;
	padding: 2rpx 12rpx;
	font-size: 18rpx;
	color: #2BB673;
	background: #EAF6EF;
	border-radius: 8rpx;
	vertical-align: middle;
}

.result-unmatched {
	font-size: 22rpx;
	color: #FF9F43;
	margin-top: 10rpx;
}

.result-total {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 14rpx;
	font-size: 28rpx;
	color: #333333;
}

.result-total-num {
	font-size: 40rpx;
	font-weight: 700;
	color: #FF9F43;
}

.result-actions {
	display: flex;
	margin-top: 24rpx;
}

.btn-ghost {
	background: #EAF6EF;
	color: #2BB673;
	font-size: 28rpx;
	border-radius: 40rpx;
	line-height: 2.8;
	padding: 0 30rpx;
	margin: 24rpx 16rpx 0 0;
}

.declare {
	font-size: 22rpx;
	color: #FF9F43;
	background: #FFF6EC;
	border-radius: 12rpx;
	padding: 16rpx;
	margin-bottom: 18rpx;
	line-height: 1.5;
}

.photo-box {
	height: 300rpx;
	background: #F5F7F6;
	border-radius: 16rpx;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.photo-img {
	width: 100%;
	height: 100%;
}

.photo-placeholder {
	text-align: center;
	color: #B8C0BA;
}

.photo-plus {
	font-size: 80rpx;
	line-height: 1;
}

.photo-tip {
	font-size: 24rpx;
	margin-top: 10rpx;
}

/* 拍照识别中：扫描动画（演示） */
.photo-scan {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(27, 158, 96, 0.18);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.scan-bar {
	width: 80%;
	height: 6rpx;
	background: linear-gradient(90deg, transparent, #2BB673, transparent);
	box-shadow: 0 0 18rpx #2BB673;
	animation: scanMove 1.4s ease-in-out infinite;
}

.scan-text {
	margin-top: 18rpx;
	font-size: 26rpx;
	color: #1E9E60;
	font-weight: 600;
}

@keyframes scanMove {
	0% { transform: translateY(-110rpx); opacity: 0.4; }
	50% { opacity: 1; }
	100% { transform: translateY(110rpx); opacity: 0.4; }
}

/* 演示数据徽标 */
.mock-badge {
	display: inline-block;
	font-size: 20rpx;
	color: #FF9F43;
	background: #FFF6EC;
	border-radius: 8rpx;
	padding: 4rpx 14rpx;
	margin-bottom: 14rpx;
}

.chat-card {
	display: flex;
	flex-direction: column;
	height: calc(100vh - 240rpx);
	background: #ffffff;
	border-radius: 24rpx;
	padding: 20rpx;
	margin: 20rpx 24rpx 380rpx;
	box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.04);
}

/* 底部悬浮输入栏：固定屏幕底部，可拖动 */
.chat-dock {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background: #ffffff;
	border-radius: 24rpx 24rpx 0 0;
	padding: 0 20rpx 16rpx;
	box-shadow: 0 -6rpx 20rpx rgba(0, 0, 0, 0.06);
	z-index: 100;
}

.dock-handle {
	display: flex;
	justify-content: center;
	padding: 12rpx 0 4rpx;
}

.dock-handle-bar {
	width: 72rpx;
	height: 8rpx;
	border-radius: 4rpx;
	background: #D5DED8;
}

.chat-declare {
	font-size: 20rpx;
	color: #9AA79F;
	text-align: center;
	padding-bottom: 14rpx;
	border-bottom: 1rpx solid #F0F3F1;
}

.chat-body {
	flex: 1;
	overflow: hidden;
	margin-top: 14rpx;
}

.chat-empty {
	text-align: center;
	padding-top: 120rpx;
}

.chat-empty-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333333;
}

.chat-empty-sub {
	font-size: 24rpx;
	color: #9AA79F;
	margin-top: 14rpx;
}

.msg-row {
	display: flex;
	margin-bottom: 20rpx;
}

.msg-row.is-user {
	justify-content: flex-end;
}

.msg-row.is-ai {
	justify-content: flex-start;
}

.bubble {
	max-width: 78%;
	padding: 20rpx 24rpx;
	border-radius: 20rpx;
	font-size: 27rpx;
	line-height: 1.6;
	word-break: break-all;
	white-space: pre-wrap;
}

.bubble-user {
	background: #2BB673;
	color: #ffffff;
	border-top-right-radius: 4rpx;
}

.bubble-ai {
	background: #F5F7F6;
	color: #333333;
	border-top-left-radius: 4rpx;
}

.cursor {
	color: #2BB673;
	animation: blink 1s infinite;
}

@keyframes blink {
	0%, 100% { opacity: 1; }
	50% { opacity: 0; }
}

.chat-input-bar {
	display: flex;
	align-items: center;
	margin-top: 4rpx;
	padding-top: 4rpx;
}

/* 豆包风格：左侧加号 / 右侧语音·相机 图标按钮 */
.dock-ico {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	background: #F1F4F2;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-right: 14rpx;
}

.dock-ico:last-child {
	margin-right: 0;
	margin-left: 14rpx;
}

.dock-ico-char {
	font-size: 40rpx;
	line-height: 1;
	color: #5A655E;
}

/* 语音输入模式 */
.voice-bar {
	display: flex;
	align-items: center;
	margin-top: 4rpx;
	padding-top: 4rpx;
}

.voice-btn {
	flex: 1;
	height: 76rpx;
	line-height: 76rpx;
	text-align: center;
	background: #F5F7F6;
	border-radius: 40rpx;
	font-size: 28rpx;
	color: #5A655E;
}

.voice-btn.recording {
	background: #2BB673;
	color: #ffffff;
}

/* 语音气泡 */
.voice-bubble {
	display: flex;
	align-items: center;
}

.voice-ico {
	margin-right: 10rpx;
	font-size: 24rpx;
}

.voice-text {
	font-size: 26rpx;
}

.chat-input {
	flex: 1;
	background: #F5F7F6;
	border-radius: 40rpx;
	padding: 16rpx 28rpx;
	font-size: 26rpx;
	height: 76rpx;
	box-sizing: border-box;
}

/* H5 下 uni-input 内部真实输入框默认高度塌陷，强制撑满 */
.chat-input .uni-input-input,
.chat-input /deep/ input {
	height: 100% !important;
	font-size: 28rpx !important;
	line-height: normal !important;
}

.chat-send {
	background: #2BB673;
	color: #ffffff;
	font-size: 26rpx;
	border-radius: 40rpx;
	padding: 0 34rpx;
	line-height: 2.6;
	margin-left: 14rpx;
}

.chat-send::after {
	border: none;
}

.chat-send[disabled] {
	background: #B8DCC8;
	color: #ffffff;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	margin-top: 22rpx;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	margin-top: 10rpx;
}

.chip {
	background: #F5F7F6;
	color: #5A655E;
	font-size: 20rpx;
	border-radius: 24rpx;
	padding: 8rpx 18rpx;
	margin: 0 12rpx 10rpx 0;
}

/* 加号底部弹层 */
.plus-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.4);
	z-index: 200;
	display: flex;
	align-items: flex-end;
}

.plus-sheet {
	width: 100%;
	background: #ffffff;
	border-radius: 24rpx 24rpx 0 0;
	padding: 12rpx 0 24rpx;
}

.plus-item {
	text-align: center;
	font-size: 30rpx;
	color: #333333;
	padding: 28rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.plus-item:active {
	background: #F5F7F6;
}

.plus-cancel {
	color: #9AA79F;
	border-bottom: none;
	font-weight: 600;
}

/* H5 相机页面 */
.cam-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: #000000;
	z-index: 300;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

.cam-video {
	width: 100%;
	height: 70vh;
	object-fit: cover;
	background: #000000;
}

.cam-error {
	position: absolute;
	top: 40rpx;
	left: 30rpx;
	right: 30rpx;
	color: #ff6b6b;
	font-size: 26rpx;
	text-align: center;
	background: rgba(0, 0, 0, 0.6);
	padding: 16rpx;
	border-radius: 12rpx;
}

.cam-bar {
	position: absolute;
	bottom: 60rpx;
	left: 0;
	right: 0;
	display: flex;
	justify-content: space-around;
	align-items: center;
}

.cam-btn {
	color: #ffffff;
	font-size: 30rpx;
	background: rgba(255, 255, 255, 0.18);
	padding: 22rpx 40rpx;
	border-radius: 40rpx;
}

.cam-shoot {
	width: 110rpx;
	height: 110rpx;
	border-radius: 50%;
	background: #2BB673;
	padding: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
}

.cam-hidden {
	display: none;
}
</style>
