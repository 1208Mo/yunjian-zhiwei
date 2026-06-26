// 复制文本到剪贴板，带兜底：
// 1) 优先用 navigator.clipboard（需 HTTPS / 安全上下文）
// 2) 不可用时降级用隐藏 textarea + execCommand('copy')（兼容 http、旧浏览器、微信内置浏览器）
// 返回 Promise<boolean>，true 表示成功。
export async function copyText(text) {
    // 方案一：现代 API
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // 落到降级方案
        }
    }
    // 方案二：execCommand 兜底
    try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        // 放到视口外但仍可被选中
        ta.style.position = "fixed";
        ta.style.top = "-9999px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length); // iOS 需要
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}
