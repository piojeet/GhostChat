import { api } from '../../../services/api/apiClient';
import type {
  FriendItem,
  FriendRequestItem,
  FriendSuggestion,
  FriendStatus,
  PaginatedResponse,
  SearchUser,
} from '../types/friend.types';

export const getFriends = (page = 1, limit = 20) =>
  api.request<PaginatedResponse<FriendItem>>(`/friends?page=${page}&limit=${limit}`);

export const searchFriends = (query: string, page = 1, limit = 20) =>
  api.request<PaginatedResponse<SearchUser>>(
    `/friends/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
  );

export const getFriendSuggestions = (page = 1, limit = 20) =>
  api.request<PaginatedResponse<FriendSuggestion>>(
    `/friends/suggestions?page=${page}&limit=${limit}`,
  );

export const getFriendCount = async () =>
  (await api.request<{ count: number }>('/friends/count')).count;

export const getFriendStatus = async (userId: string): Promise<FriendStatus> =>
  (await api.request<{ status: FriendStatus }>(`/friends/status/${userId}`)).status;

export const getIncomingRequests = (page = 1, limit = 20) =>
  api.request<PaginatedResponse<FriendRequestItem>>(
    `/friends/requests/incoming?page=${page}&limit=${limit}`,
  );

export const getOutgoingRequests = (page = 1, limit = 20) =>
  api.request<PaginatedResponse<FriendRequestItem>>(
    `/friends/requests/outgoing?page=${page}&limit=${limit}`,
  );

export const sendFriendRequest = (userId: string) =>
  api.request<{ friendRequest: { id: string; status: 'pending' } }>(
    '/friends/requests',
    { method: 'POST', body: { userId } },
  );

export const cancelFriendRequest = (requestId: string) =>
  api.request<{ success: boolean }>(`/friends/requests/${requestId}`, {
    method: 'DELETE',
  });

export const acceptFriendRequest = (requestId: string) =>
  api.request(`/friends/requests/${requestId}/accept`, { method: 'PATCH' });

export const declineFriendRequest = (requestId: string) =>
  api.request<{ success: boolean }>(`/friends/requests/${requestId}/decline`, {
    method: 'PATCH',
  });

export const removeFriend = (userId: string) =>
  api.request<{ success: boolean }>(`/friends/${userId}`, { method: 'DELETE' });