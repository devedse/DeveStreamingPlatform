import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          primary: '#1E88E5',
          secondary: '#26A69A',
          background: '#121212',
          surface: '#1E1E1E',
          error: '#CF6679',
          success: '#4CAF50',
          warning: '#FB8C00',
          info: '#2196F3',
        },
      },
      light: {
        dark: false,
        colors: {
          primary: '#1976D2',
          secondary: '#00897B',
          background: '#FFFFFF',
          surface: '#F5F5F5',
          error: '#B00020',
          success: '#4CAF50',
          warning: '#FB8C00',
          info: '#2196F3',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
})
