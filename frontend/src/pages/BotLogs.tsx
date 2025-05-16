// BotLogs.tsx
// This page will display conversation logs for a specific bot. For now, it's a placeholder for the logs UI.
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Stack,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import { api } from '../utils/api';

const BotLogs: React.FC = () => {
  const { botId } = useParams();
  // Dropdown state
  const [modelId, setModelId] = useState('');
  const [userName, setUserName] = useState('');
  const [channelName, setChannelName] = useState('');
  const [guildName, setGuildName] = useState('');
  // Loading and error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Logs data
  const [logs, setLogs] = useState<any[]>([]);
  // Dropdown options
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [userNameOptions, setUserNameOptions] = useState<string[]>([]);
  const [channelNameOptions, setChannelNameOptions] = useState<string[]>([]);
  const [guildNameOptions, setGuildNameOptions] = useState<string[]>([]);

  // Fetch dropdown options on mount (from logs API, but only unique values)
  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get('/api/conversation_logs')
      .then((data) => {
        // Filter logs for this botId only
        const filtered = data.filter((log: any) => String(log.bot_id) === String(botId));
        setLogs([]); // No logs shown until user hits Run
        // Extract unique options
        setUserNameOptions(Array.from(new Set(filtered.map((log: any) => log.user_name || String(log.user_id)).filter(Boolean))) as string[]);
        setModelOptions(Array.from(new Set(filtered.map((log: any) => String(log.model_name)).filter(Boolean))) as string[]);
        setChannelNameOptions(Array.from(new Set(filtered.map((log: any) => log.channel_name || String(log.channel_id)).filter(Boolean))) as string[]);
        setGuildNameOptions(Array.from(new Set(filtered.map((log: any) => log.guild_name || String(log.guild_id)).filter(Boolean))) as string[]);
      })
      .catch(() => setError('Failed to load log options'))
      .finally(() => setLoading(false));
  }, [botId]);

  // Fetch logs when Run is clicked
  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setLogs([]);
    try {
      const params = [
        userName && `user_name=${encodeURIComponent(userName)}`,
        modelId && `model_name=${encodeURIComponent(modelId)}`,
        channelName && `channel_name=${encodeURIComponent(channelName)}`,
        guildName && `guild_name=${encodeURIComponent(guildName)}`,
        botId && `bot_id=${encodeURIComponent(botId)}`
      ].filter(Boolean).join('&');
      const url = `/api/conversation_logs${params ? `?${params}` : ''}`;
      const data = await api.get(url);
      setLogs(data);
      if (!data || data.length === 0) setError('No logs found for the selected criteria.');
    } catch (err) {
      setError('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Conversation Logs</Typography>
      <Typography variant="body1" color="text.secondary">
        Logs for Bot ID: {botId}
      </Typography>
      <Stack direction="row" spacing={2}>
        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel>User</InputLabel>
          <Select
            value={userName}
            label="User"
            onChange={e => setUserName(e.target.value)}
          >
            {userNameOptions.map((name) => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }} size="small">
          <InputLabel>Model Name</InputLabel>
          <Select
            value={modelId}
            label="Model Name"
            onChange={e => setModelId(e.target.value)}
          >
            {modelOptions.map((id) => (
              <MenuItem key={id} value={id}>{id}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel>Channel</InputLabel>
          <Select
            value={channelName}
            label="Channel"
            onChange={e => setChannelName(e.target.value)}
          >
            {channelNameOptions.map((name) => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel>Guild</InputLabel>
          <Select
            value={guildName}
            label="Guild"
            onChange={e => setGuildName(e.target.value)}
          >
            {guildNameOptions.map((name) => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={handleRun}
          disabled={loading}
        >
          Run
        </Button>
      </Stack>
      {loading && <CircularProgress sx={{ mt: 2 }} />}
      {error && <Alert severity="error">{error}</Alert>}
      {logs.length > 0 && (
        <Stack spacing={2} mt={2}>
          {logs.map((log, idx) => (
            <Stack key={idx} p={2} border={1} borderRadius={2} borderColor="grey.300" bgcolor="#fafbfc">
              <Typography variant="subtitle2">User: {log.user_name || log.user_id}</Typography>
              <Typography variant="subtitle2">Channel: {log.channel_name || log.channel_id}</Typography>
              <Typography variant="subtitle2">Guild: {log.guild_name || log.guild_id}</Typography>
              <Typography variant="subtitle2">Model: {log.model_name}</Typography>
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}><b>User Message:</b> {log.user_message}</Typography>
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}><b>Bot Response:</b> {log.bot_response}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default BotLogs;
