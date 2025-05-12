import { useState, useEffect } from 'react'
import {
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
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
  Box,
  MenuItem,
  Slider,
  FormControl,
  InputLabel,
  Select,
  FormHelperText
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { api } from '../utils/api'

// Type definitions
interface Provider {
  id: number
  name: string
  api_key: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ModelDetails {
  id: string
  name: string
  description?: string
  contextWindow?: number
  capabilities?: string[]
}

type ProviderType = 'openai' | 'anthropic' | 'deepseek' | 'mistral' | 'gemini'

interface ModelConfiguration {
  temperature: number
  max_tokens: number
  behavior?: string
}

interface Model {
  id: number
  name: string
  provider_id: number
  model_id: string
  configuration: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ModelForm {
  name: string
  provider_id: number
  model_id: string
  configuration: ModelConfiguration
}

// Available models for each provider
const providerModels: Record<ProviderType, ModelDetails[]> = {
  openai: [
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', description: 'OpenAI’s fastest, most cost-effective GPT-4 model.', contextWindow: 128000, capabilities: ['Advanced reasoning', 'Code generation', 'Large context'] },
    { id: 'gpt-4', name: 'GPT-4', description: 'General-purpose GPT-4 model.', contextWindow: 128000, capabilities: ['General tasks', 'Reasoning', 'Content creation'] },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast, cost-effective GPT-3.5 model.', contextWindow: 16000, capabilities: ['Chat', 'Content generation', 'Basic reasoning'] }
  ],
  anthropic: [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful model for highly complex tasks.', contextWindow: 200000, capabilities: ['Highest reasoning', 'Precise execution', 'Advanced coding'] },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance and speed.', contextWindow: 200000, capabilities: ['Strong reasoning', 'Efficient tasks', 'Business analysis'] },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest Claude model.', contextWindow: 200000, capabilities: ['Rapid response', 'Simple tasks'] },
    { id: 'claude-2.1', name: 'Claude 2.1', description: 'Previous generation model.', contextWindow: 100000, capabilities: ['General purpose', 'Code generation'] }
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', description: 'General-purpose chat model.', contextWindow: 32768, capabilities: ['General conversation', 'Task assistance'] },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', description: 'Specialized for programming.', contextWindow: 32768, capabilities: ['Code generation', 'Debugging'] },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', description: 'Reasoning-focused model.', contextWindow: 32768, capabilities: ['Advanced reasoning', 'Step-by-step analysis'] }
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Mistral’s most capable model.', contextWindow: 32000, capabilities: ['Complex reasoning', 'Content generation'] },
    { id: 'mistral-medium-latest', name: 'Mistral Medium', description: 'Balanced performance.', contextWindow: 32000, capabilities: ['General tasks', 'Fast responses'] },
    { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Lightweight, fast model.', contextWindow: 32000, capabilities: ['Quick tasks', 'Low latency'] }
  ],
  gemini: [
    { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', description: 'Google’s most capable Gemini model.', contextWindow: 1048576, capabilities: ['Multimodal', 'Large context', 'Advanced reasoning'] },
    { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', description: 'General-purpose Gemini model.', contextWindow: 32768, capabilities: ['Text, image, code', 'General tasks'] },
    { id: 'gemini-1.0-pro-vision', name: 'Gemini 1.0 Pro Vision', description: 'Vision-capable Gemini model.', contextWindow: 32768, capabilities: ['Image input', 'Text+image tasks'] }
  ]
}

// Helper functions to determine provider type and available models
function getProviderType(providerId: number, providers: Provider[]): ProviderType | '' {
  const provider = providers.find(p => p.id === providerId)
  if (!provider) return ''
  const name = provider.name.toLowerCase()
  if (name.includes('claude') || name.includes('anthropic')) return 'anthropic'
  if (name.includes('deepseek')) return 'deepseek'
  if (name.includes('mistral')) return 'mistral'
  if (name.includes('openai')) return 'openai'
  if (name.includes('gemini')) return 'gemini'
  return ''
}

function getAvailableModels(providerId: number, providers: Provider[]): ModelDetails[] {
  const providerType = getProviderType(providerId, providers)
  return providerType ? providerModels[providerType] : []
}

export const Models = () => {
  const [open, setOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Get providers
  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: () => api.get('/providers/').then(res => res.data)
  })

  const { control, handleSubmit, watch, reset } = useForm<ModelForm>()
  const selectedProvider = watch('provider_id')

  // Set initial values
  useEffect(() => {
    if (providers.length > 0) {
      const currentProvider = watch('provider_id')
      if (!currentProvider) {
        reset({
          name: '',
          provider_id: providers[0].id,
          model_id: '',
          configuration: {
            temperature: 0.7,
            max_tokens: 2000,
            behavior: ''
          }
        })
      }
    }
  }, [providers, reset, watch])

  const queryClient = useQueryClient()

  // Get models
  const { data: models = [], isLoading } = useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: () => api.get('/models/').then(res => res.data)
  })

  const resetForm = () => {
    if (providers.length > 0) {
      reset({
        name: '',
        provider_id: providers[0].id,
        model_id: '',
        configuration: {
          temperature: 0.7,
          max_tokens: 2000,
          behavior: ''
        }
      })
    }
  }

  const createModel = useMutation({
    mutationFn: (data: ModelForm) => api.post('/models/', { 
      ...data, 
      configuration: JSON.stringify(data.configuration),
      is_active: true 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
      setOpen(false)
      resetForm()
      setSaving(false)
    }
  })

  const updateModel = useMutation({
    mutationFn: (data: ModelForm & { id: number }) => api.put(`/models/${data.id}`, {
      ...data,
      configuration: JSON.stringify(data.configuration),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
      setOpen(false)
      setEditingModel(null)
      resetForm()
      setSaving(false)
    }
  })

  const handleEdit = (model: Model) => {
    setEditingModel(model)
    const config = JSON.parse(model.configuration)
    reset({
      name: model.name,
      provider_id: model.provider_id,
      model_id: model.model_id,
      configuration: {
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 2000,
        behavior: config.behavior || ''
      }
    })
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this model?')) {
      await api.delete(`/models/${id}`)
      queryClient.invalidateQueries({ queryKey: ['models'] })
    }
  }

  const onSubmit = async (data: ModelForm) => {
    setSaving(true)
    try {
      if (editingModel) {
        await updateModel.mutateAsync({ ...data, id: editingModel.id })
      } else {
        await createModel.mutateAsync(data)
      }
    } catch (error) {
      console.error('Form submission failed:', error)
      setSaving(false)
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
          AI Models
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingModel(null)
            resetForm()
            setOpen(true)
          }}
        >
          Add Model
        </Button>
      </Stack>

      <Paper>
        {isLoading ? (
          <Typography variant="body1" color="text.secondary" align="center" py={4}>
            Loading...
          </Typography>
        ) : models.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" py={4}>
            No models configured yet. Click "Add Model" to get started.
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell>Configuration</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {models.map((model) => {
                  const config = JSON.parse(model.configuration)
                  const provider = providers.find(p => p.id === model.provider_id)
                  return (
                    <TableRow key={model.id}>
                      <TableCell>{model.name}</TableCell>
                      <TableCell>{provider?.name || 'Unknown'}</TableCell>
                      <TableCell>{model.model_id}</TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block">
                          Temperature: {config.temperature}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Max Tokens: {config.max_tokens}
                        </Typography>
                        {config.behavior && (
                          <Typography variant="caption" display="block">
                            Behavior: {config.behavior}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={model.is_active ? 'Active' : 'Inactive'} 
                          color={model.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEdit(model)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDelete(model.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog 
        open={open} 
        onClose={() => {
          setOpen(false)
          setEditingModel(null)
          resetForm()
        }} 
        maxWidth="md" 
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editingModel ? 'Edit AI Model' : 'Add AI Model'}</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Name is required' }}
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    label="Model Name"
                    fullWidth
                    error={!!error}
                    helperText={error?.message}
                  />
                )}
              />

              <Controller
                name="provider_id"
                control={control}
                rules={{ required: 'Provider is required' }}
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth error={!!error}>
                    <InputLabel>Provider</InputLabel>
                    <Select {...field} label="Provider">
                      {providers.map((provider) => (
                        <MenuItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {error && <FormHelperText>{error.message}</FormHelperText>}
                  </FormControl>
                )}
              />

              <Controller
                name="model_id"
                control={control}
                rules={{ required: 'Model is required' }}
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth disabled={!selectedProvider} error={!!error}>
                    <InputLabel>Model</InputLabel>
                    <Select {...field} label="Model">
                      {selectedProvider && getAvailableModels(selectedProvider, providers).map((model: ModelDetails) => (
                        <MenuItem key={model.id} value={model.id}>
                          <Box>
                            <Typography fontWeight="bold">{model.name}</Typography>
                            {model.description && <Typography variant="caption">{model.description}</Typography>}
                            {model.contextWindow && <Typography variant="caption">Context: {model.contextWindow.toLocaleString()} tokens</Typography>}
                            {model.capabilities && model.capabilities.length > 0 && (
                              <Typography variant="caption">Capabilities: {model.capabilities.join(', ')}</Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {error && <FormHelperText>{error.message}</FormHelperText>}
                  </FormControl>
                )}
              />

              <Controller
                name="configuration.temperature"
                control={control}
                render={({ field }) => (
                  <Box>
                    <Typography gutterBottom>
                      Temperature: {field.value}
                    </Typography>
                    <Slider
                      {...field}
                      min={0}
                      max={1}
                      step={0.1}
                      marks
                      valueLabelDisplay="auto"
                    />
                    <FormHelperText>
                      Controls randomness: 0 is focused, 1 is more creative
                    </FormHelperText>
                  </Box>
                )}
              />

              <Controller
                name="configuration.max_tokens"
                control={control}
                render={({ field }) => (
                  <Box>
                    <Typography gutterBottom>
                      Max Tokens: {field.value}
                    </Typography>
                    <Slider
                      {...field}
                      min={100}
                      max={4000}
                      step={100}
                      marks
                      valueLabelDisplay="auto"
                    />
                    <FormHelperText>
                      Maximum length of the response
                    </FormHelperText>
                  </Box>
                )}
              />

              <Controller
                name="configuration.behavior"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Model Behavior"
                    multiline
                    rows={4}
                    fullWidth
                    placeholder="Describe the personality and behavior of the model (e.g., 'Act as a helpful programming assistant who explains concepts clearly')"
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setOpen(false)
                setEditingModel(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={saving}
            >
              {saving 
                ? (editingModel ? 'Saving...' : 'Adding...') 
                : (editingModel ? 'Save Changes' : 'Add Model')
              }
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  )
}
