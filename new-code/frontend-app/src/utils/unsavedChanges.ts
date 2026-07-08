import { Modal } from 'antd';
import { useEffect, useRef } from 'react';

type UnsavedGuard = {
  isDirty: () => boolean;
  saveDraft?: () => void;
  discardDraft?: () => void;
};

const GUARD_KEY = '__knowledgeHubUnsavedGuards__';
const DRAFT_PATHS_KEY = 'knowledge-hub-unsaved-draft-paths';

function guards(): Map<string, UnsavedGuard> {
  const win = window as any;
  if (!win[GUARD_KEY]) {
    win[GUARD_KEY] = new Map<string, UnsavedGuard>();
  }
  return win[GUARD_KEY];
}

function readDraftPaths() {
  try {
    const value = sessionStorage.getItem(DRAFT_PATHS_KEY);
    const paths = value ? JSON.parse(value) : [];
    return Array.isArray(paths) ? paths.map(String) : [];
  } catch {
    return [];
  }
}

function writeDraftPaths(paths: string[]) {
  sessionStorage.setItem(DRAFT_PATHS_KEY, JSON.stringify(Array.from(new Set(paths))));
}

function markDraft(path?: string) {
  if (!path) return;
  writeDraftPaths([...readDraftPaths(), path]);
}

function clearDraftMark(path?: string) {
  if (!path) return;
  writeDraftPaths(readDraftPaths().filter((item) => item !== path));
}

function hasDraft(path?: string) {
  if (!path) return false;
  return readDraftPaths().includes(path);
}

export function useUnsavedChanges(
  path: string,
  dirty: boolean,
  enabled = true,
  options: { saveDraft?: () => void; discardDraft?: () => void } = {},
) {
  const dirtyRef = useRef(dirty);
  const enabledRef = useRef(enabled);
  const saveDraftRef = useRef(options.saveDraft);
  const discardDraftRef = useRef(options.discardDraft);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    saveDraftRef.current = options.saveDraft;
    discardDraftRef.current = options.discardDraft;
  }, [options.saveDraft, options.discardDraft]);

  useEffect(() => {
    guards().set(path, {
      isDirty: () => enabledRef.current && dirtyRef.current,
      saveDraft: () => saveDraftRef.current?.(),
      discardDraft: () => discardDraftRef.current?.(),
    });
    return () => {
      guards().delete(path);
    };
  }, [path]);

  return () => {
    dirtyRef.current = false;
    discardDraftRef.current?.();
    clearDraftMark(path);
  };
}

export function hasUnsavedChanges(path?: string) {
  if (!path) return false;
  return Boolean(guards().get(path)?.isDirty() || hasDraft(path));
}

export function discardUnsavedDraft(path?: string) {
  if (!path) return;
  guards().get(path)?.discardDraft?.();
  sessionStorage.removeItem(`knowledge-form-draft:${path}`);
  clearDraftMark(path);
}

export async function prepareUnsavedTabSwitch(path?: string) {
  if (!path) return true;
  const guard = guards().get(path);
  if (guard?.isDirty() && guard.saveDraft) {
    guard.saveDraft();
    markDraft(path);
    return true;
  }
  return confirmUnsavedLeave(path);
}

export function confirmUnsavedLeave(path?: string) {
  if (!hasUnsavedChanges(path)) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '存在未保存的编辑',
      content: '离开当前页面后，未保存的修改将不会保留。确认离开？',
      okText: '确认离开',
      cancelText: '继续编辑',
      centered: true,
      onOk: () => {
        discardUnsavedDraft(path);
        resolve(true);
      },
      onCancel: () => resolve(false),
    });
  });
}

export async function runAfterUnsavedConfirm(path: string | undefined, action: () => void) {
  const confirmed = await confirmUnsavedLeave(path);
  if (confirmed) {
    action();
  }
}
