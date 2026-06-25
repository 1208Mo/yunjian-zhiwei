// 大模型调用与 prompt 构造的共享逻辑（百度智能云千帆 ERNIE，OpenAI 兼容接口）。
// 同时被 Vercel Serverless 函数（api/*.js）和本地 Express 服务（server/index.js）复用。
import { RECIPES } from "../../src/data/recipes.js";

const QIANFAN_URL = "https://qianfan.baidubce.com/v2/chat/completions";
// 默认文本模型
const DEFAULT_MODEL = "ernie-3.5-8k";
// 默认视觉模型（多模态）
const DEFAULT_VL_MODEL = "ernie-4.5-turbo-vl-32k";

// 带退避重试的请求：ERNIE 5.1 等新模型对长 prompt 限流较严，
// 偶发 401(invalid_iam_token)/429 多为瞬时限流，重试即可恢复。
async function fetchWithRetry(body, { retries = 3, stream = false } = {}) {
    const apiKey = process.env.QIANFAN_API_KEY;
    let lastText = "";
    for (let i = 0; i <= retries; i++) {
        const res = await fetch(QIANFAN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });
        if (res.ok && (!stream || res.body)) {
            return res;
        }
        lastText = await res.text().catch(() => "");
        // 仅对疑似限流的状态重试，其它错误立即抛出
        const retriable = res.status === 401 || res.status === 429 || res.status >= 500;
        if (!retriable || i === retries) {
            throw new Error(`大模型返回 ${res.status}: ${lastText}`);
        }
        // 指数退避：0.8s, 1.6s, 3.2s ...
        await new Promise((r) => setTimeout(r, 800 * 2 ** i));
    }
    throw new Error(`大模型请求失败: ${lastText}`);
}

// 给模型的菜谱清单（精简，作为可选参考池）
const RECIPE_BRIEF = RECIPES.map(
    (r) => `${r.name}(${r.category}/${r.tags.join("、")})`,
).join("，");

// 不同模型的输出上限不同：ernie-3.5 上限 2048，其它给 4096。
function maxTokensFor(model) {
    return /3\.5/.test(model) ? 2048 : 4096;
}

// 调用大模型，强制 JSON 输出
export async function callErnie(systemPrompt, userPrompt) {
    const apiKey = process.env.QIANFAN_API_KEY;
    const model = process.env.QIANFAN_MODEL || DEFAULT_MODEL;

    if (!apiKey) {
        throw new Error("缺少 QIANFAN_API_KEY 环境变量");
    }

    const res = await fetchWithRetry({
        model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: maxTokensFor(model),
        response_format: { type: "json_object" },
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
}

// 流式调用大模型：逐块回调增量文本（onDelta），结束返回完整文本。
// 用于让前端边生成边展示，缩短「首字」等待感。
export async function callErnieStream(systemPrompt, userPrompt, onDelta) {
    const apiKey = process.env.QIANFAN_API_KEY;
    const model = process.env.QIANFAN_MODEL || DEFAULT_MODEL;

    if (!apiKey) {
        throw new Error("缺少 QIANFAN_API_KEY 环境变量");
    }

    const res = await fetchWithRetry(
        {
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: maxTokensFor(model),
            response_format: { type: "json_object" },
            stream: true,
        },
        { stream: true },
    );

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    // 解析 SSE：以「data: {json}」分行，[DONE] 结束
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // 末尾不完整行留到下一轮
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) {
                continue;
            }
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
                continue;
            }
            try {
                const json = JSON.parse(payload);
                const delta = json?.choices?.[0]?.delta?.content || "";
                if (delta) {
                    full += delta;
                    onDelta?.(delta);
                }
            } catch {
                // 单行解析失败忽略，继续读后续块
            }
        }
    }

    return full;
}
// imageDataUrl 形如 "data:image/jpeg;base64,...."。
export async function callErnieVision(systemPrompt, userText, imageDataUrl) {
    const apiKey = process.env.QIANFAN_API_KEY;
    // 视觉模型，单独配置，默认 ernie-4.5-turbo-vl-32k
    const model = process.env.QIANFAN_VL_MODEL || DEFAULT_VL_MODEL;

    if (!apiKey) {
        throw new Error("缺少 QIANFAN_API_KEY 环境变量");
    }
    if (!imageDataUrl) {
        throw new Error("缺少图片数据");
    }

    const res = await fetchWithRetry({
        model,
        messages: [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: { url: imageDataUrl },
                    },
                    { type: "text", text: userText },
                ],
            },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
}

