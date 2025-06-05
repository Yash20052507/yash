// src/types/index.ts

// --- User & Auth ---
export interface User {
  id: string;
  username: string;
  email: string;
  credits: number;
  is_admin: boolean;
  created_at: string; // Dates will be strings from JSON
  updated_at: string;
}

export interface LoginPayload {
  email: string; // Or username, backend might accept either
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (token: string) => Promise<void>; // Accepts token, assumes API call is separate
  handleLogin: (payload: LoginPayload) => Promise<boolean>; // Actual API call
  register: (userData: RegisterPayload) => Promise<boolean>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  // addCredit: (amount: number) => void; // Example action
}

// --- API Responses ---
export interface ApiErrorDetail {
  msg: string;
  param?: string;
  location?: string; // express-validator typically includes location
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string; // For success or general messages
    error?: string; // For single error messages
    errors?: ApiErrorDetail[]; // For validation errors
    meta?: {
        page?: number;
        limit?: number;
        totalItems?: number; // Changed from 'total'
        totalPages?: number;
    };
}

// --- Session & Chat ---
export interface Message {
  id: string;
  session_id: string;
  user_id?: string;
  content: string;
  role: 'user' | 'ai' | 'system';
  token_count?: number;
  model_used?: string;
  created_at: string;
  // Frontend specific
  isStreaming?: boolean;
  error?: string;
  // For optimistic updates, a temporary client-side ID might be useful
  tempId?: string;
}

export interface Session {
  id:string;
  user_id: string;
  name: string;
  context_summary?: string;
  created_at: string;
  updated_at: string;
  // Frontend specific
  messages: Message[]; // Keep messages within session object for simplicity
  activeSkillPackIds?: string[];
  isLoadingMessages?: boolean;
  hasMoreMessages?: boolean;
}

export interface CreateSessionPayload {
    name: string;
    context_summary?: string;
}

export interface PostMessagePayload {
    content: string;
    // skill_pack_ids are handled by the store/service based on current session state
}

export interface SessionState {
    sessions: Session[]; // List of user's sessions (metadata only)
    currentSessionId: string | null;
    // currentSession: Session | null; // Detailed session with messages, managed by getSessionDetails
    isLoadingList: boolean;
    isLoadingDetails: boolean; // For loading a single session's details/messages
    error: string | null;

    fetchSessions: () => Promise<void>;
    createSession: (payload: CreateSessionPayload) => Promise<Session | null>;
    getSessionDetails: (sessionId: string, loadMessages?: boolean) => Promise<Session | null>; // Returns the session
    clearCurrentSession: () => void;

    postMessage: (sessionId: string, content: string) => Promise<void>; // Handles user and AI message flow
    addMessage: (sessionId: string, message: Message) => void; // For adding messages from WebSocket or optimistic
    updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void; // For streaming or error

    // Skill pack management within a session
    addSkillPackToSession: (sessionId: string, skillPackId: string) => Promise<void>;
    removeSkillPackFromSession: (sessionId: string, skillPackId: string) => Promise<void>;
    // currentSessionSkillPacks: SkillPack[]; // Can be derived or stored
}


// --- Skill Packs ---
export interface SkillPack {
  id: string;
  name: string;
  description?: string;
  category?: string;
  author_id: string;
  author_username?: string;
  version: string;
  download_count: number;
  rating: number; // Average rating
  price_credits: number;
  is_public: boolean;
  content_hash?: string;
  created_at: string;
  updated_at: string;
  // Frontend specific
  isOwned?: boolean;
  content?: SkillPackContentData; // Loaded on demand
  reviews?: SkillPackReview[]; // Loaded on demand or with details
}

export interface SkillPackContentData {
    instructions: string;
    examples: Array<{ input: string; output: string }>;
    templates?: Array<{ name:string; code: string }>;
    knowledge_base_summary?: string;
    prompt_templates?: Array<{ name: string; template: string }>;
}

export interface CreateSkillPackPayload {
    name: string;
    description?: string;
    category?: string;
    version?: string;
    price_credits?: number;
    is_public?: boolean;
    content: SkillPackContentData; // Content is required on creation via this payload
}
export type UpdateSkillPackPayload = Partial<Omit<CreateSkillPackPayload, 'content'>> & { content?: SkillPackContentData };


