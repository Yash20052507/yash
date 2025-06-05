// src/pages/chat/ChatPage.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSessionStore, selectCurrentSessionWithDetails } from '../../store/sessionStore';
import { useAuthStore } from '../../store/authStore';
import { PlusIcon, Cog6ToothIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { Message as MessageType } from '../../types'; // Renamed to avoid conflict

// Placeholder simple components for now
const SessionListItem: React.FC<{session: any, isSelected: boolean, onSelect: () => void}> = ({session, isSelected, onSelect}) => (
    <div onClick={onSelect}
         className={`p-3 rounded-lg cursor-pointer truncate ${isSelected ? 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-100 font-semibold' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200'}`}>
        {session.name}
    </div>
);

const SessionList: React.FC<{sessions: any[], currentSessionId: string | null, onSelectSession: (id: string) => void, onCreateNew: () => void}> =
    ({sessions, currentSessionId, onSelectSession, onCreateNew}) => (
    <div className="w-full md:w-80 bg-neutral-50 dark:bg-neutral-800 border-r dark:border-neutral-700 p-3 space-y-2 overflow-y-auto h-full flex flex-col">
        <button onClick={onCreateNew} className="w-full flex items-center justify-center p-2.5 mb-3 rounded-md bg-primary-500 text-white hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md">
            <PlusIcon className="h-5 w-5 mr-2"/> New Chat
        </button>
        <div className="flex-grow space-y-1.5">
            {sessions.map((s: any) => (
                <SessionListItem key={s.id} session={s} isSelected={s.id === currentSessionId} onSelect={() => onSelectSession(s.id)} />
            ))}
        </div>
        {sessions.length === 0 && <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 py-4">No sessions yet. Create one!</p>}
    </div>
);

const MessageItem: React.FC<{message: MessageType}> = ({message}) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg lg:max-w-2xl p-3 rounded-xl shadow ${isUser ? 'bg-primary-500 text-white' : 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100'}`}>
                {/* Optional: Show username for non-user roles, or for multi-user chat */}
                {/* {!isUser && <p className="text-xs font-semibold mb-1 capitalize text-neutral-500 dark:text-neutral-400">{message.role}</p>} */}
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.isStreaming && <span className="text-xs italic opacity-70"> (streaming...)</span>}
                {message.error && <p className="text-xs text-red-400 italic mt-1">Error: {message.error}</p>}
                <p className={`text-xs mt-1.5 ${isUser ? 'text-primary-200' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {new Date(message.created_at).toLocaleTimeString()}
                </p>
            </div>
        </div>
    );
};


const MessageList: React.FC<{messages: MessageType[]}> = ({messages}) => {
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 p-4">
                <ChatBubbleLeftRightIcon className="h-16 w-16 mb-4 opacity-50"/>
                <p className="text-lg">No messages in this session yet.</p>
                <p className="text-sm">Start the conversation by typing in the input below.</p>
            </div>
        );
    }
    return (
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {messages.map((m) => ( <MessageItem key={m.id || m.tempId} message={m} /> ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

const MessageInput: React.FC<{onSendMessage: (msg: string) => void, isLoading: boolean}> = ({onSendMessage, isLoading}) => {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="border-t dark:border-neutral-700 p-3 sm:p-4 flex items-center space-x-2 bg-neutral-50 dark:bg-neutral-800">
            <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="flex-1 p-2.5 border rounded-lg dark:bg-neutral-700 dark:border-neutral-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                rows={1}
                disabled={isLoading}
                style={{ maxHeight: '120px', minHeight: '48px' }} // Control growth
            />
            <button type="submit" className="p-2.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center aspect-square" disabled={isLoading || !input.trim()}>
                {isLoading ?
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    : <PaperAirplaneIcon className="h-5 w-5"/>
                }
            </button>
        </form>
    );
};


const ChatPage: React.FC = () => {
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useAuthStore();
  const {
    sessions, currentSessionId, isLoadingList: sessionListLoading, isLoadingDetails: sessionDetailsLoading, error: sessionError,
    fetchSessions, getSessionDetails, createSession, postMessage, clearCurrentSession
  } = useSessionStore();

  // Use the selector to get the current session with messages
  const currentSession = useSessionStore(selectCurrentSessionWithDetails);

  // Handle new chat intent from query param
  const handleCreateNewSession = useCallback(async () => {
    const newSessionName = `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    const newSession = await createSession({ name: newSessionName });
    if (newSession) {
      navigate(`/chat/${newSession.id}`, { replace: true });
    }
  }, [createSession, navigate]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('new') === 'true' && user) {
      handleCreateNewSession();
    }
  }, [location.search, user, handleCreateNewSession]);


  useEffect(() => {
    fetchSessions();
    return () => {
        // clearCurrentSession(); // Clear session details when leaving chat page or main component unmounts
    }
  }, [fetchSessions, clearCurrentSession]);

  useEffect(() => {
    if (routeSessionId) {
      if (routeSessionId !== currentSessionId || !currentSession || currentSession.id !== routeSessionId) {
        getSessionDetails(routeSessionId, true); // true to load messages
      }
    } else {
      // If no session ID in route, don't automatically select one. Let user pick or create.
      // clearCurrentSession(); // Ensure no stale session is shown
    }
  }, [routeSessionId, currentSessionId, currentSession, getSessionDetails, clearCurrentSession]);

  const handleSelectSession = (id: string) => {
    if (id !== currentSessionId) {
        navigate(`/chat/${id}`);
    }
  };

  const handleSendMessage = async (messageContent: string) => {
    if (currentSessionId) {
      await postMessage(currentSessionId, messageContent);
    }
  };

  const isLoading = sessionListLoading || sessionDetailsLoading;

  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Navbar height is h-16 (4rem) */}
      <div className={`transition-all duration-300 ease-in-out md:w-80 ${routeSessionId && 'hidden md:flex'} ${!routeSessionId && 'w-full md:w-80'}`}>
        <SessionList sessions={sessions} currentSessionId={currentSessionId} onSelectSession={handleSelectSession} onCreateNew={handleCreateNewSession} />
      </div>

      <div className={`flex-1 flex flex-col bg-white dark:bg-neutral-900 ${!routeSessionId && 'hidden md:flex'}`}>
        {currentSessionId && currentSession ? (
          <>
            <div className="p-3 sm:p-4 border-b dark:border-neutral-700 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800">
                <h2 className="text-lg sm:text-xl font-semibold truncate" title={currentSession.name}>{currentSession.name}</h2>
                {/* Placeholder for session settings button */}
                <button className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md">
                    <Cog6ToothIcon className="h-6 w-6"/>
                </button>
            </div>
            <MessageList messages={currentSession.messages || []} />
            <MessageInput onSendMessage={handleSendMessage} isLoading={currentSession.isLoadingMessages || sessionDetailsLoading} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 p-4 text-center">
            <ChatBubbleLeftRightIcon className="h-20 w-20 mb-4 opacity-40"/>
            <p className="text-xl">Select a chat to start messaging</p>
            <p className="text-md mt-1">or <button onClick={handleCreateNewSession} className="text-primary-600 hover:underline dark:text-primary-400">create a new one</button>.</p>
          </div>
        )}
        {sessionError && <p className="p-4 text-red-500 text-center fixed bottom-0 left-1/2 -translate-x-1/2 bg-red-100 dark:bg-red-900 rounded-t-lg shadow-xl">Error: {sessionError}</p>}
      </div>
    </div>
  );
};
export default ChatPage;
