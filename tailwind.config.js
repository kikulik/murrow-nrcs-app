/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            gridTemplateColumns: {
                '13': 'repeat(13, minmax(0, 1fr))',
            },
            gridColumn: {
                'span-13': 'span 13 / span 13',
            }
        },
    },
    plugins: [],
}
