// 菜品注册表：列表页渲染时登记菜品，详情页按 id 取用。
// 解决 AI 动态生成的菜品没有持久数据源、详情页无法查到的问题。
const registry = new Map();

export function registerDishes(dishes) {
    dishes.forEach((d) => registry.set(String(d.id), d));
}

export function getDish(id) {
    return registry.get(String(id));
}
