import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
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
  MenuItem,
  InputAdornment
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Visibility, VisibilityOff } from '@mui/icons-material'
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
  const [editOpen, setEditOpen] = useState(false)
  const [editProvider, setEditProvider] = useState<Provider | null>(null)
  const { register, handleSubmit, reset } = useForm<ProviderForm>()
  const [editForm, setEditForm] = useState<ProviderForm>({ name: '', api_key: '' })
  const [showEditApiKey, setShowEditApiKey] = useState(false)
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

  const updateProvider = useMutation({
    mutationFn: (data: { id: number; name: string; api_key: string }) =>
      api.put(`/providers/${data.id}`, { name: data.name, api_key: data.api_key }),
    onSuccess: () => {
      queryClient.invalidateQueries(['providers'])
      setEditOpen(false)
      setEditProvider(null)
    }
  })

  const deleteProvider = useMutation({
    mutationFn: (id: number) => api.delete(`/providers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['providers'])
    }
  })

  const onSubmit = (data: ProviderForm) => {
    createProvider.mutate(data)
  }

  const handleEdit = (provider: Provider) => {
    setEditProvider(provider)
    setEditForm({ name: provider.name, api_key: provider.api_key })
    setEditOpen(true)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editProvider) {
      updateProvider.mutate({ id: editProvider.id, ...editForm })
    }
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this provider?')) {
      deleteProvider.mutate(id)
    }
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
                  <TableCell>Manage</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(provider)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(provider.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={provider.is_active ? 'Active' : 'Inactive'} 
                        color={provider.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{provider.name}</TableCell>
                    <TableCell>
                      {new Date(provider.created_at).toLocaleDateString()}
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 16 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add Provider</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleEditSubmit}>
          <DialogTitle>Edit AI Provider</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Provider Name"
                name="name"
                fullWidth
                value={editForm.name}
                onChange={handleEditChange}
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
                name="api_key"
                fullWidth
                type={showEditApiKey ? 'text' : 'password'}
                value={editForm.api_key}
                onChange={handleEditChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showEditApiKey ? 'Hide API key' : 'Show API key'}
                        onClick={() => setShowEditApiKey((show) => !show)}
                        edge="end"
                        tabIndex={-1}
                      >
                        {showEditApiKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Stack>
          </DialogContent>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 16 }}>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </div>
        </form>
      </Dialog>
    </Stack>
  )
}
