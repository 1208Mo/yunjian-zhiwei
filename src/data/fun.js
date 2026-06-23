// 趣味推荐的文案与映射表：星座荐餐、五行口味、幸运色

export const CONSTELLATIONS = {
    白羊座: { taste: "重口刺激", elementPref: "火", line: "今天的你能量满格，来点火辣的唤醒味蕾" },
    金牛座: { taste: "扎实满足", elementPref: "土", line: "金牛要吃得踏实，浓郁下饭最对味" },
    双子座: { taste: "新鲜多变", elementPref: "木", line: "善变的双子，来份清爽小炒换换口味" },
    巨蟹座: { taste: "暖心治愈", elementPref: "水", line: "巨蟹需要被治愈，来碗热汤暖到心里" },
    狮子座: { taste: "硬菜大气", elementPref: "火", line: "狮子的餐桌要有排面，硬菜安排" },
    处女座: { taste: "清淡健康", elementPref: "木", line: "处女座讲究，清淡又营养刚刚好" },
    天秤座: { taste: "均衡搭配", elementPref: "土", line: "天秤追求平衡，荤素搭配最舒服" },
    天蝎座: { taste: "浓烈过瘾", elementPref: "火", line: "天蝎要够味，麻辣浓烈才过瘾" },
    射手座: { taste: "异域风味", elementPref: "火", line: "射手爱冒险，来点孜然异域风" },
    摩羯座: { taste: "经典家常", elementPref: "土", line: "摩羯靠谱，经典家常最稳妥" },
    水瓶座: { taste: "创意混搭", elementPref: "水", line: "水瓶脑洞大，混搭新鲜组合走起" },
    双鱼座: { taste: "温柔细腻", elementPref: "水", line: "双鱼浪漫，嫩滑清甜最贴心" },
};

export const ELEMENTS = {
    金: { taste: "辛香", desc: "辛味入肺，葱姜蒜孜然提神" },
    木: { taste: "清酸", desc: "酸味入肝，清爽蔬菜疏解" },
    水: { taste: "咸鲜", desc: "咸味入肾，鲜汤滋补" },
    火: { taste: "苦辣", desc: "苦辣入心，麻辣激发活力" },
    土: { taste: "甘甜", desc: "甘味入脾，温润滋养" },
};

export const LUCKY_COLORS = [
    "红色",
    "金色",
    "绿色",
    "蓝色",
    "白色",
    "粉色",
    "橙色",
    "紫色",
];
