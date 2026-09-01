/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta ciano — ciano como cor dominante, rosa reservado a pequenos detalhes
        // Neutro base (antigo "cream")
        cream: {
          50: '#fbfdfd',
          100: '#f2f7f7',
          200: '#e4edec',
        },
        // Rosa — uso pontual (badges, estados, poucos detalhes)
        strawberry: {
          100: '#fce7f0',
          200: '#f9c9dd',
          300: '#f49cc0',
          400: '#ef6fa3',
          500: '#e5417f',
          600: '#c92a68',
          700: '#a51f55',
        },
        // Ciano claro de apoio (sucesso / "mint")
        mint: {
          100: '#d7f6ef',
          300: '#7ee0cb',
          500: '#12b48a',
          600: '#0c9271',
        },
        // Ciano principal (antigo "blueberry") — tom mais claro e azulado
        blueberry: {
          50: '#eff9fc',
          100: '#d7f0f7',
          200: '#aee0ef',
          300: '#78cbe3',
          400: '#42afd1',
          500: '#1f93ba',
          600: '#15779c',
          700: '#12617f',
          800: '#154f67',
          900: '#164154',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 24px -10px rgba(15, 23, 42, 0.14)',
      },
    },
  },
  plugins: [],
};
