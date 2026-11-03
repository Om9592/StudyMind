export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { forest: '#245b45', ink: '#202b26', muted: '#737b75', canvas: '#f7f8f5', lime: '#e1ef9b' },
      fontFamily: { sans: ['DM Sans Variable', 'Noto Sans Devanagari', 'sans-serif'], display: ['Manrope Variable', 'Noto Sans Devanagari', 'sans-serif'] },
      boxShadow: { soft: '0 8px 30px -12px rgb(27 53 39 / 12%)' }
    }
  },
  plugins: []
};
