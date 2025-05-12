import { useState } from 'react'
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
  MenuItem
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'
import { useForm } from 'react-hook-form'

type Provider = {
  id: number
  name: string
  api_key: string
  is_active: boolean
  created_at: string
  updated_at: string
}

type ProviderForm = {
  name: string
  api_key: string
}

const PROVIDER_PRESETS = [
  { name: 'OpenAI', doc: 'https://platform.openai.com/docs/overview' },
  { name: 'Anthropic', doc: 'https://docs.anthropic.com/en/api/getting-started' },
  { name: 'DeepSeek', doc: 'https://api-docs.deepseek.com' },
  { name: 'Gemini', doc: 'https://ai.google.dev/gemini-api/docs' },
  { name: 'Mistral', doc: 'https://docs.mistral.ai/api/' },
]

export const AIProviders = () => {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, reset } = useForm<ProviderForm>()
  const queryClient = useQueryClient()

  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: () => api.get('/providers/').then(res => res.data)
  })

  const createProvider = useMutation({
    mutationFn: (data: ProviderForm) => api.post('/providers/', { ...data, is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['providers'])
      setOpen(false)
      reset()
    }
  })

  const onSubmit = (data: ProviderForm) => {
    createProvider.mutate(data)
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography variant="h4" gutterBottom>
          AI Providers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Add Provider
        </Button>
      </Stack>

      <Paper>
        {isLoading ? (
          <Typography variant="body1" color="text.secondary" align="center" py={4}>
            Loading...
          </Typography>
        ) : providers.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" py={4}>
            No providers configured yet. Click "Add Provider" to get started.
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>{provider.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={provider.is_active ? 'Active' : 'Inactive'} 
                        color={provider.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(provider.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Add AI Provider</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Provider Name"
                fullWidth
                {...register('name', { required: true })}
                select
              >
                {PROVIDER_PRESETS.map((preset) => (
                  <MenuItem key={preset.name} value={preset.name}>
                    {preset.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="API Key"
                fullWidth
                type="password"
                {...register('api_key', { required: true })}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Supported: OpenAI, Anthropic, DeepSeek, Gemini, Mistral
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Add Provider
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  )
}
