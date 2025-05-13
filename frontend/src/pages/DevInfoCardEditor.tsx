import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Paper, Typography, TextField, Button, Box, Alert, Stack, Container } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

const defaultCard = {
  title: '',
  color: '#5865F2',
  purpose: '',
  features: '',
  commands: '',
  source_docs: '',
  footer: '',
};

export default function DevInfoCardEditor() {
  const [card, setCard] = useState(defaultCard);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    axios.get('/discord-bots/bot-info-card')
      .then(res => {
        setCard(res.data);
        // Set last update date from backend if available, else now
        if (res.data && res.data.updated_at) {
          setLastUpdate(new Date(res.data.updated_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }));
        } else {
          setLastUpdate(new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }));
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError('Failed to load info card.');
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCard({ ...card, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const now = new Date().toISOString();
    try {
      await axios.put('/discord-bots/bot-info-card', {
        ...card,
        title: 'Development Information',
        footer: `Develop by Daevaesma | ${new Date(now).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        source_docs: '', // Remove source & docs
        updated_at: now,
      });
      setLastUpdate(new Date(now).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }));
      setSuccess('Info card updated!');
    } catch {
      setError('Failed to update info card.');
    }
    setSaving(false);
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Development Information</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField label="Color (hex, e.g. #5865F2)" name="color" value={card.color} onChange={handleChange} fullWidth />
            <TextField label="Purpose" name="purpose" value={card.purpose} onChange={handleChange} fullWidth multiline minRows={2} />
            <TextField label="Features" name="features" value={card.features} onChange={handleChange} fullWidth multiline minRows={3} />
            <TextField label="Commands" name="commands" value={card.commands} onChange={handleChange} fullWidth multiline minRows={2} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Develop by Daevaesma | {lastUpdate}
            </Typography>
            <Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
