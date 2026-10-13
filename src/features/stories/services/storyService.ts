import { api } from '../../../services/api/apiClient';
import type { Story, StoryPage, StoryResponse } from '../types/story.types';

export const getMyStories = (page = 1, limit = 20) =>
  api.request<StoryPage>(`/stories/me?page=${page}&limit=${limit}`);

export const getStoryFeed = (page = 1, limit = 20) =>
  api.request<StoryPage>(`/stories/feed?page=${page}&limit=${limit}`);

export const getUserStories = (userId: string, page = 1, limit = 20) =>
  api.request<StoryPage>(`/stories/user/${userId}?page=${page}&limit=${limit}`);

export const getStory = async (storyId: string) =>
  (await api.request<StoryResponse>(`/stories/${storyId}`)).story;

export const viewStory = async (storyId: string) => {
  await api.request<{ viewed: boolean }>(`/stories/${storyId}/view`, {
    method: 'POST',
  });
  return getStory(storyId);
};

export const deleteStory = (storyId: string) =>
  api.request<{ success: boolean }>(`/stories/${storyId}`, { method: 'DELETE' });

export const createStory = async (
  uri: string,
  mediaType: 'image' | 'video',
  caption: string,
) => {
  const form = new FormData();
  const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
  const extension = mediaType === 'video' ? 'mp4' : 'jpg';
  form.append('media', { uri, name: `story.${extension}`, type: mimeType } as unknown as Blob);
  form.append('mediaType', mediaType);
  form.append('caption', caption);
  form.append('visibility', 'friends');
  return (await api.request<StoryResponse>('/stories', {
    method: 'POST',
    body: form,
  })).story;
};

export type StoryEntity = Story;