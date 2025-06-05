// src/store/skillPackStore.ts
import { create } from 'zustand';
import {
    SkillPack, SkillPackReview, SkillPackFilters,
    SkillPackStoreState, CreateReviewPayload, ApiResponse,
    CreateSkillPackPayload, UpdateSkillPackPayload, Task
} from '../types';
import { skillPackService } from '../services/skillPackService';
// import { useAuthStore } from './authStore'; // For checking ownership or credits

const initialFilters: SkillPackFilters = {
    sortBy: 'rating',
    sortOrder: 'desc',
    category: undefined,
    searchQuery: undefined,
};

const initialPagination = { page: 1, limit: 10, totalItems: 0, totalPages: 0 };

export const useSkillPackStore = create<SkillPackStoreState>()((set, get) => ({
  marketplaceSkillPacks: [],
  userOwnedSkillPacks: [],
  currentViewingSkillPack: null,

  marketplaceFilters: initialFilters,
  marketplacePagination: initialPagination,

  isLoadingMarketplace: false,
  isLoadingUserPacks: false,
  isLoadingDetails: false,
  error: null,

  // --- Marketplace Actions ---
  fetchMarketplaceSkillPacks: async (filtersOverride?: Partial<SkillPackFilters>, page?: number) => {
    set({ isLoadingMarketplace: true, error: null });
    const currentFilters = get().marketplaceFilters;
    const currentPage = page || get().marketplacePagination.page;
    const limit = get().marketplacePagination.limit;
    const filtersToApply = { ...currentFilters, ...filtersOverride };

    try {
      const response = await skillPackService.getMarketplaceSkillPacks(filtersToApply, currentPage, limit);
      if (response.success && response.data) {
        set({
          marketplaceSkillPacks: response.data.packs,
          marketplacePagination: {
            page: currentPage,
            limit,
            totalItems: response.meta?.totalItems || response.data.packs.length, // Use meta if available
            totalPages: response.meta?.totalPages || Math.ceil((response.meta?.totalItems || response.data.packs.length) / limit),
          },
          marketplaceFilters: filtersToApply, // Persist applied filters
          isLoadingMarketplace: false,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch marketplace skill packs');
      }
    } catch (error: any) {
      set({ error: error.message, isLoadingMarketplace: false });
    }
  },

  setMarketplaceFilters: (filters: Partial<SkillPackFilters>) => {
    const newFilters = { ...get().marketplaceFilters, ...filters };
    set({ marketplaceFilters: newFilters, marketplacePagination: { ...get().marketplacePagination, page: 1 } }); // Reset to page 1 on filter change
    get().fetchMarketplaceSkillPacks(newFilters, 1); // Refetch with new filters
  },

  // --- User's Own Skill Packs Actions ---
  fetchUserSkillPacks: async () => {
    set({ isLoadingUserPacks: true, error: null });
    try {
      const response = await skillPackService.getMySkillPacks();
      if (response.success && response.data) {
        set({ userOwnedSkillPacks: response.data, isLoadingUserPacks: false });
      } else {
        throw new Error(response.error || "Failed to fetch user's skill packs");
      }
    } catch (error: any) {
      set({ error: error.message, isLoadingUserPacks: false });
    }
  },

  createSkillPack: async (payload: CreateSkillPackPayload): Promise<SkillPack | null> => {
    set({ isLoadingDetails: true, error: null }); // Use isLoadingDetails for single item actions
    try {
      const response = await skillPackService.createSkillPack(payload);
      if (response.success && response.data) {
        const newPack = response.data;
        set(state => ({
          userOwnedSkillPacks: [...state.userOwnedSkillPacks, newPack],
          isLoadingDetails: false,
        }));
        return newPack;
      } else {
        throw new Error(response.error || 'Failed to create skill pack');
      }
    } catch (error: any) {
      set({ error: error.message, isLoadingDetails: false });
      throw error; // Re-throw for component to handle
    }
  },

  updateSkillPack: async (skillPackId: string, payload: UpdateSkillPackPayload): Promise<SkillPack | null> => {
    set({ isLoadingDetails: true, error: null });
    try {
      const response = await skillPackService.updateSkillPack(skillPackId, payload);
      if (response.success && response.data) {
        const updatedPack = response.data;
        set(state => ({
          userOwnedSkillPacks: state.userOwnedSkillPacks.map(p => p.id === skillPackId ? updatedPack : p),
          currentViewingSkillPack: state.currentViewingSkillPack?.id === skillPackId ? updatedPack : state.currentViewingSkillPack,
          isLoadingDetails: false,
        }));
        return updatedPack;
      } else {
        throw new Error(response.error || 'Failed to update skill pack');
      }
    } catch (error: any) {
      set({ error: error.message, isLoadingDetails: false });
      throw error;
    }
  },

  deleteSkillPack: async (skillPackId: string): Promise<boolean> => {
    set({ isLoadingDetails: true, error: null });
    try {
      const response = await skillPackService.deleteSkillPack(skillPackId);
      if (response.success) {
        set(state => ({
          userOwnedSkillPacks: state.userOwnedSkillPacks.filter(p => p.id !== skillPackId),
          currentViewingSkillPack: state.currentViewingSkillPack?.id === skillPackId ? null : state.currentViewingSkillPack,
          isLoadingDetails: false,
        }));
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete skill pack');
      }
    } catch (error: any) {
      set({ error: error.message, isLoadingDetails: false });
      return false;
    }
  },

  triggerEmbeddingsGeneration: async (skillPackId: string): Promise<Task | null> => {
    // Set loading state on the specific skill pack or a global task loading state
    try {
        const response = await skillPackService.triggerEmbeddingsGeneration(skillPackId);
        if (response.success && response.data) {
            // Task created, taskStore will handle updates via WebSocket
            // Optionally update local skill pack state if it stores embedding status
            return response.data;
        } else {
            throw new Error(response.error || "Failed to trigger embeddings generation.");
        }
    } catch (error: any) {
        set({ error: error.message }); // Set general error for the store
        return null;
    }
  },

  // --- Common Actions for Viewing Details ---
  getSkillPackDetails: async (skillPackId: string): Promise<SkillPack | null> => {
    set({ isLoadingDetails: true, error: null, currentViewingSkillPack: null });
    try {
      // Determine if it's a user's own pack or a public one to call the correct service,
      // or have a single getSkillPackDetails in service that handles both.
      // Assuming skillPackService.getPublicSkillPackDetails also gets content/reviews.
      const response = await skillPackService.getPublicSkillPackDetails(skillPackId);
      if (response.success && response.data) {
        const packDetails = response.data;
        // Check if user owns this pack (useful for UI like 'Edit' button)
        const isOwned = get().userOwnedSkillPacks.some(p => p.id === skillPackId) ||
                        useAuthStore.getState().user?.id === packDetails.author_id;

        set({
            currentViewingSkillPack: { ...packDetails, isOwned },
            isLoadingDetails: false
        });
        return packDetails;
      } else {
        throw new Error(response.error || `Failed to get details for skill pack ${skillPackId}`);
      }
    } catch (error: any) {
      set({ error: error.message, isLoadingDetails: false });
      return null;
    }
  },

  clearCurrentViewingSkillPack: () => set({ currentViewingSkillPack: null, error: null }),

  // --- Acquisition & Reviews ---
  acquireSkillPack: async (skillPackId: string): Promise<boolean> => {
    // set({ isLoadingDetails: true }); // Or a specific acquiring flag
    try {
      const response = await skillPackService.acquireSkillPack(skillPackId);
      if (response.success) {
        // Update user's credits (authStore)
        // await useAuthStore.getState().fetchCurrentUser(); // Re-fetch user to get updated credits
        // Update the pack in userOwnedSkillPacks if not already there
        // For now, assume success means it's acquired. UI might need to re-fetch user packs.
        set(state => ({
            currentViewingSkillPack: state.currentViewingSkillPack?.id === skillPackId
                ? { ...state.currentViewingSkillPack, isOwned: true }
                : state.currentViewingSkillPack,
            // Potentially add to userOwnedSkillPacks if not too complex here
        }));
        // Re-fetch user to update credits
        useAuthStore.getState().fetchCurrentUser();
        return true;
      } else {
        throw new Error(response.error || 'Failed to acquire skill pack');
      }
    } catch (error: any) {
      set({ error: error.message /* isLoadingDetails: false */ });
      return false;
    }
  },

  fetchReviewsForSkillPack: async (skillPackId: string) => {
    // This is usually part of getSkillPackDetails or called separately if pagination is needed for reviews
    set(state => ({
        currentViewingSkillPack: state.currentViewingSkillPack?.id === skillPackId
            ? { ...state.currentViewingSkillPack, reviews: [] } // Clear old reviews while loading
            : state.currentViewingSkillPack,
        isLoadingDetails: true // Or a specific reviews loading flag
    }));
    try {
        const response = await skillPackService.getSkillPackReviews(skillPackId); // Add pagination if needed
        if (response.success && response.data?.reviews) {
             set(state => ({
                currentViewingSkillPack: state.currentViewingSkillPack?.id === skillPackId
                    ? { ...state.currentViewingSkillPack, reviews: response.data.reviews }
                    : state.currentViewingSkillPack,
                isLoadingDetails: false
            }));
        } else {
            throw new Error(response.error || "Failed to fetch reviews.");
        }
    } catch (error: any) {
        set({ error: error.message, isLoadingDetails: false });
    }
  },

  createReview: async (skillPackId: string, payload: CreateReviewPayload): Promise<SkillPackReview | null> => {
    try {
      const response = await skillPackService.createReview(skillPackId, payload);
      if (response.success && response.data) {
        const newReview = response.data;
        set(state => ({
          currentViewingSkillPack: state.currentViewingSkillPack?.id === skillPackId
            ? { ...state.currentViewingSkillPack, reviews: [newReview, ...(state.currentViewingSkillPack.reviews || [])] }
            : state.currentViewingSkillPack,
          // Optionally re-calculate average rating or re-fetch skill pack details
        }));
        // Re-fetch skill pack details to update average rating
        get().getSkillPackDetails(skillPackId);
        return newReview;
      } else {
        throw new Error(response.error || 'Failed to create review');
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error; // Re-throw for component
    }
  },

  updateReview: async (reviewId: string, payload: Partial<CreateReviewPayload>): Promise<SkillPackReview | null> => {
    const skillPackId = get().currentViewingSkillPack?.id;
    if (!skillPackId) return null; // Should not happen if UI is correct
    try {
        const response = await skillPackService.updateReview(skillPackId, reviewId, payload);
        if (response.success && response.data) {
            const updatedReview = response.data;
            set(state => ({
                currentViewingSkillPack: state.currentViewingSkillPack?.id === skillPackId
                    ? { ...state.currentViewingSkillPack, reviews: (state.currentViewingSkillPack.reviews || []).map(r => r.id === reviewId ? updatedReview : r) }
                    : state.currentViewingSkillPack,
            }));
            get().getSkillPackDetails(skillPackId); // Re-fetch to update average rating
            return updatedReview;
        } else {
            throw new Error(response.error || "Failed to update review");
        }
    } catch (error: any) {
        set({ error: error.message });
        throw error;
    }
  },

  deleteReview: async (reviewId: string): Promise<boolean> => {
    const skillPackId = get().currentViewingSkillPack?.id;
    if (!skillPackId) return false;
     try {
        const response = await skillPackService.deleteReview(skillPackId, reviewId);
        if (response.success) {
            set(state => ({
                currentViewingSkillPack: state.currentViewingSkillPack?.id === skillPackId
                    ? { ...state.currentViewingSkillPack, reviews: (state.currentViewingSkillPack.reviews || []).filter(r => r.id !== reviewId) }
                    : state.currentViewingSkillPack,
            }));
            get().getSkillPackDetails(skillPackId); // Re-fetch to update average rating
            return true;
        } else {
            throw new Error(response.error || "Failed to delete review");
        }
    } catch (error: any) {
        set({ error: error.message });
        return false;
    }
  }

}));
