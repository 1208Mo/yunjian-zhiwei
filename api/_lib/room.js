// 「TA来挑菜」分享房间的业务逻辑，本地 Express 与 Vercel 函数共用。
import { kvGetJson, kvSetJson, makeShareCode } from "./store.js";

const roomKey = (code) => `room:${String(code).toUpperCase()}`;
// 自定义暗号：2-16 位字母或数字
const CODE_RE = /^[A-Za-z0-9]{2,16}$/;

// 建/更新房间：存入菜单，返回分享码。
// 传 code 则用固定暗号（覆盖更新、清空旧选择）；不传则随机生成。
export async function createRoom(body) {
    const { menu, from = "", code: rawCode } = body || {};
    if (!menu || !Array.isArray(menu.meals)) {
        throw Object.assign(new Error("缺少有效的 menu"), { status: 400 });
    }
    let code;
    let existing = null;
    if (rawCode) {
        if (!CODE_RE.test(rawCode)) {
            throw Object.assign(new Error("暗号只能是 2-16 位字母或数字"), {
                status: 400,
            });
        }
        code = String(rawCode).toUpperCase();
        existing = await kvGetJson(roomKey(code));
    } else {
        code = makeShareCode();
    }
    const room = {
        code,
        from,
        menu,
        picks: {}, // 新菜单清空旧选择：{ 早餐: dishId, 午餐: dishId, 晚餐: dishId }
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
    };
    await kvSetJson(roomKey(code), room);
    return { code };
}

// 读房间
export async function getRoom(code) {
    if (!code) {
        throw Object.assign(new Error("缺少 code"), { status: 400 });
    }
    const room = await kvGetJson(roomKey(code));
    if (!room) {
        throw Object.assign(new Error("房间不存在或已过期"), { status: 404 });
    }
    return room;
}

// 提交/更新某一餐的选择
export async function submitPick(code, body) {
    const { meal, dishId } = body || {};
    if (!meal || dishId == null) {
        throw Object.assign(new Error("缺少 meal 或 dishId"), { status: 400 });
    }
    const room = await getRoom(code);
    room.picks = { ...room.picks, [meal]: dishId };
    room.updatedAt = Date.now();
    await kvSetJson(roomKey(code), room);
    return { picks: room.picks, updatedAt: room.updatedAt };
}
