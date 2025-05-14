import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Stack,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Stop as StopIcon } from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';

type DiscordBot = {
  id: number;
  name: string;
  token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type BotForm = {
  name: string;
  token: string;
};

export const BotManager = () => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editBot, setEditBot] = useState<DiscordBot | null>(null);
  const [showEditToken, setShowEditToken] = useState(false);

  const { control, handleSubmit, reset } = useForm<BotForm>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch bots with error handling
  const { data: bots = [], isLoading, isError } = useQuery<DiscordBot[]>({
    queryKey: ['discord-bots'],
    queryFn: async () => {
      try {
        const response = await api.get('/discord-bots/');
        // Fix: handle both array and object with .data
        if (Array.isArray(response)) return response;
        if (response && Array.isArray(response.data)) return response.data;
        return [];
      } catch (err: any) {
        console.error('Failed to fetch bots:', err);
        setError(err.message || 'Failed to load bots');
        return [];
      }
    },
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    staleTime: 30000 // Consider data fresh for 30 seconds
  });

  // Create bot with improved error handling
  const createBot = useMutation({
    mutationFn: (data: BotForm) => api.post('/discord-bots/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discord-bots'] });
      setOpen(false);
      reset();
      setError(null);
    },
    onError: (error: any) => {
      console.error('Create bot error:', error.response?.data || error);
      const message = error.response?.data?.detail || error.message || 'Failed to create bot';
      setError(message);
      setSaving(false);
    }
  });

  // Delete bot with improved error handling
  const deleteBot = useMutation({
    mutationFn: (id: number) => api.delete(`/discord-bots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discord-bots'] });
      setError(null);
    },
    onError: (error: any) => {
      console.error('Delete bot error:', error.response?.data || error);
      const message = error.response?.data?.detail || error.message || 'Failed to delete bot';
      setError(message);
    }
  });

  // Restart bot with improved error handling
  const restartBot = useMutation({
    mutationFn: (id: number) => api.post(`/discord-bots/${id}/restart`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discord-bots'] });
      setError(null);
    },
    onError: (error: any) => {
      console.error('Restart bot error:', error.response?.data || error);
      const message = error.response?.data?.detail || error.message || 'Failed to restart bot';
      setError(message);
    }
  });

  // Add stopBot mutation
  const stopBot = useMutation({
    mutationFn: (id: number) => api.post(`/discord-bots/${id}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discord-bots'] });
      setError(null);
    },
    onError: (error: any) => {
      console.error('Stop bot error:', error.response?.data || error);
      const message = error.response?.data?.detail || error.message || 'Failed to stop bot';
      setError(message);
    }
  });

  // Edit bot mutation
  const updateBot = useMutation({
    mutationFn: (data: { id: number; name: string; token: string }) =>
      api.put(`/discord-bots/${data.id}`, { name: data.name, token: data.token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discord-bots'] });
      setEditOpen(false);
      setEditBot(null);
      setError(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.message || 'Failed to update bot';
      setError(message);
    }
  });

  const onSubmit = async (data: BotForm) => {
    setSaving(true);
    setError(null);
    try {
      await createBot.mutateAsync(data);
    } catch (error: any) {
      // Error is handled by mutation onError
      return;
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this bot?')) {
      await deleteBot.mutate(id);
    }
  };

  const handleRestart = async (id: number) => {
    await restartBot.mutate(id);
  };

  const handleStop = async (id: number) => {
    await stopBot.mutate(id);
  };

  const handleEdit = (bot: DiscordBot) => {
    setEditBot(bot);
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBot) return;
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('editName') as HTMLInputElement).value;
    const token = (form.elements.namedItem('editToken') as HTMLInputElement).value;
    await updateBot.mutateAsync({ id: editBot.id, name, token });
  };

  return (
    <Stack spacing={3}>
      <Snackbar
        open={!!error || isError}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error || 'Failed to load bots. Please try again.'}
        </Alert>
      </Snackbar>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" gutterBottom>
          Discord Bot Manager
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} disabled={saving}>
          Add Bot
        </Button>
      </Stack>

      <Paper>
        {isLoading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading bots...
            </Typography>
          </Stack>
        ) : isError ? (
          <Typography variant="body1" color="error" align="center" py={4}>
            Failed to load bots. Please try again.
          </Typography>
        ) : bots.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" py={4}>
            No bots configured yet. Click "Add Bot" to get started.
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Manage</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bots.map((bot) => (
                  <TableRow key={bot.id}>
                    {/* Manage column: Edit, Delete */}
                    <TableCell>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/bot-integrations/${bot.id}`)}
                        title="Integrate Models"
                        style={{ marginRight: 4 }}
                      >
                        <AssignmentIndIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => handleEdit(bot)}
                        title="Edit Bot"
                        disabled={saving}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(bot.id)}
                        title="Delete Bot"
                        disabled={saving}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    {/* Status column */}
                    <TableCell>
                      <Chip
                        label={bot.is_active ? 'Active' : 'Inactive'}
                        color={bot.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    {/* Name column */}
                    <TableCell>{bot.name}</TableCell>
                    {/* Created column */}
                    <TableCell>{new Date(bot.created_at).toLocaleDateString()}</TableCell>
                    {/* Action column: Start, Restart, Stop */}
                    <TableCell align="right">
                      {/* Start: only if inactive, Play icon */}
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleRestart(bot.id)}
                        title="Start Bot"
                        disabled={bot.is_active || saving}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                      {/* Restart: only if active */}
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleRestart(bot.id)}
                        title="Restart Bot"
                        disabled={!bot.is_active || saving}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                      {/* Stop: only if active */}
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleStop(bot.id)}
                        title="Stop Bot"
                        disabled={!bot.is_active || saving}
                      >
                        <StopIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={open}
        onClose={() => {
          if (!saving) {
            setOpen(false);
            reset();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Add Discord Bot</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Name is required' }}
                render={({ field, fieldState: { error } }) => (
                  <TextField {...field} label="Bot Name" fullWidth error={!!error} helperText={error?.message} />
                )}
              />

              <Controller
                name="token"
                control={control}
                rules={{ required: 'Token is required' }}
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    label="Bot Token"
                    fullWidth
                    error={!!error}
                    helperText={error?.message || 'Enter the token from Discord Developer Portal'}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                if (!saving) {
                  setOpen(false);
                  reset();
                }
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving && <CircularProgress size={16} color="inherit" />}
            >
              {saving ? 'Adding...' : 'Add Bot'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Edit Bot</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField name="editName" label="Bot Name" fullWidth defaultValue={editBot?.name} required />
              <TextField
                name="editToken"
                label="Bot Token"
                fullWidth
                defaultValue={editBot?.token}
                required
                type={showEditToken ? 'text' : 'password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showEditToken ? 'Hide token' : 'Show token'}
                        onClick={() => setShowEditToken((show) => !show)}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showEditToken ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)} disabled={updateBot.isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={updateBot.isLoading}>
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
};
