import { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

interface Model {
  id: number;
  name: string;
}

interface Integration {
  id: number;
  bot_id: number;
  model_id: number;
  command: string;
  created_at: string;
  updated_at: string;
  model?: Model;
}

export const BotModelIntegration = () => {
  const { botName } = useParams<{ botName: string }>();
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [modelId, setModelId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [botId, setBotId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/discord-bots/').then(botsRes => {
      const bot = botsRes.data.find((b: any) => b.name === botName);
      if (!bot) return;
      api.get(`/bot-model-integrations/bot/${bot.id}`).then(res => setIntegrations(res.data));
      api.get('/models/').then(res => setModels(res.data));
      setBotId(bot.id);
    });
  }, [botName]);

  const handleAdd = async () => {
    if (!modelId || typeof modelId !== 'number' || isNaN(modelId) || !botId) {
      alert('Please select a valid model and bot.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/bot-model-integrations/', {
        bot_id: botId,
        model_id: modelId,
        command
      });
      setOpen(false);
      setCommand('');
      setModelId('');
      const res = await api.get(`/bot-model-integrations/bot/${botId}`);
      setIntegrations(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to add integration.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/bot-model-integrations/${id}`);
    setIntegrations(integrations.filter(i => i.id !== id));
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Bot-Model Integrations</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add Integration
        </Button>
      </Stack>
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Command</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Manage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {integrations.map((integration) => {
                const model = models.find(m => m.id === integration.model_id);
                return (
                  <TableRow key={integration.id}>
                    <TableCell>{integration.command}</TableCell>
                    <TableCell>{model?.name || integration.model_id}</TableCell>
                    <TableCell>
                      <IconButton color="error" onClick={() => handleDelete(integration.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add Model Integration</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="command"
              name="command"
              label="Command (e.g. !askdesi)"
              value={command}
              onChange={e => setCommand(e.target.value)}
              fullWidth
            />
            <TextField
              id="model"
              name="model"
              select
              label="Model"
              value={modelId}
              onChange={e => setModelId(Number(e.target.value))}
              fullWidth
            >
              {models.map(model => (
                <MenuItem key={model.id} value={model.id}>{model.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" disabled={saving || !command || !modelId}>
            {saving ? 'Saving...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
      <Button onClick={() => navigate(-1)}>Back</Button>
    </Stack>
  );
};
