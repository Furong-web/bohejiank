/**
 * 全局配置：端口 / JWT / 数据库 / 腾讯混元大模型
 *
 * 安全说明：本文件不存放任何真实密钥，可安全提交到公开仓库。
 * 本地开发请把真实配置放到同目录的 config.local.js（已被 .gitignore 忽略），
 * 它会自动覆盖本文件；生产/部署环境请统一通过环境变量注入。
 */
function env(name, fallback) {
  return process.env[name] !== undefined ? process.env[name] : fallback
}

// 优先加载本地私密配置（含真实密钥，不入库）
let local = null
try { local = require('./config.local') } catch (e) { local = null }

if (local) {
  module.exports = local
} else {
  module.exports = {
    port: Number(env('PORT', 3000)),
    jwtSecret: env('JWT_SECRET', 'mint-health-dev-secret-change-me'),
    jwtExpiresIn: '7d',
    db: {
      host: env('DB_HOST', '127.0.0.1'),
      port: Number(env('DB_PORT', 3306)),
      user: env('DB_USER', 'root'),
      password: env('DB_PASSWORD', ''),
      database: env('DB_NAME', 'mint_health'),
      connectionLimit: 10,
      decimalNumbers: true,
      dateStrings: true
    },
    hunyuan: {
      apiKey: env('HUNYUAN_API_KEY', ''),
      baseUrl: env('HUNYUAN_BASE_URL', 'https://tokenhub-intl.tencentmaas.com/v1'),
      model: env('HUNYUAN_MODEL', 'hy3')
    },
    vision: {
      apiKey: env('HUNYUAN_VISION_API_KEY', ''),
      baseUrl: env('HUNYUAN_VISION_BASE_URL', 'https://tokenhub.tencentmaas.com/v1'),
      model: env('HUNYUAN_VISION_MODEL', 'hy-vision-2.0-instruct')
    }
  }
}
