# Discover API coverage

## APIs used by the screen

- `GET /stories/feed?page=&limit=` returns active stories from accepted
  friends, with `hasViewed` and pagination. Discover filters out malformed and
  expired stories before displaying them.
- `GET /stories/me?page=&limit=` returns the signed-in user's active stories
  for the **Your Story** item.
- `POST /stories/:storyId/view` and `GET /stories/user/:userId?page=&limit=`
  are used by the existing Story Viewer opened from a story item.
- `GET /notifications/unread-count` provides the header notification badge.
- `GET /friends/search` remains available from the existing Search screen; it
  searches people, not public posts.

## Missing public-post functionality

The backend has no post model/module, public-post endpoint, or post-detail
route/screen. The Discover feed therefore displays an explicit unavailable
state and does not show sample content.

To implement the requested public feed, the minimum backend/API work is:

1. Add a paginated endpoint such as
   `GET /posts/public?page=&limit=` (optionally supporting a search or category
   parameter). It must return only content visible to the authenticated user
   after privacy, block, and moderation rules are applied.
2. Define a post response with a stable post ID, creator ID/username/avatar,
   optional verified status, media URL and media type, caption, creation time,
   and optional like/comment counts. Counts must come from backend data; omit
   them when unavailable.
3. Add a post-detail API and a registered detail screen/route if tapping a
   post should open its details. No such route currently exists.
4. Add authenticated like/comment endpoints and persistence only if those
   actions are intended to be interactive; the Discover UI must not imply a
   local tap is saved server-side.
