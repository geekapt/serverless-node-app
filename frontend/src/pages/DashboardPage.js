import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon 
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { itemsApi } from '../services/api';

const DashboardPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch items on component mount
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const response = await itemsApi.getAll();
        setItems(response.data || []);
      } catch (err) {
        console.error('Error fetching items:', err);
        setError('Failed to load items. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const handleOpenDialog = (item = null) => {
    setCurrentItem(item);
    setFormData({
      name: item ? item.name : '',
      description: item ? item.description : ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentItem(null);
    setFormData({ name: '', description: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      if (currentItem) {
        // Update existing item
        await itemsApi.update(currentItem.itemId, formData);
        setItems(items.map(item => {
          return item.itemId === currentItem.itemId 
            ? { ...item, ...formData, updatedAt: new Date().toISOString() } 
            : item;
        }));
      } else {
        // Create new item
        const response = await itemsApi.create(formData);
        setItems([...items, response.data]);
      }
      
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving item:', err);
      setError('Failed to save item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await itemsApi.delete(itemId);
        setItems(items.filter(item => item.itemId !== itemId));
      } catch (err) {
        console.error('Error deleting item:', err);
        setError('Failed to delete item. Please try again.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box style={{ marginTop: '32px', marginBottom: '32px' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" component="h1">
            Welcome, {user?.name || 'User'}
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={handleLogout}
              style={{ marginRight: '16px' }}
            >
              Logout
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Item
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={2}>
          {items.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography variant="subtitle1" color="textSecondary">
                No items found. Click the "Add Item" button to get started.
              </Typography>
            </Box>
          ) : (
            <List>
              {items.map((item, index) => (
                <React.Fragment key={item.itemId}>
                  <ListItem>
                    <ListItemText
                      primary={item.name}
                      secondary={item.description || 'No description'}
                      primaryTypographyProps={{ variant: 'h6' }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="edit" 
                        onClick={() => handleOpenDialog(item)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        onClick={() => handleDelete(item.itemId)}
                      >
                        <DeleteIcon color="error" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      {/* Add/Edit Item Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{currentItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default DashboardPage;
