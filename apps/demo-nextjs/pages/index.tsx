import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  createTheme,
  ThemeProvider,
  CssBaseline,
  useMediaQuery,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BugReportIcon from '@mui/icons-material/BugReport';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';

// Types
interface DebugStep {
  step: number;
  action: string;
  source?: string;
  queryParams?: { source: string; filters?: Record<string, any> };
  builtFilter?: string;
  rowsReturned: number;
  sampleRows: any[];
}
interface StoryCandidate {
  storyId: string;
  score: number;
  matchedKeywords: string[];
  storyKeywords: string[];
}
interface AnswerDebug {
  rawQuery: string;
  intent: { action: string; keywords: string[]; confidence: number };
  resolvedKeywords: Array<{ keyword: string; aliases: string[]; category: string; data_source?: string }>;
  unresolvedTerms: string[];
  storyCandidates: StoryCandidate[];
  selectedStory?: { storyId: string; score: number };
  threshold: number;
  decision: string;
  steps: DebugStep[];
  totals: { results: number; durationMs: number };
}
interface LLMAnswer {
  intent: { action: string; keywords: string[]; confidence: number };
  story?: any;
  results: any[];
  summary: string;
  metadata: { source: string; execution_time_ms: number };
  debug?: AnswerDebug;
}
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer?: LLMAnswer;
  timestamp: number;
}
interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
}
interface KeywordEntry {
  keyword: string;
  aliases: string[];
  category: string;
  data_source?: string;
}
interface ConfigData {
  keywords: KeywordEntry[];
  stories: any[];
  dataSources: string[];
}

// Constants
const HISTORY_KEY = 'fake-llm.history';
const THEME_KEY = 'fake-llm.theme';
const DRAWER_WIDTH = 260;
const INSPECTOR_WIDTH = 440;
const SUGGESTED_PROMPTS = [
  'why is the sky blue?',
  'what is color of sky',
  'what is gravity?',
  'list all habits',
  'why do clouds form?',
];

// Utilities
function uid(): string { return Math.random().toString(36).slice(2); }
function truncate(s: string, n = 45): string { return s.length > n ? s.slice(0, n) + '…' : s; }
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// TabPanel
function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>{children}</Box> : null;
}

