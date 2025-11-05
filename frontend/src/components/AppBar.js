import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { 
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AppBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    // Use a timeout to ensure the menu is closed before navigation
    setTimeout(() => {
      setAnchorEl(null);
    }, 100);
  };

  const handleLogout = () => {
    handleClose();
    // Small delay to ensure menu is closed before navigation
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 150);
  };

  const handleProfile = () => {
    handleClose();
    // Small delay to ensure menu is closed before navigation
    setTimeout(() => {
      navigate('/dashboard');
    }, 150);
  };

  return (
    <MuiAppBar
      position="fixed"
      sx={{
        width: '100%',
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}
    >
      <Toolbar sx={{ px: 3 }}>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, ml: 2 }}>
          Serverless CRUD App
        </Typography>
        
        {user ? (
          <Box>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar 
                alt={user.name || 'User'} 
                src="/static/images/avatar/1.jpg"
                sx={{ width: 32, height: 32 }}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={open}
              onClose={handleClose}
              // Add these props to fix the StrictMode issue
              disableAutoFocusItem
              MenuListProps={{
                'aria-labelledby': 'menu-appbar',
                role: 'menu',
              }}
              // Add transition props for smoother closing
              TransitionProps={{ timeout: 150 }}
            >
              <MenuItem onClick={handleProfile}>
                Profile
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/login"
              sx={{ mr: 1 }}
            >
              Login
            </Button>
            <Button 
              variant="outlined" 
              color="inherit" 
              component={RouterLink} 
              to="/register"
            >
              Sign Up
            </Button>
          </Box>
        )}
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;