export interface SkillPackReview {
    id: string;
    skill_pack_id: string;
    user_id: string;
    user_username?: string; // For display (join in backend or fetch user details)
    rating: number;
    comment?: string;
    created_at: string;
}

export interface CreateReviewPayload {
    rating: number;
    comment?: string;
}

export interface SkillPackFilters {
    category?: string;
    sortBy?: 'rating' | 'download_count' | 'created_at' | 'price_credits';
    sortOrder?: 'asc' | 'desc';
    searchQuery?: string;
}

// Represents the state for skill packs (both marketplace and user's own)
export interface SkillPackStoreState {
    marketplaceSkillPacks: SkillPack[];
    userOwnedSkillPacks: SkillPack[];
    currentViewingSkillPack: SkillPack | null; // Skill pack being viewed in detail

    marketplaceFilters: SkillPackFilters;
    marketplacePagination: { page: number; limit: number; totalItems: number; totalPages: number };

    isLoadingMarketplace: boolean;
    isLoadingUserPacks: boolean;
    isLoadingDetails: boolean; // For currentViewingSkillPack
    error: string | null;

    // Marketplace
    fetchMarketplaceSkillPacks: (filtersOverride?: Partial<SkillPackFilters>, page?: number) => Promise<void>;
    setMarketplaceFilters: (filters: Partial<SkillPackFilters>) => void;

    // User's own skill packs (management)
    fetchUserSkillPacks: () => Promise<void>;
    createSkillPack: (payload: CreateSkillPackPayload) => Promise<SkillPack | null>;
    updateSkillPack: (skillPackId: string, payload: UpdateSkillPackPayload) => Promise<SkillPack | null>;
    deleteSkillPack: (skillPackId: string) => Promise<boolean>;
    triggerEmbeddingsGeneration: (skillPackId: string) => Promise<Task | null>; // Returns the created task

    // Common actions
    getSkillPackDetails: (skillPackId: string) => Promise<SkillPack | null>; // Fetches details for viewing
    clearCurrentViewingSkillPack: () => void;

    // Acquisition & Reviews (related to a skill pack being viewed)
    acquireSkillPack: (skillPackId: string) => Promise<boolean>; // Returns success status
    createReview: (skillPackId: string, payload: CreateReviewPayload) => Promise<SkillPackReview | null>;
    updateReview: (reviewId: string, payload: Partial<CreateReviewPayload>) => Promise<SkillPackReview | null>;
    deleteReview: (reviewId: string) => Promise<boolean>;
    fetchReviewsForSkillPack: (skillPackId: string) => Promise<void>; // Adds to currentViewingSkillPack.reviews
}

// --- Tasks ---
export interface Task {
    id: string;
    user_id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'queued';
    progress: number;
    metadata?: any;
    result?: any;
    error_message?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface TaskState {
    tasks: Task[]; // List of user's tasks
    subscribedTaskIds: Set<string>; // Tasks user is actively watching via WebSocket
    isLoading: boolean;
    error: string | null;

    fetchTasks: () => Promise<void>;
    getTaskDetails: (taskId: string) => Promise<Task | null>; // Fetches and updates or adds to tasks list
    updateTaskInList: (task: Task) => void; // For WebSocket updates
    subscribeToTask: (taskId: string) => void; // For WebSocket
    unsubscribeFromTask: (taskId: string) => void;
}

// --- API Keys ---
export interface ApiKey {
    id: string;
    name: string;
    user_id: string;
    // key_hash is not sent to client
    last_used_at?: string;
    expires_at?: string;
    created_at: string;
}
export interface ApiKeyDetails extends ApiKey {
    apiKey?: string; // The raw key, only available on creation
}

// --- Transactions ---
export interface Transaction {
    id: string;
    user_id: string;
    type: 'purchase_credits' | 'skill_pack_purchase' | 'usage_fee' | 'refund' | 'bonus';
    amount_credits: number;
    reference_id?: string;
    description?: string;
    created_at: string;
}

// Custom Error class for API errors
export class ApiError extends Error {
  constructor(message: string, public data?: any, public status?: number) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
