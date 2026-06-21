import { Modal } from 'antd';
import { useEffect, useRef } from 'react';

type UnsavedGuard = {
  isDirty: () => boolean;
};

const GUARD_KEY = '__knowledgeHubUnsavedGuards__';

function guards(): Map<string, UnsavedGuard> {
  const win = window as any;
  if (!win[GUARD_KEY]) {
    win[GUARD_KEY] = new Map<string, UnsavedGuard>();
  }
  return win[GUARD_KEY];
}

export function useUnsavedChanges(path: string, dirty: boolean, enabled = true) {
  const dirtyRef = useRef(dirty);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    guards().set(path, {
      isDirty: () => enabledRef.current && dirtyRef.current,
    });
    return () => {
      guards().delete(path);
    };
  }, [path]);

  return () => {
    dirtyRef.current = false;
  };
}

export function hasUnsavedChanges(path?: string) {
  if (!path) return false;
  return Boolean(guards().get(path)?.isDirty());
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
      onOk: () => resolve(true),
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
