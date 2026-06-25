/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                // 暖色但降饱和：取自下厨房/温暖餐饮的低彩度暖橙（赤陶色系）
                brand: {
                    50: "#faf6f2",
                    100: "#f3e9e0",
                    200: "#e6d2c0",
                    300: "#d4b095",
                    400: "#c08a63",
                    DEFAULT: "#b5683f",
                    500: "#b5683f",
                    600: "#9c5333",
                    700: "#7e422a",
                    800: "#643626",
                    900: "#522e22",
                },
                // 中性暖灰（米白/豆沙底）
                ink: {
                    50: "#f7f5f2",
                    100: "#efece7",
                    200: "#e2ddd5",
                    300: "#c8c0b4",
                    400: "#a39a8c",
                    500: "#807769",
                    600: "#615a4f",
                    700: "#4a443c",
                    800: "#332f29",
                    900: "#221f1b",
                },
            },
            fontFamily: {
                sans: [
                    "-apple-system",
                    "BlinkMacSystemFont",
                    "PingFang SC",
                    "Microsoft YaHei",
                    "sans-serif",
                ],
            },
            keyframes: {
                fadeup: {
                    from: { opacity: "0", transform: "translateY(12px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                pop: {
                    "0%": { transform: "scale(.8)", opacity: "0" },
                    "60%": { transform: "scale(1.05)" },
                    "100%": { transform: "scale(1)", opacity: "1" },
                },
                shimmer: {
                    "100%": { transform: "translateX(100%)" },
                },
                float: {
                    "0%,100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-6px)" },
                },
                wiggle: {
                    "0%,100%": { transform: "rotate(-8deg)" },
                    "50%": { transform: "rotate(8deg)" },
                },
                "bounce-in": {
                    "0%": { transform: "scale(.3)", opacity: "0" },
                    "50%": { transform: "scale(1.15)" },
                    "70%": { transform: "scale(.95)" },
                    "100%": { transform: "scale(1)", opacity: "1" },
                },
                "gradient-x": {
                    "0%,100%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                },
            },
            animation: {
                fadeup: "fadeup .4s ease both",
                pop: "pop .5s cubic-bezier(.18,.89,.32,1.28) both",
                shimmer: "shimmer 1.6s infinite",
                float: "float 3s ease-in-out infinite",
                wiggle: "wiggle .6s ease-in-out infinite",
                "bounce-in": "bounce-in .55s cubic-bezier(.18,.89,.32,1.28) both",
                "gradient-x": "gradient-x 4s ease infinite",
            },
        },
    },
    plugins: [],
};
