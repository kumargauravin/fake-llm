import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { BrowserMockLLM } from '@nice-tools/fake-llm/browser';
import {
  AppBar,
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  CssBaseline,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
  useMediaQuery
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BugReportIcon from '@mui/icons-material/BugReport';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import SendIcon from '@mui/icons-material/Send';

type LLMAnswer = {
  intent: { action: string; keywords: string[]; confidence: number };
  story?: any;
  results: any[];
  summary: string;
  metadata: { source: string; execution_time_ms: number };
  debug?: any;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer?: LLMAnswer;
  timestamp: number;
};

type ChatSession = {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
};

type ContextMap = {
  module: {
    show_debug: boolean;
    connections: {
      mockCosmos: { basePath: string };
      mockStorage: { basePath: string };
    };
  };
  keywords: Array<{
    keyword: string;
    aliases: string[];
    category: string;
    data_source: string;
    source_kind?: string;
  }>;
  stories: Array<{
    story_id: string;
    description: string;
    keywords: string[];
    resolution_steps: Array<{ step: number; action: string; from_source?: string }>;
    contract?: {
      source_kind: string;
      sources: string[];
      patterns?: string[];
      query_examples?: string[];
      notes?: string;
    };
  }>;
  dataSources: string[];
  sourceCatalog: Array<{
    source: string;
    source_kind: string;
    file: string;
    rowCount: number;
  }>;
  storyContracts: Array<{
    story_id: string;
    description: string;
    keywords: string[];
    source_kind: string;
    sources: string[];
    patterns: string[];
    query_examples: string[];
    notes: string;
  }>;
};

const HISTORY_KEY = 'fake-llm.history';
const THEME_KEY = 'fake-llm.theme';
const DRAWER_WIDTH = 260;
const INSPECTOR_WIDTH = 460;
const SUGGESTED_PROMPTS = [
  'why is the sky blue?',
  'show release notes in blob content',
  'show error logs for checkout service',
  'find docs and traces for the latest incident',
  'what is gravity?'
];
let uidCounter = 0;

function uid(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  uidCounter += 1;
  return `uid-${Date.now().toString(36)}-${uidCounter.toString(36)}`;
}

function truncate(text: string, max = 48): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function joinBasePath(basePath: string, pathname: string): string {
  return `${basePath}${pathname}`;
}

function TabPanel({
  value,
  index,
  children
}: {
  value: number;
  index: number;
  children: React.ReactNode;
}) {
  return value === index ? <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>{children}</Box> : null;
}

function MessageBubble({
  msg,
  onInspect
}: {
  msg: ChatMessage;
  onInspect: (answer: LLMAnswer) => void;
}) {
  const isUser = msg.role === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 1.5, px: 1 }}>
      <Box sx={{ maxWidth: '78%' }}>
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: 3,
            bgcolor: isUser ? 'primary.main' : 'action.hover',
            color: isUser ? 'primary.contrastText' : 'text.primary'
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {msg.content}
          </Typography>
        </Paper>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {formatTime(msg.timestamp)}
          </Typography>
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

