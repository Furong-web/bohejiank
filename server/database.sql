-- ============================================================
-- 薄荷健康小程序 数据库初始化脚本
-- 数据库: mint_health (utf8mb4)
-- 可通过 mysql CLI 导入: mysql -u root -p < database.sql
-- 或在 server 目录执行: npm run init-db
-- ============================================================

CREATE DATABASE IF NOT EXISTS mint_health DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mint_health;

-- 用户表（密码 bcrypt 加密存储）
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password_hash VARCHAR(100) NOT NULL COMMENT '加密后的密码',
  nickname VARCHAR(50) NOT NULL DEFAULT '' COMMENT '昵称',
  gender TINYINT NOT NULL DEFAULT 1 COMMENT '1男 2女',
  age INT NOT NULL DEFAULT 25,
  height DECIMAL(5,1) NOT NULL DEFAULT 170 COMMENT '身高cm',
  weight DECIMAL(5,1) NULL COMMENT '当前体重kg',
  target_weight DECIMAL(5,1) NULL COMMENT '目标体重kg',
  activity_level TINYINT NOT NULL DEFAULT 2 COMMENT '1久坐 2轻度 3中度 4高强度',
  role TINYINT NOT NULL DEFAULT 1 COMMENT '1普通用户 2管理员',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 食物热量表（每100g）
