import './App.css'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Socket } from 'socket.io-client'
import { login, resendVerification, signup, verifyEmail } from './api/auth'
import { createSocket } from './realtime/socket'
import type { AuthResponse, ChatMode, Message } from './types/chat'

const directUrl = import.meta.env.VITE_DIRECT_SOCKET_URL || 'http://localhost:3001'
const defaultUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthResponse) => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true)
    try {
      if (mode === 'login') onAuthenticated(await login(email, password))
      else if (mode === 'signup') { const result = await signup(name, email, password); setNotice(result.message); setMode('verify') }
      else { const result = await verifyEmail(email, otp); setNotice(result.message); setMode('login') }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to complete request'
      setError(message); if (message.toLowerCase().includes('verify')) setMode('verify')
    } finally { setBusy(false) }
  }

  async function resend() {
    setError('')
    try { setNotice((await resendVerification(email)).message) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to resend code') }
  }

  return <main className="auth-page"><section className="auth-card"><div className="brand-mark">S</div><p className="eyebrow">PRIVATE MESSAGING</p><h1>Stay close,<br /><span>without the noise.</span></h1><p className="auth-copy">A quiet place for the conversations that matter.</p><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button></div><form onSubmit={submit}>{mode === 'signup' && <label>Display name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></label>}<label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>{mode !== 'verify' && <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} required /></label>}{mode === 'verify' && <label>Verification code<input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Six digit code" maxLength={6} required /></label>}{error && <p className="form-error">{error}</p>}{notice && <p className="form-notice">{notice}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Enter your space' : mode === 'signup' ? 'Create account' : 'Verify email'}</button></form>{mode === 'verify' && <button className="text-button" onClick={resend}>Resend verification code</button>}<p className="auth-footnote">Realtime workspace<br />Built around your own server.</p></section></main>
}

