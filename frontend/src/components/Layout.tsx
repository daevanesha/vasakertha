import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from '@mui/material'
import {
  Menu as MenuIcon,  Dashboard as DashboardIcon,
  SmartToy as SmartToyIcon,
  Psychology as PsychologyIcon,
  SmartButton as BotIcon
} from '@mui/icons-material'
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const drawerWidth = 240

export const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(true);
  const [discordOpen, setDiscordOpen] = useState(true);
  const navigate = useNavigate()

  const  handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }
  
  const drawer = (
    <Box>
      <Toolbar />
      <List>
        <ListItemButton onClick={() => { navigate('/'); setMobileOpen(false); }}>
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        <ListItemButton onClick={() => setAiOpen(!aiOpen)}>
          <ListItemIcon><SmartToyIcon /></ListItemIcon>
          <ListItemText primary="AI Management" />
          {aiOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={aiOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={() => { navigate('/providers'); setMobileOpen(false); }}>
              {/* No icon for submenu */}
              <ListItemText primary="Provider" />
            </ListItemButton>
            <ListItemButton sx={{ pl: 4 }} onClick={() => { navigate('/models'); setMobileOpen(false); }}>
              {/* No icon for submenu */}
              <ListItemText primary="Model" />
            </ListItemButton>
          </List>
        </Collapse>
        <ListItemButton onClick={() => setDiscordOpen(!discordOpen)}>
          <ListItemIcon><BotIcon /></ListItemIcon>
          <ListItemText primary="Discord Management" />
          {discordOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={discordOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} onClick={() => { navigate('/bots'); setMobileOpen(false); }}>
              {/* No icon for submenu */}
              <ListItemText primary="Bot Manager" />
            </ListItemButton>
          </List>
        </Collapse>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            AI Discord Manager
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px'
        }}
      >
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>
    </Box>
  )
}
