import React, { useEffect, useState } from 'react';
import { Stack, Typography, Paper } from '@mui/material';
import { api } from '../utils/api';

interface ConversationEntry {
  user: string;
  model: string;
}

const ConversationHistory = () => {
  const [history, setHistory] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/conversation-history');
        console.log(response);
        if (Array.isArray(response.data)) {
          setHistory(response.data);
        } else {
          setError('Response data is not an array');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">Error: {error}</Typography>;

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Conversation History</Typography>
      <Paper>
        {history.length > 0 ? (
          history.map((entry, index) => (
            <Stack key={index} spacing={1} sx={{ padding: 2 }}>
              <Typography variant="body1"><strong>User:</strong> {entry.user}</Typography>
              <Typography variant="body1"><strong>Model:</strong> {entry.model}</Typography>
            </Stack>
          ))
        ) : (
          <Typography variant="body1" color="text.secondary" align="center" py={4}>No conversation history available.</Typography>
        )}
      </Paper>
    </Stack>
  );
};

export default ConversationHistory;
