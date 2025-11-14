import React, { useState, useEffect, useCallback } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Snackbar,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

// Alert component for Snackbar
const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// API Configuration
const API_CONFIG = {
  BASE_URL: 'YOUR_URL',
  API_KEY: 'YOUR_API_KEY'
};

// API endpoints - all using the root URL with different methods
const API_ENDPOINTS = {
  getItems: () => API_CONFIG.BASE_URL,  // GET
  createItem: () => API_CONFIG.BASE_URL, // POST
  updateItem: (id) => API_CONFIG.BASE_URL, // PUT with ID in the body
  deleteItem: (id) => `${API_CONFIG.BASE_URL}?id=${encodeURIComponent(id)}` // DELETE with ID in query string
};

// Common headers for API requests
const getApiHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'x-api-key': API_CONFIG.API_KEY
});

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' // 'error', 'warning', 'info', 'success'
  });
  const [editing, setEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState({
    id: '',
    name: '',
    description: ''
  });

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const url = API_ENDPOINTS.getItems();
      const response = await fetch(url, {
        method: 'GET',
        headers: getApiHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Handle the response based on its structure
      if (result && Array.isArray(result)) {
        setItems(result);
      } else if (result?.data && Array.isArray(result.data)) {
        setItems(result.data);
      } else if (result?.body) {
        // Handle case where response has a body property
        try {
          const body = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
          if (Array.isArray(body)) {
            setItems(body);
          } else if (body && body.data && Array.isArray(body.data)) {
            setItems(body.data);
          } else if (body && typeof body === 'object') {
            setItems([body]);
          } else {
            console.error('Unexpected response format in body:', body);
            setItems([]);
          }
        } catch (e) {
          console.error('Error parsing response body:', e);
          setItems([]);
        }
      } else {
        console.error('Unexpected response format:', result);
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      // Show error to user
      alert('Failed to load items. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpen = (item = null) => {
    if (item) {
      setCurrentItem(item);
      setEditing(true);
    } else {
      setCurrentItem({ id: '', name: '', description: '' });
      setEditing(false);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isEdit = !!editing;
      // Use the base URL without the /items/{id} path since your curl command uses the root path
      const url = `${API_CONFIG.BASE_URL}?x-api-key=${encodeURIComponent(API_CONFIG.API_KEY)}`;
      
      // Prepare the request body to match exactly what works with curl
      let requestBody;
      if (isEdit) {
        requestBody = JSON.stringify({
          body: JSON.stringify({
            id: currentItem.id,
            updates: {
              name: currentItem.name,
              description: currentItem.description
            }
          })
        });
      } else {
        requestBody = JSON.stringify({
          body: JSON.stringify({
            name: currentItem.name,
            description: currentItem.description
          })
        });
      }
      
      // Create a simple form and submit it to avoid CORS preflight
      const form = document.createElement('form');
      form.method = isEdit ? 'PUT' : 'POST';
      form.action = url;
      form.enctype = 'application/json';
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'body';
      input.value = JSON.stringify({
        id: currentItem.id,
        updates: {
          name: currentItem.name,
          description: currentItem.description
        }
      });
      
      form.appendChild(input);
      document.body.appendChild(form);
      
      // Submit the form and handle the response
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: requestBody,
        mode: 'cors',
        credentials: 'omit'
      });
      
      // Clean up
      document.body.removeChild(form);
      
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
          console.error('Error response text:', errorText);
          // Try to parse as JSON if possible
          const errorData = JSON.parse(errorText);
          console.error('Error response JSON:', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } catch (e) {
          console.error('Error parsing error response:', e);
          throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }
      }
      
      await response.json();
      
      // Refresh the items list
      await fetchItems();
      
      // Close the dialog and reset the form
      setOpen(false);
      setCurrentItem({ id: '', name: '', description: '' });
      setEditing(false);
      
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item. Please check the console for details.');
    }
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    try {
      const url = API_CONFIG.BASE_URL;
      // Format the request body as a string with a body property
      const requestBody = JSON.stringify({
        body: JSON.stringify({ id: id })
      });
      
      // Send the DELETE request with the properly formatted body
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...getApiHeaders(),
          'Content-Type': 'application/json'
        },
        body: requestBody
      });
      
      let responseData;
      try {
        responseData = await response.json();
        
        // Parse the response body if it's a string
        let responseBody = responseData;
        try {
          // If the response has a body property that's a string, parse it
          if (responseData.body && typeof responseData.body === 'string') {
            responseBody = JSON.parse(responseData.body);
          } 
          // If the response is a string, parse it
          else if (typeof responseData === 'string') {
            responseBody = JSON.parse(responseData);
          }
          // If the response is already an object with a body property that's an object
          else if (responseData.body && typeof responseData.body === 'object') {
            responseBody = responseData.body;
          }
        } catch (e) {
          console.error('Error parsing response body:', e);
        }
        
        // Check if the response indicates success
      const success = response.ok && 
        (responseBody.success === true || 
         (response.status >= 200 && response.status < 300));
      
      if (!success) {
        throw new Error(responseBody.message || responseBody.error || 'Failed to delete item');
      }  
        
        // Refresh the items list
        fetchItems();
        
        // Show success message
        setSnackbar({
          open: true,
          message: responseBody.message || 'Item deleted successfully!',
          severity: 'success'
        });
        
      } catch (error) {
        console.error('Error processing delete response:', error);
        throw error;
      }
      
    } catch (error) {
      console.error('Error deleting item:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || 'Failed to delete item'}`,
        severity: 'error'
      });
    }
  };

  if (loading && items.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Add this before the main return
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <ThemeProvider theme={theme}>
      {/* Add Snackbar component */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Dashboard
          </Typography>
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Add Item
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {items.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography gutterBottom variant="h5" component="h2">
                      {item.name}
                    </Typography>
                    <Box>
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpen(item)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDelete(item.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography color="textSecondary" component="p">
                    {item.description}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Created: {new Date(item.created_at).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title" fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Name"
              type="text"
              fullWidth
              variant="outlined"
              value={currentItem.name}
              onChange={handleInputChange}
              required
              sx={{ mt: 2 }}
            />
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={currentItem.description}
              onChange={handleInputChange}
              required
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="primary">
              Cancel
            </Button>
            <Button type="submit" color="primary" variant="contained">
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </ThemeProvider>
  );
}

export default App;