// 从模型返回里安全解析 JSON。
// 模型偶尔会输出 markdown 围栏或结尾多余逗号，这里做容错清洗后再解析。
export function parseJsonLoose(text) {
    try {
        return JSON.parse(text);
    } catch {
        // 1) 去掉 ```json ... ``` 之类的代码围栏
        let s = text.replace(/```(?:json)?/gi, "");
        // 2) 抠出最外层的 {...}
        const match = s.match(/\{[\s\S]*\}/);
        if (match) {
            s = match[0];
        }
        // 3) 清理对象/数组结尾的多余逗号：,} 或 ,]（含中间空白/换行）
        s = s.replace(/,(\s*[}\]])/g, "$1");
        // 4) 修复模型偶发漏写 "amount" 字段名：
        //    {"name":"牛腩",500,"unit":"g"} -> {"name":"牛腩","amount":500,"unit":"g"}
        s = s.replace(
            /("name"\s*:\s*"[^"]*"\s*,\s*)(\d+(?:\.\d+)?)(\s*,\s*"unit")/g,
            '$1"amount":$2$3',
        );
        // 5) 删除游离的裸数字元素（前面是逗号、后面紧跟引号键名，说明它没有键）：
        //    "name":"番茄",2,"amount":300 -> "name":"番茄","amount":300
        s = s.replace(/,\s*\d+(?:\.\d+)?\s*(,\s*")/g, "$1");
        try {
            return JSON.parse(s);
        } catch {
            throw new Error("模型未返回合法 JSON");
        }
    }
}

// 构造「今日菜单」prompt
export function buildMenuPrompt(body) {
    const {
        ingredients = [],
        clearout = [],
        serves = 2,
        maxTime = 30,
        tastes = [],
        cuisines = [],
        healthGoals = [],
        cookware = [],
        dislikes = [],
        avoid = [],
    } = body || {};

    // 按人数决定菜品数量：1人2道，2人3道，3-4人4道，5人及以上5-6道
    const dishCount =
        serves <= 1 ? 2 : serves <= 2 ? 3 : serves <= 4 ? 4 : serves <= 6 ? 5 : 6;
    // 荤菜下限：人多时多上几道硬菜，别小气
    const meatMin = serves <= 1 ? 1 : serves <= 2 ? 1 : serves <= 4 ? 2 : 3;

    const system = [
        "你是「云间知味」的 AI 营养师兼大厨，为中国年轻人决定每天吃什么。",
        `请基于用户输入生成 1 套搭配均衡、丰盛实在的今日菜单，必须正好 ${dishCount} 道菜（荤素搭配，可含汤/主食），其中至少 ${meatMin} 道荤菜。`,
        "必须严格输出 JSON，结构如下：",
        '{"title":string,"summary":string,"dishes":[{"name":string,"emoji":string,"category":"荤菜|素菜|汤|主食","time":number,"tags":[string],"reason":string,"prep":[string],"ingredients":[{"name":string,"amount":number,"unit":string}],"seasoning":[{"name":string,"amount":number,"unit":string}],"sauce":[{"name":string,"amount":number,"unit":string}],"steps":[string],"tips":string}]}',
        `要求：1) 现有食材是可参考的备料，灵活取用即可，不必每样都用上、也不必只用这些——该补充的常见食材（肉、菜、调料）大胆补；用户选了多种肉就尽管多做几道荤菜，不要为了"省"而少做；2) 备料用量要贴合 ${serves} 人份；3) reason 说明为什么推荐这道；4) summary 一句话点评整桌搭配；5) 若用户限定了现有厨具，只能推荐用这些厨具可完成的菜，绝不推荐需要其它厨具的菜（如无烤箱不推荐烤焗类，无蒸锅不推荐清蒸类）；6) prep 给出每样主料的刀工与预处理（怎么切、是否焯水/腌制/泡水/吸干水分），逐条列出；7) sauce 给出需要预先兑好的碗汁/酱料配比（如糖醋汁、鱼香汁、宫保汁；无需调汁的菜给空数组）；8) steps 要分步详细，每步说清火候和时间，至少 4 步。`,
        "9) 忌口是硬性要求：用户列出的忌口食材绝对不能出现在任何菜的食材或菜名中，连作为配料、点缀、汤底都不行。哪怕用户在「现有食材」里填了忌口食材，也要忽略它、不用它。",
        "10) 若指定了一个或多个菜系，整桌菜要体现这些菜系的特色做法（如粤菜重清鲜本味、多蒸炒煲；川菜重麻辣鲜香；湘菜重香辣）；指定多个菜系时可融合，每个菜系都尽量有菜体现，一道菜归属哪个菜系就标哪个。未指定菜系则按家常做法。",
        "11) emoji 必须贴合这道菜本身（看主料/品类），不要乱配：汤羹类用🍲/🥣，青菜/素菜用🥬/🥦，鱼用🐟，虾用🦐，鸡用🍗，蛋用🥚，主食米饭面条用🍚/🍜，豆角等绿色蔬菜不要配🌶️辣椒，只有真正的辣菜才用🌶️。",
        "12) tags（口味标签）要与做法一致，不能自相矛盾：用户要求清淡/低脂时，绝对不要做辣的菜、也不要出现「麻辣/香辣/辣」等标签和辣椒；要求清淡就走蒸、煮、白灼、清炒等清淡做法。",
        `13) 再次强调：本次必须输出 ${dishCount} 道菜，不能少。`,
        `可参考的家常菜池（也可发挥）：${RECIPE_BRIEF}`,
    ].join("\n");

    // 忌口食材：从现有食材里剔除，避免自相矛盾
    const usableIngredients = ingredients.filter((i) => !dislikes.includes(i));

    const userLines = [
        `用餐人数：${serves} 人（需要 ${dishCount} 道菜，含至少 ${meatMin} 道荤菜）`,
        `现有食材(可参考，不必全用，也可另加)：${usableIngredients.join("、") || "未提供"}`,
        `冰箱清仓(快过期，优先用)：${clearout.join("、") || "无"}`,
        `单道菜最长耗时：${maxTime} 分钟`,
        `菜系要求(可多个，整桌都要体现这些菜系的手法与口味，未指定则家常即可)：${cuisines.join("、") || "不限"}`,
        `口味偏好：${tastes.join("、") || "不限"}`,
        `健康目标：${healthGoals.join("、") || "无"}`,
        `现有厨具(仅能用这些，未提供则不限)：${cookware.join("、") || "不限"}`,
        `【忌口/不吃，绝对禁止出现】：${dislikes.join("、") || "无"}`,
    ];
    if (avoid.length) {
        userLines.push(
            `这些菜上次已经推荐过，请换成不同的菜，不要重复：${avoid.join("、")}`,
        );
    }

    return { system, user: userLines.join("\n") };
}

// 构造「趣味荐餐」prompt
export function buildFunPrompt(body) {
    const { mode, constellation, element, luckyColor } = body || {};

    const system = [
        "你是「云间知味」的趣味荐餐官，用轻松有梗的语气为用户推荐 2 道菜。",
        "必须严格输出 JSON：",
        '{"title":string,"line":string,"dishes":[{"name":string,"emoji":string,"category":string,"time":number,"tags":[string],"reason":string,"ingredients":[{"name":string,"amount":number,"unit":string}],"seasoning":[{"name":string,"amount":number,"unit":string}],"steps":[string],"tips":string}]}',
        "line 要结合主题写一句有记忆点的开场白。",
        "搭配必须合理，是能凑成一顿正经饭的两道菜：通常是「一道下饭的硬菜 + 一道配菜/青菜」，或「一荤一素」。绝对不要同时给两道汤水/流食（如粥+汤、汤+羹），也不要两道都是主食或两道都是甜品。category 要如实标注（荤菜/素菜/汤/主食），且两道菜的 category 不应重复成两份汤或两份主食。",
        "食材要丰富多样、不要老用同一种：荤菜的蛋白来源要在 鸡、鸭、鹅、乳鸽、牛肉、猪肉、羊肉、虾、蛋、豆制品 等之间灵活变换；不要总是推荐鱼，更不允许两道菜都用鱼或同一种主料。每次推荐尽量换不同的食材，给人新鲜感。",
    ].join("\n");

    let theme;
    if (mode === "constellation") {
        theme = `主题：${constellation}星座今日荐餐，结合该星座性格推荐。`;
    } else if (mode === "element") {
        theme = `主题：五行「${element}」当道，按对应口味（如火=苦辣、水=咸鲜、木=清酸、土=甘甜、金=辛香）推荐。`;
    } else {
        theme = `主题：菜单盲盒，今日幸运色【${luckyColor}】，随机但合理地开出惊喜组合。`;
    }

    return { system, user: theme };
}

// 构造「拍照识别食材」prompt（配合 callErnieVision 使用）
export function buildVisionPrompt() {
    const system = [
        "你是「云间知味」的食材识别助手。用户会上传一张冰箱、菜篮或食材摆放的照片。",
        "请仔细识别图中所有可食用的食材（蔬菜、肉类、蛋奶、调料、主食等），忽略容器、包装袋、餐具等非食材物品。",
        "必须严格输出 JSON，结构如下：",
        '{"ingredients":[{"name":string,"confidence":number}],"note":string}',
        "要求：1) name 用简洁的中文食材名（如「番茄」「鸡蛋」「五花肉」），不要带数量或修饰；2) confidence 为 0~1 的识别置信度；3) 按置信度从高到低排序；4) 同种食材只列一次；5) note 一句话总结识别情况；6) 若图中没有可识别食材，ingredients 返回空数组。",
    ].join("\n");

    const user = "请识别这张图片里的所有食材。";

    return { system, user };
}

// ===== 两阶段菜单：先出菜名列表（快），再逐道补详情 =====

// 阶段一：只生成菜名+emoji+分类+耗时+一句理由，输出短、3-5秒即回
export function buildMenuListPrompt(body) {
    const {
        ingredients = [],
        clearout = [],
        serves = 2,
        maxTime = 30,
        tastes = [],
        cuisines = [],
        healthGoals = [],
        cookware = [],
        dislikes = [],
        avoid = [],
    } = body || {};

    // 点菜规矩：菜品数 = 人头 + 1（不含主食）。荤菜约占一半。
    const dishCount = serves + 1;
    const meatMin = Math.max(1, Math.ceil(dishCount / 2));

    const system = [
        "你是「云间知味」的 AI 大厨，为用户搭配今日菜单。",
        `本次只需快速给出菜单的「菜名清单」。按"人头+1"的点菜规矩，正好 ${dishCount} 道菜（不含主食，即这 ${dishCount} 道里不要放米饭/面条等主食，主食默认配米饭），荤素搭配，其中至少 ${meatMin} 道荤菜。先不要写做法和食材。`,
        "必须严格输出 JSON：",
        '{"title":string,"summary":string,"dishes":[{"name":string,"emoji":string,"category":"荤菜|素菜|汤","time":number,"tags":[string],"reason":string}]}',
        "要求：1) 现有食材是可参考备料，灵活取用、可另加常见食材，用户选了多种肉就多做几道荤菜，不要为省而少做；2) reason 一句话说明推荐理由（20字内）；3) summary 一句话点评整桌；4) 忌口食材绝对不能出现；5) 指定菜系时整桌体现其特色，多个可融合；6) emoji 贴合菜品，青菜别配🌶️，只有辣菜才用🌶️；7) tags 与做法一致，清淡/低脂时不要辣菜和辣标签；8) 只输出上面字段，不要 steps/ingredients。",
        "9) 每道荤菜的主料要不同，绝对不要一顿饭出现两道用同一种肉的菜（如不能同时有两道猪肉菜或两道鸡肉菜）；多道荤菜就用不同的肉/海鲜（猪/鸡/牛/虾/鱼等）错开。",
        "10) 不要把「冰箱清仓」食材当成必须优先消耗的硬指标，正常按好吃、搭配合理来配菜即可，清仓食材用不上也没关系。",
        "11) 这几道菜里不要包含主食类（米饭/面条/馒头/饺子等），主食单独配。",
    ].join("\n");

    const usableIngredients = ingredients.filter((i) => !dislikes.includes(i));
    const userLines = [
        `用餐人数：${serves} 人（按人头+1，需要 ${dishCount} 道菜，不含主食，含至少 ${meatMin} 道荤菜，多道荤菜的肉类不可重复）`,
        `现有食材(可参考，不必全用，也可另加)：${usableIngredients.join("、") || "未提供"}`,
        `冰箱里有(不必优先用，用不上也行)：${clearout.join("、") || "无"}`,
        `单道菜最长耗时：${maxTime} 分钟`,
        `菜系要求(可多个)：${cuisines.join("、") || "不限"}`,
        `口味偏好：${tastes.join("、") || "不限"}`,
        `健康目标：${healthGoals.join("、") || "无"}`,
        `现有厨具(仅能用这些，未提供则不限)：${cookware.join("、") || "不限"}`,
        `【忌口/不吃，绝对禁止出现】：${dislikes.join("、") || "无"}`,
    ];
    if (avoid.length) {
        userLines.push(`这些菜上次已推荐，请换不同的：${avoid.join("、")}`);
    }

    return { system, user: userLines.join("\n") };
}

// 阶段二：给定一道菜名，补全做法详情（prep/食材/调料/做法/贴士）
export function buildDishDetailPrompt(body) {
    const {
        name = "",
        serves = 2,
        cookware = [],
        cuisines = [],
        dislikes = [],
    } = body || {};

    const system = [
        "你是「云间知味」的 AI 大厨。用户给你一道菜名，请补全这道菜的详细做法。",
        "必须严格输出 JSON：",
        '{"name":string,"emoji":string,"category":string,"time":number,"tags":[string],"prep":[string],"ingredients":[{"name":string,"amount":number,"unit":string}],"seasoning":[{"name":string,"amount":number,"unit":string}],"sauce":[{"name":string,"amount":number,"unit":string}],"steps":[string],"tips":string}',
        `要求：1) 备料用量贴合 ${serves} 人份；2) prep 给出主料刀工与预处理；3) sauce 给出需预先兑好的碗汁配比（无则空数组）；4) steps 分步详细，每步说清火候时间，至少 4 步；5) 忌口食材不能出现；6) 若指定厨具，做法只能用这些厨具。`,
    ].join("\n");

    const user = [
        `菜名：${name}`,
        `人数：${serves} 人`,
        `菜系参考：${cuisines.join("、") || "家常"}`,
        `现有厨具(仅能用这些，未提供则不限)：${cookware.join("、") || "不限"}`,
        `【忌口，禁止出现】：${dislikes.join("、") || "无"}`,
    ].join("\n");

    return { system, user };
}

// 构造「点菜单」prompt：按早/中/晚三餐各生成若干候选菜，供对方挑选。
// 候选卡片只需轻量信息（名称/理由/耗时），做法详情由 /api/dish 按需再生成。
export function buildPickPrompt(body) {
    const { tastes = [], note = "", dislikes = [], cuisines = [] } = body || {};

    const system = [
        "你是「云间知味」的私人点菜官，要为用户的另一半准备一份「今日吃什么」的候选菜单。",
        "请按早餐、午餐、晚餐三个餐次，各推荐 3 道家常、易做、适口的菜，让对方从中挑选。",
        "餐次要符合中国人的饮食习惯：早餐是早餐该吃的东西——肠粉、云吞面、生煎、煎饺、包子、粥、豆浆油条、三明治、鸡蛋饼、热干面、小笼包、馄饨等，绝对不要把午晚餐的炒菜（如番茄炒蛋、宫保鸡丁这类下饭炒菜）当早餐；午餐有荤有素能配米饭；晚餐稍丰盛但不油腻。",
        "必须严格输出 JSON，结构如下（保持精简，不要输出做法步骤和食材清单）：",
        '{"intro":string,"meals":[{"meal":"早餐|午餐|晚餐","emoji":string,"dishes":[{"name":string,"emoji":string,"category":string,"time":number,"tags":[string],"reason":string}]}]}',
        "要求：1) 早餐是真正的早餐食物（见上），午餐有荤有素，晚餐稍丰盛但不油腻；2) reason 用温暖体贴的语气说明为什么推荐给 TA（一句话，15字内）；3) intro 是一句撒糖的开场白；4) 只输出菜名等基本信息，不要写 steps/ingredients；5) 忌口食材绝对不能出现在任何菜里；6) 若指定了一个或多个菜系，三餐都尽量贴合这些地方风味（如粤菜早餐肠粉/艇仔粥，川菜担担面等），多个菜系可融合；7) emoji 要贴合菜品本身，青菜不要配辣椒🌶️，只有辣菜才用🌶️。",
    ].join("\n");

    const user = [
        `口味偏好：${tastes.join("、") || "不限"}`,
        `菜系要求(可多个，尽量贴合这些地方风味，未指定则不限)：${cuisines.join("、") || "不限"}`,
        `【忌口/不吃，绝对禁止出现】：${dislikes.join("、") || "无"}`,
        `特别说明：${note || "无"}`,
    ].join("\n");

    return { system, user };
}

