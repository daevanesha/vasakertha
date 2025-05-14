import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: 'Montserrat, Poppins, Nunito, Quicksand, Futura, Avenir, Arial, sans-serif',
  },
})

export default theme
