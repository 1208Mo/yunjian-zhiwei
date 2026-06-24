// 将用户选择的图片文件压缩为较小的 JPEG dataURL，
// 控制上传体积（视觉识别不需要原图分辨率），降低请求失败概率。
export function fileToCompressedDataUrl(file, maxSize = 1024, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("图片读取失败"));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("图片解析失败"));
            img.onload = () => {
                let { width, height } = img;
                // 等比缩放到最长边不超过 maxSize
                if (width > height && width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else if (height >= width && height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}
