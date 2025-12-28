import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { generateAiPost } from '@/lib/ai-generator';

export interface PostData {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    isVerified?: boolean;
  };
  content: string;
  type: 'text' | 'video-short' | 'video-long';
  mediaUrl?: string;
  thumbnailUrl?: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
    tips: number;
  };
  isPremium?: boolean;
  unlockPrice?: string;
  timestamp: string;
}

interface UserProfile {
  username: string;
  bio: string;
  avatarUrl: string;
  followers: number;
  following: number;
}

interface FinanceState {
  walletAddress: string;
  bankingInfo: string; // Encrypted placeholder
  totalEarnings: number;
  earningsBreakdown: {
    ads: number;
    walking: number;
    gaming: number;
    tips: number;
    subscriptions: number;
  };
  dailySteps: number;
}

export interface TradingCard {
  id: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  imageUrl: string;
  value: number;
  foundAt: string;
}

interface AppState {
  user: UserProfile;
  finance: FinanceState;
  posts: PostData[];
  inventory: TradingCard[];
  algorithmKey: number; // To simulate rebuilding
  updateUser: (user: Partial<UserProfile>) => void;
  updateFinance: (finance: Partial<FinanceState>) => void;
  addEarnings: (amount: number, source: keyof FinanceState['earningsBreakdown']) => void;
  deductEarnings: (amount: number) => boolean;
  updateSteps: (steps: number) => void;
  addPost: (post: PostData) => void;
  injectAiPost: () => void;
  rebuildAlgorithm: () => void;
  fetchData: () => Promise<void>;
  subscribeToRealtime: () => void;
  addCard: (card: TradingCard) => void;
}

const INITIAL_POSTS: PostData[] = [];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: {
        username: "Guest",
        bio: "",
        avatarUrl: "",
        followers: 0,
        following: 0,
      },
      finance: {
        walletAddress: "",
        bankingInfo: "",
        totalEarnings: 0,
        earningsBreakdown: {
          ads: 0,
          walking: 0,
          gaming: 0,
          tips: 0,
          subscriptions: 0
        },
        dailySteps: 0,
      },
      posts: [],
      inventory: [],
      algorithmKey: 0,
      
      fetchData: async () => {
        try {
          const { data: posts, error } = await supabase
            .from('posts')
            .select(`*, profiles (username, avatar_url)`)
            .order('created_at', { ascending: false });

          if (posts && !error) {
            const formattedPosts: PostData[] = posts.map((p: any) => ({
              id: p.id,
              author: {
                name: p.profiles?.username || 'Unknown',
                handle: p.profiles?.username?.toLowerCase() || 'unknown',
                avatar: p.profiles?.avatar_url || '',
                isVerified: false
              },
              content: p.content,
              type: p.type as any,
              mediaUrl: p.media_url,
              thumbnailUrl: p.thumbnail_url,
              stats: {
                likes: p.likes_count || 0,
                comments: p.comments_count || 0,
                shares: p.shares_count || 0,
                tips: p.tips_amount || 0
              },
              isPremium: p.is_premium,
              unlockPrice: p.unlock_price,
              timestamp: new Date(p.created_at).toLocaleDateString()
            }));
            set({ posts: formattedPosts });
          }

          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (profile) {
              set((state) => ({
                user: {
                  ...state.user,
                  username: profile.username,
                  bio: profile.bio,
                  avatarUrl: profile.avatar_url,
                  followers: profile.followers_count,
                  following: profile.following_count
                }
              }));
            }
            
            const { data: finance } = await supabase.from('user_finance').select('*').eq('user_id', user.id).single();
            if (finance) {
              set((state) => ({
                finance: {
                  ...state.finance,
                  walletAddress: finance.wallet_address,
                  totalEarnings: finance.total_earnings,
                  earningsBreakdown: finance.earnings_breakdown,
                  dailySteps: finance.daily_steps
                }
              }));
            }
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      },

      subscribeToRealtime: () => {
        supabase
          .channel('public:posts')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
            get().fetchData();
          })
          .subscribe();
      },

      updateUser: async (userData) => {
        set((state) => ({ user: { ...state.user, ...userData } }));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({
            username: userData.username,
            bio: userData.bio,
            avatar_url: userData.avatarUrl
          }).eq('id', user.id);
        }
      },

      updateFinance: async (financeData) => {
        set((state) => ({ finance: { ...state.finance, ...financeData } }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const updates: any = {};
          if (financeData.walletAddress !== undefined) updates.wallet_address = financeData.walletAddress;
          if (financeData.bankingInfo !== undefined) updates.banking_info = financeData.bankingInfo;
          if (financeData.totalEarnings !== undefined) updates.total_earnings = financeData.totalEarnings;
          if (financeData.earningsBreakdown !== undefined) updates.earnings_breakdown = financeData.earningsBreakdown;
          if (financeData.dailySteps !== undefined) updates.daily_steps = financeData.dailySteps;

          if (Object.keys(updates).length > 0) {
            await supabase.from('user_finance').update(updates).eq('user_id', user.id);
          }
        }
      },

      addEarnings: async (amount, source) => {
        set((state) => ({ 
          finance: { 
            ...state.finance, 
            totalEarnings: state.finance.totalEarnings + amount,
            earningsBreakdown: {
              ...state.finance.earningsBreakdown,
              [source]: state.finance.earningsBreakdown[source] + amount
            }
          } 
        }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const state = get();
          await supabase.from('user_finance').update({
            total_earnings: state.finance.totalEarnings,
            earnings_breakdown: state.finance.earningsBreakdown
          }).eq('user_id', user.id);
        }
      },

      deductEarnings: (amount) => {
        const state = get();
        if (state.finance.totalEarnings >= amount) {
          const newTotal = state.finance.totalEarnings - amount;
          set((state) => ({
            finance: {
              ...state.finance,
              totalEarnings: newTotal
            }
          }));
          
          // Async update to Supabase
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              supabase.from('user_finance').update({
                total_earnings: newTotal
              }).eq('user_id', user.id);
            }
          });
          return true;
        }
        return false;
      },

      updateSteps: async (steps) => {
        set((state) => ({
          finance: { ...state.finance, dailySteps: steps }
        }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_finance').update({
            daily_steps: steps
          }).eq('user_id', user.id);
        }
      },

      addPost: async (post) => {
        set((state) => ({ posts: [post, ...state.posts] }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('posts').insert({
            user_id: user.id,
            content: post.content,
            type: post.type,
            media_url: post.mediaUrl,
            thumbnail_url: post.thumbnailUrl,
            is_premium: post.isPremium,
            unlock_price: post.unlockPrice ? parseFloat(post.unlockPrice) : null
          });
        }
      },

      injectAiPost: () => {
        const newPost = generateAiPost();
        set((state) => ({ posts: [newPost, ...state.posts] }));
      },

      rebuildAlgorithm: () =>
        set((state) => ({ algorithmKey: state.algorithmKey + 1 })),

      addCard: (card) => set((state) => ({
        inventory: [card, ...state.inventory]
      })),
    }),
    {
      name: 'nighthub-storage-v4',
    }
  )
);