CREATE TABLE IF NOT EXISTS foods (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '食物名称',
  category VARCHAR(20) NOT NULL DEFAULT '其他' COMMENT '分类',
  calories DECIMAL(6,1) NOT NULL DEFAULT 0 COMMENT '热量kcal/100g',
  protein DECIMAL(6,1) NOT NULL DEFAULT 0 COMMENT '蛋白质g/100g',
  fat DECIMAL(6,1) NOT NULL DEFAULT 0 COMMENT '脂肪g/100g',
  carb DECIMAL(6,1) NOT NULL DEFAULT 0 COMMENT '碳水g/100g',
  description VARCHAR(200) NOT NULL DEFAULT '' COMMENT '说明',
  serving_desc VARCHAR(50) NOT NULL DEFAULT '' COMMENT '标准份量描述，如「1碗≈200g」',
  serving_grams INT NOT NULL DEFAULT 100 COMMENT '标准份量克数（点选份量用）',
  common TINYINT NOT NULL DEFAULT 0 COMMENT '是否为常用食物(首页/空搜默认展示)',
  KEY idx_name (name),
  KEY idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='食物热量表';

-- 兼容已存在的旧库：补充新增字段
SET @exist = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'mint_health' AND TABLE_NAME = 'foods' AND COLUMN_NAME = 'serving_grams');
SET @sql = IF(@exist = 0,
  'ALTER TABLE foods ADD COLUMN serving_desc VARCHAR(50) NOT NULL DEFAULT \'\' COMMENT \'标准份量描述\', ADD COLUMN serving_grams INT NOT NULL DEFAULT 100 COMMENT \'标准份量克数\'',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 兼容旧库：补充 common 字段
SET @exist2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'mint_health' AND TABLE_NAME = 'foods' AND COLUMN_NAME = 'common');
SET @sql2 = IF(@exist2 = 0,
  'ALTER TABLE foods ADD COLUMN common TINYINT NOT NULL DEFAULT 0 COMMENT \'是否为常用食物\'',
  'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 兼容旧库：补充 users.role 字段
SET @exist3 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'mint_health' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role');
SET @sql3 = IF(@exist3 = 0,
  'ALTER TABLE users ADD COLUMN role TINYINT NOT NULL DEFAULT 1 COMMENT \'1普通用户 2管理员\'',
  'SELECT 1');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- 运动表（MET 值用于估算消耗）
CREATE TABLE IF NOT EXISTS exercises (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '运动名称',
  category VARCHAR(20) NOT NULL DEFAULT '有氧' COMMENT '分类',
  met DECIMAL(4,1) NOT NULL DEFAULT 3.0 COMMENT '代谢当量MET',
  description VARCHAR(200) NOT NULL DEFAULT '' COMMENT '说明',
  KEY idx_name (name),
  KEY idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运动消耗表';

-- 文章表（减肥知识库）
CREATE TABLE IF NOT EXISTS articles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL COMMENT '标题',
  category VARCHAR(20) NOT NULL DEFAULT '科普' COMMENT '分类: 饮食/运动/科普/心态',
  summary VARCHAR(200) NOT NULL DEFAULT '' COMMENT '摘要',
  content TEXT NOT NULL COMMENT '正文(段落以空行分隔)',
  views INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '阅读量',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='减肥知识文章表';

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  article_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_article (user_id, article_id),
  KEY idx_article (article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章收藏表';

-- 每日打卡表（每人每天一条）
CREATE TABLE IF NOT EXISTS checkins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  date DATE NOT NULL COMMENT '打卡日期',
  weight DECIMAL(5,1) NULL COMMENT '当日体重kg',
  intake DECIMAL(7,1) NOT NULL DEFAULT 0 COMMENT '摄入kcal',
  burn DECIMAL(7,1) NOT NULL DEFAULT 0 COMMENT '运动消耗kcal',
  note VARCHAR(200) NOT NULL DEFAULT '' COMMENT '备注',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日打卡表';

-- 演示账号 demo / 123456（bcrypt 加密）
INSERT INTO users (username, password_hash, nickname, gender, age, height, weight, target_weight, activity_level) VALUES
('demo', '$2a$10$hMKyaM0X1R9fMjpUJM3Hdur8ZY4p8l/5LcKpbpLrBWvELD4rM76fS', '演示用户', 2, 26, 163.0, 58.0, 52.0, 2)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- ======================== 食物种子数据（每100g） ========================
INSERT INTO foods (name, category, calories, protein, fat, carb, description) VALUES
('米饭', '主食', 116.0, 2.6, 0.3, 25.9, '一碗约200g，约232千卡'),
('馒头', '主食', 223.0, 7.0, 1.1, 47.0, '一个约100g，饱腹感强'),
('面条(煮)', '主食', 110.0, 3.9, 0.4, 22.8, '煮制面条，注意少放酱料'),
('全麦面包', '主食', 246.0, 9.0, 3.4, 45.0, '膳食纤维丰富，适合早餐'),
('燕麦片', '主食', 367.0, 15.0, 6.7, 61.0, '低升糖粗粮，早餐佳选'),
('玉米', '主食', 112.0, 4.0, 1.2, 22.8, '一根中等玉米约200g'),
('红薯', '主食', 86.0, 1.6, 0.1, 20.1, '优质粗粮主食，蒸煮最佳'),
('土豆', '主食', 77.0, 2.0, 0.2, 17.2, '蒸煮低卡，炸薯条热量翻5倍'),
('糙米饭', '主食', 112.0, 2.6, 0.3, 23.5, '升糖比白米饭低，更适合减脂'),
('意大利面(煮)', '主食', 158.0, 5.8, 0.9, 30.9, '低GI主食，酱料注意选择'),
('鸡胸肉', '肉蛋', 133.0, 24.0, 3.4, 0.6, '减脂期蛋白质首选'),
('鸡蛋', '肉蛋', 144.0, 13.3, 8.8, 2.8, '一个约50g，约72千卡'),
('牛肉(瘦)', '肉蛋', 106.0, 22.2, 0.9, 2.4, '高蛋白富铁，适合力量训练日'),
('猪里脊', '肉蛋', 155.0, 20.2, 7.9, 0.7, '猪身上热量最低的部位之一'),
('三文鱼', '肉蛋', 139.0, 17.2, 7.8, 0.0, '富含Omega-3优质脂肪'),
('虾仁', '肉蛋', 93.0, 20.3, 0.8, 0.2, '高蛋白低脂，白灼最佳'),
('豆腐', '肉蛋', 81.0, 8.1, 3.7, 4.2, '植物蛋白代表，饱腹感强'),
('西兰花', '蔬菜', 36.0, 4.1, 0.6, 4.3, '蔬菜界的蛋白质冠军'),
('菠菜', '蔬菜', 28.0, 2.6, 0.3, 4.5, '富含铁和叶酸'),
('生菜', '蔬菜', 15.0, 1.3, 0.3, 2.0, '热量极低，可大量食用'),
('番茄', '蔬菜', 20.0, 0.9, 0.2, 4.0, '生吃熟吃都适合'),
('黄瓜', '蔬菜', 16.0, 0.8, 0.2, 2.9, '水分充足，加餐好选择'),
('胡萝卜', '蔬菜', 39.0, 1.0, 0.2, 8.8, '富含胡萝卜素'),
('香菇', '蔬菜', 24.0, 2.2, 0.3, 5.2, '鲜味足，提味少放盐'),
('南瓜', '蔬菜', 26.0, 0.7, 0.1, 6.5, '可部分替代主食'),
('苹果', '水果', 53.0, 0.4, 0.2, 13.5, '一个中等苹果约200g'),
('香蕉', '水果', 93.0, 1.4, 0.2, 22.0, '运动前后快速补能'),
('橙子', '水果', 48.0, 0.8, 0.2, 11.1, '维生素C丰富'),
('西瓜', '水果', 31.0, 0.6, 0.3, 5.8, '热量低但含糖，注意份量'),
('蓝莓', '水果', 57.0, 0.7, 0.3, 14.5, '花青素含量高'),
('猕猴桃', '水果', 61.0, 0.8, 0.6, 14.5, '维C是橙子的2倍'),
('葡萄', '水果', 45.0, 0.4, 0.3, 10.3, '一小串约150g'),
('榴莲', '水果', 147.0, 2.6, 3.3, 28.3, '水果热量之王，减脂期慎吃'),
('纯牛奶', '奶制品', 65.0, 3.3, 3.6, 4.9, '一杯250ml约163千卡'),
('无糖酸奶', '奶制品', 62.0, 3.5, 3.3, 4.7, '注意选择无糖款'),
('切达奶酪', '奶制品', 328.0, 25.9, 23.5, 2.4, '高热量高蛋白，少量即可'),
('薯片', '零食', 548.0, 5.6, 37.6, 47.8, '油炸零食，热量重灾区'),
('牛奶巧克力', '零食', 546.0, 7.3, 30.0, 59.0, '两小块约100千卡'),
('核桃', '零食', 646.0, 14.9, 58.8, 19.1, '优质坚果脂肪，每天2-3颗'),
('花生', '零食', 563.0, 24.8, 44.3, 21.7, '蛋白质丰富，控制份量'),
('曲奇饼干', '零食', 435.0, 6.0, 13.0, 70.0, '糖油混合物，尽量少吃'),
('冰淇淋', '零食', 207.0, 2.9, 8.6, 29.6, '一个球约80g，165千卡'),
('可乐', '饮品', 43.0, 0.0, 0.0, 10.6, '一听330ml约142千卡'),
('鲜榨橙汁', '饮品', 45.0, 0.7, 0.2, 10.4, '喝果汁不如直接吃水果'),
('黑咖啡', '饮品', 1.0, 0.1, 0.0, 0.0, '几乎零热量，运动前饮用更佳'),
('全糖奶茶', '饮品', 55.0, 1.2, 2.7, 6.6, '一杯500ml约275千卡'),
('啤酒', '饮品', 43.0, 0.5, 0.0, 3.6, '一瓶500ml约215千卡'),
('无糖豆浆', '饮品', 31.0, 3.0, 1.6, 1.2, '植物蛋白饮品，早餐好搭档');

-- ======================== 补充分类：外卖 / 调味品 / 豆制品 ========================
INSERT INTO foods (name, category, calories, protein, fat, carb, description, serving_desc, serving_grams) VALUES
-- 外卖快餐（减脂期常见陷阱，给出份量提醒）
('汉堡(牛肉)', '外卖', 295.0, 17.0, 14.0, 25.0, '一个约120g，搭配蔬菜沙拉更佳', '1个', 120),
('炸鸡(块)', '外卖', 320.0, 16.0, 20.0, 16.0, '3块约150g，去皮可少摄入约1/3脂肪', '3块', 150),
('薯条(中)', '外卖', 312.0, 4.0, 15.0, 41.0, '一份约110g，热量直逼一碗米饭', '1份', 110),
('披萨(1角)', '外卖', 250.0, 10.0, 10.0, 29.0, '一块约100g，选薄底蔬菜款更低卡', '1角', 100),
('麻辣烫(清汤)', '外卖', 90.0, 5.0, 4.0, 8.0, '每100g，多选蔬菜少选丸子', '1碗', 400),
('盖浇饭', '外卖', 160.0, 6.0, 6.0, 20.0, '每100g，酱汁是隐藏热量来源', '1份', 500),
('鸡翅(奥尔良)', '外卖', 220.0, 18.0, 13.0, 6.0, '一个约50g，去皮烤制比油炸友好', '1个', 50),
('寿司卷', '外卖', 130.0, 4.0, 1.5, 25.0, '每100g，酱料与天妇罗款热量更高', '1份', 200),
-- 调味品 / 酱料（隐性热量重灾区）
('沙拉酱(蛋黄)', '调味品', 700.0, 1.0, 75.0, 5.0, '一勺约15g就105千卡，减脂期慎用', '1勺', 15),
('番茄酱', '调味品', 110.0, 1.5, 0.2, 26.0, '一勺约20g，含糖较高', '1勺', 20),
('生抽', '调味品', 53.0, 6.0, 0.1, 8.0, '一勺约10g，钠高注意控量', '1勺', 10),
('老干妈', '调味品', 290.0, 6.0, 24.0, 12.0, '一勺约15g约43千卡，拌饭易超量', '1勺', 15),
('香油', '调味品', 884.0, 0.0, 100.0, 0.0, '一勺约10g就88千卡，凉拌少放', '1勺', 10),
('蜂蜜', '调味品', 304.0, 0.3, 0.0, 82.0, '一勺约20g约60千卡，不算零热量', '1勺', 20),
('白糖', '调味品', 387.0, 0.0, 0.0, 100.0, '一勺约10g约39千卡，控糖关键', '1勺', 10),
-- 豆制品（优质植物蛋白）
('豆腐干', '豆制品', 152.0, 16.0, 8.0, 4.0, '每100g，便携高蛋白加餐', '1块', 50),
('腐竹', '豆制品', 450.0, 25.0, 22.0, 22.0, '每100g，干货泡发后热量稀释', '1把', 30),
('千张(豆腐皮)', '豆制品', 262.0, 24.0, 16.0, 5.0, '每100g，卷蔬菜做减脂卷饼', '1张', 50),
('黄豆', '豆制品', 359.0, 35.0, 16.0, 19.0, '每100g，打豆浆优选原料', '1把', 30),
('毛豆', '豆制品', 123.0, 13.0, 5.0, 9.0, '每100g，水煮是优质零食', '1碗', 100),
('素鸡', '豆制品', 194.0, 17.0, 12.0, 5.0, '每100g，卤制款注意钠含量', '1块', 60);

-- 标记常用食物：空关键词搜索时优先展示，避免一上来就列一大堆
UPDATE foods SET common = 1 WHERE name IN (
  '米饭', '全麦面包', '燕麦片', '红薯', '鸡蛋', '鸡胸肉', '牛肉(瘦)', '豆腐',
  '西兰花', '番茄', '苹果', '香蕉', '纯牛奶', '无糖酸奶', '可乐', '全糖奶茶'
);

-- ======================== 营养问答知识库（本地顾问用） ========================
CREATE TABLE IF NOT EXISTS ai_qa (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  keywords VARCHAR(200) NOT NULL COMMENT '逗号分隔的命中关键词',
  question VARCHAR(100) NOT NULL COMMENT '展示用问题',
  answer VARCHAR(500) NOT NULL COMMENT '本地智能回答',
  article_id INT UNSIGNED NULL COMMENT '关联文章',
  KEY idx_keywords (keywords)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营养问答知识库';

INSERT INTO ai_qa (keywords, question, answer, article_id) VALUES
('西瓜,水果,糖', '减脂期能吃西瓜吗？', '可以吃，但控制份量。西瓜约31千卡/100g，热量不高但含糖，一次建议不超过200g（约一小碗）。用它替代奶茶、饼干等零食更划算。', 1),
('奶茶,饮品,糖', '奶茶热量高吗？', '全糖奶茶约55千卡/100g，一杯500ml约275千卡。减脂期建议选无糖、少料、换鲜奶底，或每周限定一杯作为"弹性餐"。', 1),
('晚上,夜宵,睡前', '晚上几点后不能吃东西？', '没有绝对禁区。关键看全天总热量。若实在饿，可选无糖酸奶、黄瓜、番茄等低卡食物，避免高油高糖夜宵影响睡眠与脂肪堆积。', 7),
('平台期,不掉秤,停滞', '为什么体重卡住不降了？', '减脂2-3个月后常见。随体重下降基础代谢降低，原缺口被抹平。建议重新算每日消耗、排查隐性热量（酱料饮料）、换运动模式。', 6),
('蛋白质,蛋白,吃多少', '每天要吃多少蛋白质？', '减脂期建议每公斤体重1.2-1.6g蛋白质，可保护肌肉、增强饱腹感。鸡胸肉、鱼虾、蛋奶、豆制品都是优质来源。', 2),
('碳水,主食,戒', '减脂要完全戒主食吗？', '不需要。完全戒碳水会掉肌肉、情绪差、易反弹。用糙米、燕麦、红薯等低升糖粗粮替代部分精米白面更可持续。', 2),
('运动,多久,频率', '每周运动多久才有效？', '世卫建议每周150-300分钟中等强度有氧，或75-150分钟高强度。新手可从每天快走30分钟开始，逐步加量。', 4),
('睡眠,熬夜,压力', '睡眠和减脂有关系吗？', '关系很大。睡眠不足会升高饥饿素、多摄入约300千卡，并升高皮质醇促进腹部脂肪。建议每天7-8小时、规律作息。', 7),
('坚果,零食,脂肪', '坚果能吃吗？', '能，且推荐。核桃、花生富含优质脂肪与蛋白，但热量高，每天核桃2-3颗或花生一小把（约15-20g）即可。', 2),
('喝水,水,代谢', '多喝水能帮助减脂吗？', '有帮助。水参与脂肪代谢，餐前喝水可增加饱腹感。建议每天1.5-2L白水，少喝含糖饮料。', 1);

-- ======================== 运动种子数据 ========================
INSERT INTO exercises (name, category, met, description) VALUES
('散步', '有氧', 3.0, '门槛最低的运动，饭后30分钟刚刚好'),
('快走(6km/h)', '有氧', 4.3, '减脂入门首选，微喘但能说话的强度'),
('慢跑(8km/h)', '有氧', 7.5, '经典燃脂运动，注意跑前热身'),
('快跑(10km/h)', '有氧', 10.0, '高强度跑，适合有一定基础者'),
('跳绳(中速)', '有氧', 11.5, '燃脂效率之王，十分钟约消耗100千卡'),
('游泳(自由泳)', '有氧', 8.0, '对关节友好，全身性运动'),
('骑行(休闲)', '有氧', 3.5, '通勤骑行，轻松愉悦'),
('骑行(12-16km/h)', '有氧', 6.8, '中等强度骑行，户外室内皆可'),
('椭圆机', '有氧', 5.0, '不伤膝盖的室内有氧'),
('有氧操', '有氧', 7.0, '跟练视频即可，趣味性强'),
('开合跳', '有氧', 8.0, '无器械全身燃脂动作'),
('爬楼梯', '有氧', 8.0, '利用碎片时间的高效运动'),
('太极拳', '有氧', 3.0, '舒缓身心，适合恢复日'),
('力量训练(轻中)', '力量', 3.5, '哑铃弹力带训练，保护肌肉'),
('力量训练(高强度)', '力量', 6.0, '大重量复合动作，提升代谢'),
('核心训练', '力量', 3.8, '平板支撑卷腹等，强化腰腹'),
('HIIT间歇训练', '力量', 8.0, '时间短效率高，隔天进行'),
('羽毛球', '球类', 5.5, '趣味性强，双人对打更持久'),
('篮球', '球类', 6.0, '半场游戏强度，消耗可观'),
('乒乓球', '球类', 4.0, '低冲击球类运动'),
('足球', '球类', 7.0, '高强度球类，消耗大'),
('瑜伽', '柔韧', 2.5, '拉伸放松，改善体态与睡眠'),
('拉伸', '柔韧', 2.3, '运动后必做，缓解酸痛'),
('舞蹈', '柔韧', 5.0, '边听音乐边燃脂');

-- ======================== B 端学员表（独立于 C 端用户，规范中文姓名） ========================
CREATE TABLE IF NOT EXISTS b_students (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '学员真实姓名',
  employee_no VARCHAR(30) NOT NULL COMMENT '学员编号/工号',
  gender TINYINT NOT NULL DEFAULT 1 COMMENT '1男 2女',
  age INT NOT NULL DEFAULT 28 COMMENT '年龄',
  height DECIMAL(5,1) NOT NULL DEFAULT 170 COMMENT '身高cm',
  weight DECIMAL(5,1) NULL COMMENT '当前体重kg',
  target_weight DECIMAL(5,1) NULL COMMENT '目标体重kg',
  activity_level TINYINT NOT NULL DEFAULT 2 COMMENT '1久坐 2轻度 3中度 4高强度',
  org_id VARCHAR(30) NOT NULL COMMENT '所属机构id(fitpro/hrclub/nutri)',
  user_id INT UNSIGNED NULL COMMENT '关联C端用户id(用于复用真实打卡数据)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_org (org_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='B端学员表（机构管理的学员档案）';

-- ======================== 减肥知识文章种子数据 ========================
INSERT INTO articles (title, category, summary, content) VALUES
('科学减脂的第一步：认识热量缺口', '科普',
 '减脂的本质是热量缺口。搞清楚消耗与摄入的关系，你才算真正入门。',
 '减脂的核心原理只有一个：热量缺口。当你的身体消耗大于摄入时，身体会动用储存的脂肪来填补差额，体重随之下降。

人体的每日总消耗（TDEE）由三部分组成：基础代谢（占60%-70%）、食物热效应（约10%）和活动消耗（20%-30%）。基础代谢由身高、体重、年龄和性别决定，是制定减脂计划的起点。

一般建议每天制造300-500千卡的热量缺口，对应每周减重0.5-1斤。缺口过大虽然掉秤快，但会流失肌肉、降低基础代谢，反弹风险极高。

推荐的减脂速度是每周减少体重的0.5%-1%。速度不是越快越好，可持续才是王道。

打开本小程序的「BMI自测」工具，输入身体数据即可算出你的每日消耗和建议摄入量。'),
('三餐怎么吃？减脂期饮食搭配指南', '饮食',
 '不用挨饿也能瘦，掌握主食、蛋白、蔬菜的黄金比例。',
 '减脂餐的第一原则是保证蛋白质摄入。每公斤体重每天摄入1.2-1.6克蛋白质，可以保护肌肉、增强饱腹感。鸡胸肉、鸡蛋、鱼虾、豆制品、牛奶都是优质来源。

主食不必完全戒断。用糙米、燕麦、红薯等低升糖粗粮替代部分精米白面，血糖更平稳，不容易饿。

推荐的餐盘比例：一掌心蛋白质 + 一拳头主食 + 两拳头蔬菜。蔬菜体积大热量低，是增加饱腹感的关键。

烹饪方式比食材更重要：同样的鸡肉，蒸煮和油炸的热量可以相差两倍以上。少油少盐，多用蒸煮炖拌。

想知道一种食物的热量？使用「热量查询」功能，输入食物名称即可查询每100克的热量和三大营养素。'),
('每周运动多久才有效？', '运动',
 '运动不是越多越好，频率、强度和时长的平衡才是关键。',
 '世界卫生组织建议成年人每周进行150-300分钟中等强度有氧运动，或75-150分钟高强度运动。

中等强度的判断标准：运动时能说话但无法唱歌，心率大约在最大心率（220-年龄）的60%-70%。

对于减脂人群，推荐有氧与力量结合。有氧直接消耗热量，力量训练则通过增加肌肉量提升基础代谢，让你躺着也多消耗。

新手可以从每天快走30分钟开始，逐步过渡到慢跑、跳绳等更高效的项目。「运动消耗」工具里可以按MET值估算不同运动的消耗。'),
('有氧 vs 无氧，减脂该选哪个？', '运动',
 '两种运动各有分工，组合起来才是减脂的最优解。',
 '有氧运动（慢跑、游泳、骑行）主要靠氧气供能，持续时间长、总消耗大，对心肺功能提升明显。

无氧运动（力量训练、HIIT）依赖短时爆发供能，单次消耗不如有氧，但能刺激肌肉生长，带来运动后的持续燃脂效应。

研究显示，只做有氧减掉的体重中约有25%来自肌肉，而加入力量训练后肌肉流失会大幅减少。肌肉量高的人基础代谢更高，更不容易反弹。

推荐组合：每周3次有氧（每次30-45分钟）+ 2-3次力量训练，配合充足蛋白质。'),
('为什么体重会波动？别被数字骗了', '科普',
 '一天之内体重波动1-2公斤很正常，学会看趋势而不是看单点。',
 '体重由水分、糖原、肠道内容物和脂肪共同构成。高盐饮食、训练后的肌肉炎症、女性生理周期都会让体重短期上涨1-2公斤，但这不是脂肪。

真正的脂肪变化很缓慢：1公斤脂肪约等于7700千卡热量，即使每天缺口500千卡，也需要两周才能减掉1公斤。

正确的称重方式：每天早晨空腹、排便后、穿着一致，记录后观察周平均值的变化趋势。

体重不是唯一指标。腰围、体脂率、旧衣服的松紧度，都是更真实的进度反馈。'),
('平台期怎么办？突破减脂停滞期', '科普',
 '体重卡住不动是身体的自我保护，调整策略就能再次突破。',
 '减脂2-3个月后体重停滞很常见。随着体重下降，基础代谢降低，加上身体的适应性产热减少，原来的热量缺口会被逐渐抹平。

应对方法一：重新计算每日消耗。体重每下降5公斤，TDEE可能减少100-200千卡，需要下调摄入或增加活动量。

应对方法二：检查隐性热量。酱料、饮料、零食尝起来不多，却是热量的重灾区，用「热量查询」工具逐项排查。

应对方法三：改变运动模式。身体会适应熟悉的运动，尝试新的项目或加入间歇训练，打破代谢适应。

平台期有时也是身体的重构期。如果围度在变小、精神状态良好，坚持即可，不必焦虑。'),
('睡眠与压力：被忽视的减脂因素', '科普',
 '熬夜让你更难瘦，皮质醇是隐藏的减脂阻力。',
 '研究发现，同样处于热量缺口，每晚睡5.5小时的人比睡8.5小时的人少减55%的脂肪，肌肉流失却更多。

睡眠不足会升高胃饥饿素、降低瘦素水平，让你第二天更想吃高热量食物，平均多摄入约300千卡。

长期压力升高皮质醇，促进腹部脂肪堆积，还容易引发情绪性进食。

改善建议：固定作息时间，睡前一小时远离手机，每天保证7-8小时睡眠；用运动、冥想等方式主动管理压力。'),
('建立可持续的习惯：不反弹的秘诀', '心态',
 '减脂的终点不是某个体重数字，而是一套可以长期执行的生活方式。',
 '快速减肥法的失败率极高，因为极端方法无法长期坚持。真正成功的减脂者，平均经历了6个月以上的习惯重建。

从小处着手：每餐多加一份蔬菜、把含糖饮料换成水或茶、每天多走2000步。微小的改变累积起来就是巨大的差异。

用记录对抗遗忘：坚持打卡的人减脂成功率显著更高。每天花一分钟记录体重和饮食，就是对自己最好的监督。

允许弹性：每周留一顿自由餐，社交聚会不必如临大敌。计划的弹性恰恰是长期坚持的保障。

记住：你不是在节食，而是在换一种更健康的生活方式。');


