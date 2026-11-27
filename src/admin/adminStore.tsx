import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../api';
import { normalize } from '../content/store';
import type { SiteContent } from '../content/types';

/** What /api/admin/content/ (and publish / discard) return. */
export type ServerContent = {
  draft: unknown;
  published: unknown;
  hasUnpublishedChanges: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
};

export type SaveState = 'saved' | 'pending' | 'saving' | 'error';

type Editor = {
  /** The draft being edited. */
  content: SiteContent;
  published: SiteContent;
  /** The draft differs from what visitors see. */
  isDraft: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  saveState: SaveState;
  saveError: string | null;
  update: (recipe: (draft: SiteContent) => void) => void;
  replace: (content: SiteContent) => void;
  publish: () => Promise<void>;
  discard: () => Promise<void>;
  uploadImage: (file: Blob, name: string) => Promise<string>;
  /** Sends any unsaved edit now (before signing out, for example). */
  flush: () => Promise<void>;
};

const EditorContext = createContext<Editor | null>(null);
const serialize = (c: SiteContent) => JSON.stringify(c);

/** Draft and published content from the server, with autosave. */
export function AdminProvider({
  initial,
  onSignedOut,
  children,
}: {
  initial: ServerContent;
  /** The session ended (401): back to the sign-in screen. */
  onSignedOut: () => void;
  children: ReactNode;
}) {
  const [content, setContent] = useState(() => normalize(initial.draft)!);
  const [published, setPublished] = useState(() => normalize(initial.published)!);
  const [meta, setMeta] = useState({ publishedAt: initial.publishedAt, publishedBy: initial.publishedBy });
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastSaved = useRef(serialize(content));
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
      throw e;
    },
    [onSignedOut],
  );

  const accept = useCallback((data: ServerContent) => {
    const draft = normalize(data.draft)!;
    lastSaved.current = serialize(draft);
    setContent(draft);
    setPublished(normalize(data.published)!);
    setMeta({ publishedAt: data.publishedAt, publishedBy: data.publishedBy });
    setSaveState('saved');
    setSaveError(null);
  }, []);

  /** Saves one snapshot of the draft; saves run one after another, never overlapping. */
  const save = useCallback(
    (snapshot: SiteContent) => {
      const json = serialize(snapshot);
      const run = queue.current.then(async () => {
        if (json === lastSaved.current) return;
        setSaveState('saving');
        try {
          await api<ServerContent>('/api/admin/content/', { method: 'PUT', json: { draft: snapshot } });
          lastSaved.current = json;
          setSaveError(null);
        } catch (e) {
          setSaveState('error');
          setSaveError(e instanceof Error ? e.message : String(e));
          fail(e);
        }
      });
      queue.current = run.catch(() => undefined);
      return run;
    },
    [fail],
  );

  // Autosave shortly after typing stops.
  useEffect(() => {
    if (serialize(content) === lastSaved.current) return;
    setSaveState('pending');
    const t = window.setTimeout(() => {
      save(content)
        .then(() => setSaveState((s) => (s === 'saving' ? 'saved' : s)))
        .catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(t);
  }, [content, save]);

  // Don't lose edits that haven't reached the server yet.
  useEffect(() => {
    if (saveState === 'saved') return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [saveState]);

  const update = useCallback((recipe: (draft: SiteContent) => void) => {
    setContent((prev) => {
      const next = structuredClone(prev);
      recipe(next);
      return next;
    });
  }, []);

  const publish = useCallback(async () => {
    await save(content);
    accept(await api<ServerContent>('/api/admin/publish/', { method: 'POST' }).catch(fail));
  }, [accept, content, fail, save]);

  const discard = useCallback(async () => {
    await queue.current;
    accept(await api<ServerContent>('/api/admin/discard/', { method: 'POST' }).catch(fail));
  }, [accept, fail]);

  const uploadImage = useCallback(
    async (file: Blob, name: string) => {
      const form = new FormData();
      form.append('file', file, name);
      const { url } = await api<{ url: string }>('/api/admin/images/', { method: 'POST', form }).catch(fail);
      return url;
    },
    [fail],
  );

  const value = useMemo<Editor>(
    () => ({
      content,
      published,
      isDraft: serialize(content) !== serialize(published),
      ...meta,
      saveState,
      saveError,
      update,
      replace: setContent,
      publish,
      discard,
      uploadImage,
      flush: () => save(content),
    }),
    [content, published, meta, saveState, saveError, update, publish, discard, uploadImage, save],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): Editor {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error('useEditor must be used inside <AdminProvider>');
  return editor;
}