function App() {
  const [session, setSession] = useState<AuthResponse | null>(() => { try { return JSON.parse(localStorage.getItem('sermocinari.session') || 'null') } catch { return null } })
  const [mode, setMode] = useState<ChatMode>('direct')
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [peerId, setPeerId] = useState('')
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState('')
  const [directSocket, setDirectSocket] = useState<Socket | null>(null)
  const [defaultSocket, setDefaultSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!session) return
    localStorage.setItem('sermocinari.session', JSON.stringify(session))
    const direct = createSocket(directUrl, session.token); const fallback = createSocket(defaultUrl, session.token)
    setDirectSocket(direct); setDefaultSocket(fallback)
    const onError = (payload: { message?: string } | Error) => setError(payload instanceof Error ? payload.message : payload.message || 'Realtime connection error')
    const addMessage = (message: Message) => setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message])
    const markDelivered = (payload: { messageId: string; deliveredAt?: string }) => setMessages((current) => current.map((message) => message.id === payload.messageId ? { ...message, isDelivered: true, deliveredAt: payload.deliveredAt } : message))
    direct.on('connect_error', onError); fallback.on('connect_error', onError); direct.on('chat:message.sent', addMessage); direct.on('chat:message.new', addMessage); direct.on('new-direct-message', addMessage); fallback.on('chat:message.new', addMessage); fallback.on('chat:message.delivered', markDelivered); direct.on('chat:message.delivered', markDelivered); direct.on('chat:typing.start', () => setTyping(true)); direct.on('chat:typing.stop', () => setTyping(false)); fallback.on('chat:group.created', (payload: { groupId?: string }) => payload.groupId && setGroupId(payload.groupId))
    return () => { direct.disconnect(); fallback.disconnect() }
  }, [session])

  const activeId = mode === 'direct' ? conversationId : groupId
  const activeMessages = useMemo(() => messages.filter((message) => mode === 'direct' ? message.conversationId === conversationId : message.groupId === groupId || (!message.groupId && message.conversationId === groupId)), [messages, mode, conversationId, groupId])

  function logout() { localStorage.removeItem('sermocinari.session'); setSession(null); directSocket?.disconnect(); defaultSocket?.disconnect() }
  function startDirect() { if (!peerId.trim() || !directSocket) return; setError(''); directSocket.emit('chat:conversation.start', { toUserId: peerId.trim() }, (result: { conversationId?: string }) => result?.conversationId ? setConversationId(result.conversationId) : setError('The server did not return a conversation id')) }
  function sendMessage(event: FormEvent) { event.preventDefault(); if (!draft.trim() || !activeId) return; if (mode === 'direct') directSocket?.emit('chat:message.send', { conversationId: activeId, content: draft.trim() }); else defaultSocket?.emit('chat:message.send', { groupId: activeId, message: draft.trim() }); setDraft('') }
  function createGroup() { const name = window.prompt('Name for the new group'); if (name?.trim()) defaultSocket?.emit('chat:group.create', { name: name.trim(), description: '' }) }

  if (!session) return <AuthScreen onAuthenticated={setSession} />

  return <main className="app-shell"><aside className="sidebar"><header className="sidebar-header"><div className="profile-chip"><div className="avatar">{session.user.name.charAt(0).toUpperCase()}</div><div><strong>{session.user.name}</strong><span>Available</span></div></div><button className="icon-button" onClick={logout} title="Sign out">Exit</button></header><div className="sidebar-tools"><div className="search-box"><span>Search</span><input placeholder="People, groups, messages" /></div></div><div className="mode-switch"><button className={mode === 'direct' ? 'active' : ''} onClick={() => setMode('direct')}>Direct</button><button className={mode === 'group' ? 'active' : ''} onClick={() => setMode('group')}>Groups</button></div><div className="conversation-empty"><div className="empty-symbol">+</div><h2>No {mode === 'direct' ? 'conversations' : 'groups'} yet</h2><p>The server does not expose a list or history endpoint, so new sessions begin here.</p>{mode === 'direct' ? <><input value={peerId} onChange={(event) => setPeerId(event.target.value)} placeholder="Contact user ID" /><button className="outline-button" onClick={startDirect}>Start a conversation</button></> : <><button className="outline-button" onClick={createGroup}>Create a group</button><input value={groupId} onChange={(event) => setGroupId(event.target.value)} placeholder="Existing group ID" /></>}</div><footer className="sidebar-footer"><span className="connection-dot" /> Live connections enabled</footer></aside><section className="chat-panel">{!activeId ? <div className="welcome-panel"><div className="welcome-art">S</div><p className="eyebrow">YOUR PRIVATE SPACE</p><h1>Nothing here<br /><span>yet.</span></h1><p>Start a direct conversation or open a group from the left. Your live messages will appear here.</p></div> : <><header className="chat-header"><div className="avatar muted-avatar">{mode === 'direct' ? 'D' : 'G'}</div><div><strong>{mode === 'direct' ? 'Direct conversation' : 'Group conversation'}</strong><span>{typing ? 'typing...' : `ID: ${activeId}`}</span></div><div className="header-actions"><button className="icon-button" title="Voice call" disabled>Call</button><button className="icon-button" title="More options">More</button></div></header><div className="message-list">{activeMessages.length === 0 ? <div className="message-empty">No messages in this live session yet.</div> : activeMessages.map((message) => <article className={`message ${message.senderId === session.user.id ? 'outgoing' : ''}`} key={message.id}><p>{message.content || '[Attachment unavailable]'}</p><small>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'} {message.senderId === session.user.id && (message.isRead ? ' read' : message.isDelivered ? ' delivered' : ' sent')}</small></article>)}</div><form className="composer" onSubmit={sendMessage}><button type="button" className="icon-button" disabled title="Attachments are not available">+</button><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message" /><button className="send-button" disabled={!draft.trim()}>Send</button></form></>}</section>{error && <button className="error-banner" onClick={() => setError('')}>{error}<span>Dismiss</span></button>}</main>
}

export default App