function Inspector({
  answer,
  contextData,
  open,
  snapshotSource,
  snapshotRows,
  snapshotLoading,
  onSnapshotSourceChange
}: {
  answer: LLMAnswer | null;
  contextData: ContextMap | null;
  open: boolean;
  snapshotSource: string;
  snapshotRows: any[];
  snapshotLoading: boolean;
  onSnapshotSourceChange: (source: string) => void;
}) {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const showDebug = contextData?.module?.show_debug ?? true;
  const debug = answer?.debug;

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
    <Box sx={{ width: INSPECTOR_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: 1, borderColor: 'divider', height: '100%', overflow: 'hidden' }}>
      <Typography variant="subtitle2" sx={{ px: 2, pt: 1.5, pb: 0.5, fontWeight: 700 }}>
        🔍 Inspector
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="💬 Chat & Debug" />
        <Tab label="🧭 Context Map" />
        <Tab label="🧩 Contracts" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        {!showDebug ? (
          <Typography color="text.secondary" variant="body2">
            Debug panel is disabled by module setting.
          </Typography>
        ) : !debug ? (
          <Typography color="text.secondary" variant="body2">
            Click the inspect button on an assistant message to see engine details.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Intent</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                <Chip label={debug.intent.action} size="small" color="primary" />
                <Chip label={`${(debug.intent.confidence * 100).toFixed(0)}% confidence`} size="small" variant="outlined" />
                {debug.intent.keywords.map((kw: string) => <Chip key={kw} label={kw} size="small" />)}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Resolved Keywords</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                {debug.resolvedKeywords?.map((kw: any) => (
                  <Tooltip key={kw.keyword} title={`source: ${kw.data_source || 'n/a'} | aliases: ${kw.aliases.join(', ')}`}>
                    <Chip label={kw.keyword} size="small" color="success" variant="outlined" />
                  </Tooltip>
                ))}
                {(debug.unresolvedTerms || []).map((term: string) => (
                  <Chip key={term} label={term} size="small" color="error" variant="outlined" />
                ))}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">Decision:</Typography>
              <Chip label={debug.decision} size="small" color={decisionColor(debug.decision)} />
              <Typography variant="caption" color="text.secondary">Threshold: {debug.threshold}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Story Candidates</Typography>
              <Paper variant="outlined" sx={{ mt: 0.5, overflow: 'hidden' }}>
                <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
                  {(debug.storyCandidates || []).map((candidate: any) => (
                    <Box key={candidate.storyId} sx={{ px: 1.25, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: candidate.storyId === debug.selectedStory?.storyId ? 'success.light' : 'transparent' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{candidate.storyId}</Typography>
                      <Typography variant="caption" color="text.secondary">Score {candidate.score.toFixed(3)} · Matched: {candidate.matchedKeywords.join(', ') || '—'}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Execution Steps</Typography>
              {(debug.steps || []).map((step: any) => (
                <Paper key={step.step} variant="outlined" sx={{ p: 1, mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>Step {step.step}: {step.action}</Typography>
                  {step.source && <Typography variant="caption" sx={{ display: 'block' }}>Source: {step.source}</Typography>}
                  {step.builtFilter && (
                    <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      Filter: {step.builtFilter}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ display: 'block' }}>Rows returned: {step.rowsReturned}</Typography>
                  {step.sampleRows?.length > 0 && (
                    <Box component="pre" sx={{ fontSize: 10, mt: 0.5, overflowX: 'auto', bgcolor: 'action.hover', p: 0.75, borderRadius: 1 }}>
                      {JSON.stringify(step.sampleRows[0], null, 2).slice(0, 260)}
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography variant="caption" color="text.secondary">Results: <strong>{debug.totals.results}</strong></Typography>
              <Typography variant="caption" color="text.secondary">Duration: <strong>{debug.totals.durationMs}ms</strong></Typography>
            </Box>
            <Divider />
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">Raw answer JSON</Typography>
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
            </Box>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tab} index={1}>
        {!contextData ? (
          <Typography color="text.secondary" variant="body2">Loading static context…</Typography>
        ) : (
          <Box>
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Module Settings</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip size="small" color={contextData.module.show_debug ? 'success' : 'default'} label={`show_debug: ${String(contextData.module.show_debug)}`} />
                <Chip size="small" variant="outlined" label={`mockCosmos: ${contextData.module.connections.mockCosmos.basePath}`} />
                <Chip size="small" variant="outlined" label={`mockStorage: ${contextData.module.connections.mockStorage.basePath}`} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Static assets are the source of truth for the demo context.
              </Typography>
            </Paper>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Sources ({contextData.sourceCatalog.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {contextData.sourceCatalog.map(source => (
                    <Paper key={source.source} variant="outlined" sx={{ p: 1.25 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{source.source}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                        <Chip size="small" label={source.source_kind} />
                        <Chip size="small" variant="outlined" label={`${source.rowCount} rows`} />
                        <Chip size="small" variant="outlined" label={source.file} />
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Keywords ({contextData.keywords.length})</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1 }}>
                <Paper variant="outlined" sx={{ maxHeight: 240, overflowY: 'auto' }}>
                  {contextData.keywords.map(keyword => (
                    <Box key={`${keyword.keyword}-${keyword.data_source}`} sx={{ px: 1.25, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{keyword.keyword}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {keyword.category} · {keyword.data_source} · {keyword.source_kind || 'cosmos'}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Stories ({contextData.stories.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {contextData.stories.map(story => (
                  <Box key={story.story_id} sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{story.story_id}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{story.description}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {story.keywords.map(kw => <Chip key={kw} label={kw} size="small" variant="outlined" />)}
                    </Box>
                    <Box component="pre" sx={{ fontSize: 10, bgcolor: 'action.hover', p: 0.75, borderRadius: 1, mt: 0.5, overflowX: 'auto' }}>
                      {JSON.stringify(story.resolution_steps, null, 2)}
                    </Box>
                    <Divider sx={{ mt: 1 }} />
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>

            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Static Source Snapshot</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Data Source</InputLabel>
              <Select
                value={snapshotSource}
                label="Data Source"
                onChange={e => onSnapshotSourceChange(e.target.value as string)}
              >
                {contextData.dataSources.map(src => <MenuItem key={src} value={src}>{src}</MenuItem>)}
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
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tab} index={2}>
        {!contextData ? (
          <Typography color="text.secondary" variant="body2">Loading contracts…</Typography>
        ) : (
          <Box>
            {contextData.storyContracts.map(contract => (
              <Paper key={contract.story_id} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{contract.story_id}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{contract.description}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
                  <Chip size="small" label={contract.source_kind} />
                  {contract.sources.map(source => <Chip key={source} size="small" variant="outlined" label={source} />)}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {contract.notes}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                  {contract.query_examples.map(example => <Chip key={example} size="small" variant="outlined" label={example} />)}
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </TabPanel>
    </Box>
  );
}

export default function Home() {
  const router = useRouter();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectedAnswer, setInspectedAnswer] = useState<LLMAnswer | null>(null);
  const [contextData, setContextData] = useState<ContextMap | null>(null);
  const [snapshotSource, setSnapshotSource] = useState('');
  const [snapshotRows, setSnapshotRows] = useState<any[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [llmReady, setLlmReady] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });
  const bottomRef = useRef<HTMLDivElement>(null);
  const llmRef = useRef<BrowserMockLLM | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    setDarkMode(saved !== null ? saved === 'dark' : prefersDark);
  }, [prefersDark]);

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

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
    } catch {
      /* ignore storage issues */
    }
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;

    async function boot() {
      setLlmReady(false);
      try {
        const basePath = router.basePath || '';
        const contextUrl = joinBasePath(basePath, '/data/context-map.json');
        const llm = new BrowserMockLLM({
          keywordsUrl: joinBasePath(basePath, '/data/keywords.json'),
          storiesUrl: joinBasePath(basePath, '/data/stories.json'),
          dataBaseUrl: joinBasePath(basePath, '/data')
        });

        const [contextResponse] = await Promise.all([
          fetch(contextUrl),
          llm.initialize()
        ]);

        if (!contextResponse.ok) {
          throw new Error(`Failed to load context map from ${contextUrl}`);
        }

        const contextJson = (await contextResponse.json()) as ContextMap;
        if (cancelled) return;

        llmRef.current = llm;
        setContextData(contextJson);
        setLlmReady(true);
        const initialSource = contextJson.dataSources[0] || '';
        setSnapshotSource(initialSource);
        if (initialSource) {
          const rows = await llm.getDataSourceSnapshot(initialSource, 5);
          if (!cancelled) setSnapshotRows(rows);
        }
      } catch (error: any) {
        if (cancelled) return;
        setSnackbar({ open: true, msg: error.message || 'Failed to initialize demo context.' });
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.basePath]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, loading]);

  const persistSessions = useCallback((updated: ChatSession[]) => {
    setSessions(updated);
  }, []);

  const activeSession = sessions.find(session => session.id === activeSessionId);

  const toggleDark = () => setDarkMode(v => !v);

  const newChat = () => {
    const next = { id: uid(), messages: [], createdAt: Date.now() };
    persistSessions([next, ...sessions]);
    setActiveSessionId(next.id);
    setInspectedAnswer(null);
  };

  const loadSnapshot = useCallback(async (source: string) => {
    if (!source || !llmRef.current) {
      setSnapshotRows([]);
      return;
    }
    setSnapshotLoading(true);
    try {
      const rows = await llmRef.current.getDataSourceSnapshot(source, 50);
      setSnapshotRows(rows);
      setSnapshotSource(source);
    } catch {
      setSnapshotRows([]);
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading || !llmRef.current) return;

    setInput('');
    setLoading(true);
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: q, timestamp: Date.now() };
    const updated = sessions.map(session => (
      session.id === activeSessionId ? { ...session, messages: [...session.messages, userMsg] } : session
    ));
    persistSessions(updated);

    try {
      const answer: LLMAnswer = await llmRef.current.query(q, { debug: true });
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: answer.summary,
        answer,
        timestamp: Date.now()
      };
      const next = updated.map(session => (
        session.id === activeSessionId ? { ...session, messages: [...session.messages, assistantMsg] } : session
      ));
      persistSessions(next);
    } catch (error: any) {
      setSnackbar({ open: true, msg: error.message || 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, loading, persistSessions, sessions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const theme = useMemo(() => createTheme({
    palette: { mode: darkMode ? 'dark' : 'light' },
    typography: { fontFamily: 'Roboto, sans-serif' }
  }), [darkMode]);

  const sessionFirstMsg = (session: ChatSession) => session.messages.find(m => m.role === 'user')?.content || 'New chat';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Drawer
          variant="persistent"
          open={historyOpen}
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column'
            }
          }}
        >
          <Toolbar>
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>💬 Chats</Typography>
            <Tooltip title="New chat">
              <IconButton size="small" onClick={newChat}><AddIcon /></IconButton>
            </Tooltip>
          </Toolbar>
          <Divider />
          <List dense sx={{ overflowY: 'auto', flex: 1 }}>
            {sessions.map(session => (
              <ListItem key={session.id} disablePadding>
                <ListItemButton selected={session.id === activeSessionId} onClick={() => setActiveSessionId(session.id)}>
                  <ListItemText
                    primary={truncate(sessionFirstMsg(session))}
                    secondary={formatTime(session.createdAt)}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <AppBar position="static" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Toolbar variant="dense">
              <IconButton edge="start" color="inherit" onClick={() => setHistoryOpen(v => !v)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" sx={{ flex: 1, fontSize: 16, fontWeight: 700 }}>
                🤖 fake-llm Demo
              </Typography>
              <Chip
                size="small"
                color={llmReady ? 'success' : 'default'}
                label={llmReady ? `context: ${contextData?.dataSources.length || 0} sources` : 'loading context…'}
                sx={{ mr: 1 }}
              />
              <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
                <IconButton color="inherit" onClick={toggleDark} size="small">
                  {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title={inspectorOpen ? 'Hide inspector' : 'Show inspector'}>
                <IconButton color="inherit" onClick={() => setInspectorOpen(v => !v)} size="small" sx={{ ml: 0.5 }}>
                  <BugReportIcon />
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>

          <Box sx={{ flex: 1, overflowY: 'auto', py: 2, display: 'flex', flexDirection: 'column' }}>
            {(!activeSession || activeSession.messages.length === 0) && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2, px: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center' }}>
                  Ask the static demo anything
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center', maxWidth: 520 }}>
                  The demo now loads context and query data from static JSON assets, while the browser query engine still runs the story contracts locally.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
                  {SUGGESTED_PROMPTS.map(prompt => (
                    <Chip key={prompt} label={prompt} onClick={() => sendMessage(prompt)} clickable variant="outlined" size="small" />
                  ))}
                </Box>
              </Box>
            )}

            {activeSession?.messages.map(message => (
              <MessageBubble
                key={message.id}
                msg={message}
                onInspect={answer => {
                  setInspectedAnswer(answer);
                  setInspectorOpen(true);
                }}
              />
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
              {SUGGESTED_PROMPTS.map(prompt => (
                <Chip key={prompt} label={prompt} onClick={() => sendMessage(prompt)} clickable size="small" variant="outlined" />
              ))}
            </Box>
          )}

          <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={5}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
              size="small"
              variant="outlined"
              disabled={!llmReady}
            />
            <Tooltip title="Send">
              <span>
                <IconButton color="primary" onClick={() => sendMessage(input)} disabled={loading || !input.trim() || !llmReady} sx={{ mb: 0.5 }}>
                  <SendIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {inspectorOpen && (
          <Inspector
            answer={inspectedAnswer}
            contextData={contextData}
            open={inspectorOpen}
            snapshotSource={snapshotSource}
            snapshotRows={snapshotRows}
            snapshotLoading={snapshotLoading}
            onSnapshotSourceChange={loadSnapshot}
          />
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ open: false, msg: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackbar({ open: false, msg: '' })}>{snackbar.msg}</Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
