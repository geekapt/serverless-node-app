import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, CssBaseline, Container } from '@mui/material';
import AppBar from './AppBar';

const Layout = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      {!isAuthPage && <AppBar />}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          ...(isAuthPage ? {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          } : {
            p: 3,
            mt: '64px', // Height of the AppBar
            ml: { sm: '240px' },
            width: { sm: `calc(100% - 240px)` },
          })
        }}
      >
        {isAuthPage ? (
          <Outlet />
        ) : (
          <Container maxWidth="lg" sx={{ mb: 4 }}>
            <Outlet />
          </Container>
        )}
      </Box>
    </Box>
  );
};

export default Layout;