// Inspector
function Inspector({ answer, configData, open }: { answer: LLMAnswer | null; configData: ConfigData | null; open: boolean }) {
  const [tab, setTab] = useState(0);
  const [snapshotSource, setSnapshotSource] = useState('');
  const [snapshotRows, setSnapshotRows] = useState<any[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const debug = answer?.debug;

  const loadSnapshot = useCallback(async (src: string) => {
    if (!src) return;
    setSnapshotLoading(true);
    try {
      const res = await fetch(`/api/snapshot?source=${encodeURIComponent(src)}&limit=50`);
      const data = await res.json();
      setSnapshotRows(data.rows || []);
    } catch { setSnapshotRows([]); }
    finally { setSnapshotLoading(false); }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(answer, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const decisionColor = (d?: string): 'success' | 'warning' | 'error' | 'default' => {
    if (d === 'matched-story') return 'success';
    if (d === 'no-story-no-results') return 'error';
    if (d?.startsWith('no-story-fallback')) return 'warning';
    return 'default';
  };

  if (!open) return null;

  return (
    <Box sx={{ width: INSPECTOR_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: 1, borderColor: 'divider', height: '100%', overflowY: 'hidden' }}>
      <Typography variant="subtitle2" sx={{ px: 2, pt: 1.5, pb: 0.5, fontWeight: 700 }}>🔍 Inspector</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="🧠 Engine" />
        <Tab label="⚙️ Config" />
        <Tab label="🗄️ Data" />
        <Tab label="📋 JSON" />
      </Tabs>

      {/* Engine Tab */}
      <TabPanel value={tab} index={0}>
        {!debug ? (
          <Typography color="text.secondary" variant="body2">
            Click the 🔍 Inspect button on an assistant message to see engine details.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Intent</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                <Chip label={debug.intent.action} size="small" color="primary" />
                <Chip label={`${(debug.intent.confidence * 100).toFixed(0)}% confidence`} size="small" variant="outlined" />
                {debug.intent.keywords.map(kw => <Chip key={kw} label={kw} size="small" />)}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Resolved Keywords</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                {debug.resolvedKeywords.map(kw => (
                  <Tooltip key={kw.keyword} title={`source: ${kw.data_source || 'n/a'} | aliases: ${kw.aliases.join(', ')}`}>
                    <Chip label={kw.keyword} size="small" color="success" variant="outlined" />
                  </Tooltip>
                ))}
                {debug.unresolvedTerms.map(t => <Chip key={t} label={t} size="small" color="error" variant="outlined" />)}
              </Box>
              {debug.unresolvedTerms.length > 0 && (
                <Typography variant="caption" color="error.main">Unresolved: {debug.unresolvedTerms.join(', ')}</Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">Decision:</Typography>
              <Chip label={debug.decision} size="small" color={decisionColor(debug.decision)} />
              <Typography variant="caption" color="text.secondary">Threshold: {debug.threshold}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Story Candidates</Typography>
              <Table size="small" sx={{ mt: 0.5 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11 }}>Story</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>Score</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>Matched</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {debug.storyCandidates.map(c => (
                    <TableRow key={c.storyId} sx={{ bgcolor: c.storyId === debug.selectedStory?.storyId ? 'success.light' : undefined, opacity: c.score <= debug.threshold ? 0.5 : 1 }}>
                      <TableCell sx={{ fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.storyId}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{c.score.toFixed(3)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{c.matchedKeywords.join(', ') || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {debug.steps.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Execution Steps</Typography>
                {debug.steps.map(step => (
                  <Paper key={step.step} variant="outlined" sx={{ p: 1, mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Step {step.step}: {step.action}</Typography>
                    {step.source && <Typography variant="caption" sx={{ display: 'block' }}>Source: {step.source}</Typography>}
                    {step.builtFilter && (
                      <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        Filter: {step.builtFilter}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ display: 'block' }}>Rows returned: {step.rowsReturned}</Typography>
                    {step.sampleRows.length > 0 && (
                      <Box component="pre" sx={{ fontSize: 10, mt: 0.5, overflowX: 'auto', bgcolor: 'action.hover', p: 0.5, borderRadius: 1 }}>
                        {JSON.stringify(step.sampleRows[0], null, 2).slice(0, 300)}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="caption" color="text.secondary">Results: <strong>{debug.totals.results}</strong></Typography>
              <Typography variant="caption" color="text.secondary">Duration: <strong>{debug.totals.durationMs}ms</strong></Typography>
            </Box>
          </Box>
        )}
      </TabPanel>

      {/* Config Tab */}
      <TabPanel value={tab} index={1}>
        {!configData ? (
          <Typography color="text.secondary" variant="body2">Loading config…</Typography>
        ) : (
          <Box>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Keywords ({configData.keywords.length})</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11 }}>Keyword</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>Category</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {configData.keywords.map(kw => (
                      <Tooltip key={kw.keyword} title={`Aliases: ${kw.aliases.join(', ')}`}>
                        <TableRow hover>
                          <TableCell sx={{ fontSize: 11 }}>{kw.keyword}</TableCell>
                          <TableCell sx={{ fontSize: 11 }}>{kw.category}</TableCell>
                          <TableCell sx={{ fontSize: 11 }}>{kw.data_source || '—'}</TableCell>
                        </TableRow>
                      </Tooltip>
                    ))}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Stories ({configData.stories.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {configData.stories.map((story: any) => (
                  <Box key={story.story_id || story.id} sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{story.story_id || story.id}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{story.description || story.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {(story.keywords || []).map((kw: string) => <Chip key={kw} label={kw} size="small" variant="outlined" />)}
                    </Box>
                    <Box component="pre" sx={{ fontSize: 10, bgcolor: 'action.hover', p: 0.5, borderRadius: 1, mt: 0.5, overflowX: 'auto' }}>
                      {JSON.stringify(story.resolution_steps, null, 2)}
                    </Box>
                    <Divider sx={{ mt: 1 }} />
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </TabPanel>

      {/* Data Source Tab */}
      <TabPanel value={tab} index={2}>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Data Source</InputLabel>
          <Select
            value={snapshotSource}
            label="Data Source"
            onChange={e => { setSnapshotSource(e.target.value as string); loadSnapshot(e.target.value as string); }}
          >
            {(configData?.dataSources || []).map(src => <MenuItem key={src} value={src}>{src}</MenuItem>)}
          </Select>
        </FormControl>
        {snapshotLoading && <CircularProgress size={24} />}
        {!snapshotLoading && snapshotRows.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {snapshotRows.length} rows from <strong>{snapshotSource}</strong>
            </Typography>
            {snapshotRows.map((row, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1, fontFamily: 'monospace', fontSize: 11, overflowX: 'auto' }}>
                <Box component="pre" sx={{ m: 0 }}>{JSON.stringify(row, null, 2)}</Box>
              </Paper>
            ))}
          </Box>
        )}
        {!snapshotLoading && snapshotSource && snapshotRows.length === 0 && (
          <Typography color="text.secondary" variant="body2">No rows found.</Typography>
        )}
      </TabPanel>

      {/* Raw JSON Tab */}
      <TabPanel value={tab} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Tooltip title={copied ? 'Copied!' : 'Copy JSON'}>
            <IconButton size="small" onClick={handleCopy}><ContentCopyIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
        {answer ? (
          <Box component="pre" sx={{ fontSize: 11, overflowX: 'auto', bgcolor: 'action.hover', p: 1.5, borderRadius: 1, m: 0 }}>
            {JSON.stringify(answer, null, 2)}
          </Box>
        ) : (
          <Typography color="text.secondary" variant="body2">No answer selected.</Typography>
        )}
      </TabPanel>
    </Box>
  );
}

// Message Bubble
function MessageBubble({ msg, onInspect }: { msg: ChatMessage; onInspect: (answer: LLMAnswer) => void }) {
  const isUser = msg.role === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 1.5, px: 1 }}>
      <Box sx={{ maxWidth: '75%' }}>
        <Paper elevation={0} sx={{ px: 2, py: 1.5, borderRadius: 3, bgcolor: isUser ? 'primary.main' : 'action.hover', color: isUser ? 'primary.contrastText' : 'text.primary' }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</Typography>
        </Paper>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">{formatTime(msg.timestamp)}</Typography>
          {!isUser && msg.answer && (
            <Tooltip title="Inspect engine decisions">
              <IconButton size="small" onClick={() => onInspect(msg.answer!)} sx={{ p: 0.3 }}>
                <BugReportIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// Main Page
export default function Home() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectedAnswer, setInspectedAnswer] = useState<LLMAnswer | null>(null);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    setDarkMode(saved !== null ? saved === 'dark' : prefersDark);
  }, [prefersDark]);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const loaded: ChatSession[] = raw ? JSON.parse(raw) : [];
      if (loaded.length === 0) {
        const fresh = { id: uid(), messages: [], createdAt: Date.now() };
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
      } else {
        setSessions(loaded);
        setActiveSessionId(loaded[0].id);
      }
    } catch {
      const fresh = { id: uid(), messages: [], createdAt: Date.now() };
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    }
  }, []);

  const persistSessions = useCallback((updated: ChatSession[]) => {
    setSessions(updated);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* storage full */ }
  }, []);

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfigData).catch(() => { /* graceful */ });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, loading]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const newChat = () => {
    const s: ChatSession = { id: uid(), messages: [], createdAt: Date.now() };
    persistSessions([s, ...sessions]);
    setActiveSessionId(s.id);
    setInspectedAnswer(null);
  };

  const sendMessage = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: q, timestamp: Date.now() };
    const updated = sessions.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg] } : s);
    persistSessions(updated);
    try {
      const res = await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Request failed'); }
      const answer: LLMAnswer = await res.json();
      const assistantMsg: ChatMessage = { id: uid(), role: 'assistant', content: answer.summary, answer, timestamp: Date.now() };
      const updated2 = updated.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s);
      persistSessions(updated2);
    } catch (e: any) {
      setSnackbar({ open: true, msg: e.message || 'Something went wrong' });
    } finally { setLoading(false); }
  }, [loading, sessions, activeSessionId, persistSessions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const theme = createTheme({ palette: { mode: darkMode ? 'dark' : 'light' }, typography: { fontFamily: 'Roboto, sans-serif' } });
  const sessionFirstMsg = (s: ChatSession) => s.messages.find(m => m.role === 'user')?.content || 'New chat';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Left History Drawer */}
        <Drawer variant="persistent" open={historyOpen} sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' } }}>
          <Toolbar>
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>💬 Chats</Typography>
            <Tooltip title="New chat"><IconButton size="small" onClick={newChat}><AddIcon /></IconButton></Tooltip>
          </Toolbar>
          <Divider />
          <List dense sx={{ overflowY: 'auto', flex: 1 }}>
            {sessions.map(s => (
              <ListItem key={s.id} disablePadding>
                <ListItemButton selected={s.id === activeSessionId} onClick={() => setActiveSessionId(s.id)}>
                  <ListItemText
                    primary={truncate(sessionFirstMsg(s))}
                    secondary={formatTime(s.createdAt)}
                    
                    
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

        {/* Center Chat Pane */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <AppBar position="static" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Toolbar variant="dense">
              <IconButton edge="start" color="inherit" onClick={() => setHistoryOpen(v => !v)} sx={{ mr: 1 }}><MenuIcon /></IconButton>
              <Typography variant="h6" sx={{ flex: 1, fontSize: 16, fontWeight: 700 }}>🤖 fake-llm Demo</Typography>
              <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
                <IconButton color="inherit" onClick={toggleDark} size="small">{darkMode ? <LightModeIcon /> : <DarkModeIcon />}</IconButton>
              </Tooltip>
              <Tooltip title={inspectorOpen ? 'Hide inspector' : 'Show inspector'}>
                <IconButton color="inherit" onClick={() => setInspectorOpen(v => !v)} size="small" sx={{ ml: 0.5 }}><BugReportIcon /></IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>

          <Box sx={{ flex: 1, overflowY: 'auto', py: 2, display: 'flex', flexDirection: 'column' }}>
            {(!activeSession || activeSession.messages.length === 0) && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2, px: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>Ask me anything</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center' }}>
                  I&apos;ll show my full reasoning — intent, story candidates, query filters, sample data, and more.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
                  {SUGGESTED_PROMPTS.map(p => (
                    <Chip key={p} label={p} onClick={() => sendMessage(p)} clickable variant="outlined" size="small" />
                  ))}
                </Box>
              </Box>
            )}
            {activeSession?.messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} onInspect={(a) => { setInspectedAnswer(a); setInspectorOpen(true); }} />
            ))}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', px: 2, mb: 1 }}>
                <Paper elevation={0} sx={{ px: 2, py: 1.5, borderRadius: 3, bgcolor: 'action.hover', display: 'flex', gap: 1, alignItems: 'center' }}>
                  <CircularProgress size={14} />
                  <Typography variant="body2" color="text.secondary">Thinking…</Typography>
                </Paper>
              </Box>
            )}
            <div ref={bottomRef} />
          </Box>

          {activeSession && activeSession.messages.length > 0 && !loading && (
            <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {SUGGESTED_PROMPTS.map(p => <Chip key={p} label={p} onClick={() => sendMessage(p)} clickable size="small" variant="outlined" />)}
            </Box>
          )}

          <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth multiline maxRows={5}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
              size="small" variant="outlined"
            />
            <Tooltip title="Send">
              <span>
                <IconButton color="primary" onClick={() => sendMessage(input)} disabled={loading || !input.trim()} sx={{ mb: 0.5 }}>
                  <SendIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* Right Inspector */}
        {inspectorOpen && <Inspector answer={inspectedAnswer} configData={configData} open={inspectorOpen} />}
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ open: false, msg: '' })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setSnackbar({ open: false, msg: '' })}>{snackbar.msg}</Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
