/** Lesson discussion shapes shared by the comments API and UI. Safe on the client. */

export const COMMENT_MAX = 2000;
export const REPORT_MAX = 500;

export type CommentRole = "admin" | "instructor" | null;

export type CommentView = {
  id: string;
  parentId: string | null;
  authorName: string;
  authorImage: string | null;
  authorRole: CommentRole;
  /** Empty when deleted. */
  body: string;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  /** Only ever true for admins (others never receive hidden comments). */
  hidden: boolean;
  pinned: boolean;
  likeCount: number;
  likedByMe: boolean;
  reportedByMe: boolean;
  mine: boolean;
  /** Admins only. */
  reports?: { reason: string; createdAt: string }[];
  replies: CommentView[];
};

export type Viewer = { signedIn: boolean; isAdmin: boolean };

export type Thread = { comments: CommentView[]; total: number; viewer: Viewer };

export type CommentSort = "top" | "new";
