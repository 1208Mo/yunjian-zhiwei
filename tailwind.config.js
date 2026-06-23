/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: "#fef7ee",
                    100: "#fdedd6",
                    200: "#fad7ac",
                    300: "#f6b977",
                    400: "#f1934a",
                    DEFAULT: "#ec7424",
                    500: "#ec7424",
                    600: "#dd5a18",
                    700: "#b74316",
                    800: "#923818",
                    900: "#763016",
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
            },
            animation: {
                fadeup: "fadeup .4s ease both",
                pop: "pop .5s cubic-bezier(.18,.89,.32,1.28) both",
            },
        },
    },
    plugins: [],
};
