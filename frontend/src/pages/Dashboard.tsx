import { Box, Paper, Stack, Typography, CircularProgress } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'

export const Dashboard = () => {
  const { data: models = [], isLoading } = useQuery({
    queryKey: ['models'],
    queryFn: () => api.get('/models/').then(res => res.data),
    select: (data) => data.filter((model: any) => model.is_active)
  })

  return (
    <Stack spacing={3}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
        <Paper 
        sx={{ 
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 200
        }}
      >
        <Typography component="h2" variant="h6" color="primary" gutterBottom>
          AI Models Overview
        </Typography>
        
        {isLoading ? (
          <Box display="flex" alignItems="center" justifyContent="center" flex={1}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            <Box display="flex" alignItems="baseline" gap={1}>
              <Typography component="p" variant="h4">
                {models.length}
              </Typography>
              <Typography color="text.secondary">
                Active Models
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Active Models:
              </Typography>
              {models.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No active models configured
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {models.map((model: any) => (
                    <Box 
                      key={model.id} 
                      sx={{
                        p: 1.5,
                        bgcolor: 'background.default',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle2">
                        {model.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Model ID: {model.model_id}
                      </Typography>
                      {model.configuration && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {JSON.parse(model.configuration).behavior || 'No behavior specified'}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}
