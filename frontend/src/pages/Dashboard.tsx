import { Box, Paper, Stack, Typography, CircularProgress, Chip, Grid } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'

export const Dashboard = () => {
  const { data: models = [], isLoading } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await api.get('/models/');
      // Fix: handle both array and object with .data
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  })
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await api.get('/providers/');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  })

  // Calculate summary info
  const totalModels = models.length
  const activeModels = models.filter((m: any) => m.is_active || m.active).length
  // Map provider_id to provider name
  const providerMap = Object.fromEntries(providers.map((p: any) => [p.id, p.name]))
  const providerNames = Array.from(new Set(models.map((m: any) => providerMap[m.provider_id] || 'Unknown'))).filter((p): p is string => typeof p === 'string')
  // Removed tags logic

  return (
    <Stack spacing={3}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={2}>
        <Box sx={{ width: { xs: '100%', sm: '50%', md: '25%' }, p: 1 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5">{totalModels}</Typography>
            <Typography color="text.secondary">Total Models</Typography>
          </Paper>
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '50%', md: '25%' }, p: 1 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5">{activeModels}</Typography>
            <Typography color="text.secondary">Active Models</Typography>
          </Paper>
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '50%', md: '25%' }, p: 1 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5">{providerNames.length}</Typography>
            <Typography color="text.secondary">Providers Used</Typography>
            <Box mt={1}>
              {providerNames.map((p, idx) => (
                <Chip key={String(p) + idx} label={String(p)} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
              ))}
            </Box>
          </Paper>
        </Box>
        {/* Removed tags summary card */}
      </Grid>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography component="h2" variant="h6" color="primary" gutterBottom>
          Models Overview
        </Typography>
        {isLoading ? (
          <Box display="flex" alignItems="center" justifyContent="center" flex={1}>
            <CircularProgress />
          </Box>
        ) : (
          <Box component="table" width="100%" sx={{ borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Name</Box>
                <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Provider</Box>
                <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Status</Box>
                {/* Removed tags column header */}
                <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Description</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {models.map((model: any) => (
                <Box component="tr" key={model.id} sx={{ borderBottom: '1px solid #eee' }}>
                  <Box component="td" sx={{ p: 1 }}>{model.name}</Box>
                  <Box component="td" sx={{ p: 1 }}>{providerMap[model.provider_id] || 'Unknown'}</Box>
                  <Box component="td" sx={{ p: 1 }}>
                    <Chip label={(model.is_active || model.active) ? 'Active' : 'Inactive'} color={(model.is_active || model.active) ? 'success' : 'default'} size="small" />
                  </Box>
                  {/* Removed tags cell */}
                  <Box component="td" sx={{ p: 1 }}>{model.short_description || '-'}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </Stack>
  )
}
