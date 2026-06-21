import dayjs from 'dayjs';

export const sceneTypeText: Record<string, string> = {
  dict: '数据目录',
  text: '文本',
  integer: '整数',
  decimal: '小数',
  datetime: '日期时间',
  picture: '图片',
  video: '视频',
  audio: '音频',
  file: '文件',
};

export function formatTime(seconds?: number | string) {
  if (!seconds) return '--';
  return dayjs(Number(seconds) * 1000).format('YYYY-MM-DD HH:mm');
}

export function flattenTree(nodes: any[] = [], level = 0): any[] {
  return nodes.flatMap((node) => {
    const { children, ...rest } = node;
    return [
      { ...rest, level },
      ...flattenTree(children || [], level + 1),
    ];
  });
}

export function safeJson(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export function formatBusinessDetail(data: any) {
  const sceneDetail = data?.sceneDetail || {};
  const sceneItems = sceneDetail.sceneItem || [];
  const dictDetails = data?.dictDetails || [];
  return {
    scene: sceneDetail.sceneTemplateDetail || {},
    sceneItems,
    dictDetails,
  };
}

export function dictForSceneItem(sceneItem: any, dictDetails: any[]) {
  if (!sceneItem) return null;
  return dictDetails.find(
    (item) => item?.dictTemplate?.dictTemplateId === sceneItem.dictTemplateId,
  );
}

export function dictNodes(sceneItem: any, dictDetails: any[]) {
  const detail = dictForSceneItem(sceneItem, dictDetails);
  const type = detail?.dictTemplate?.dictType;
  if (type === 'tree') return flattenTree(detail?.treeDict?.treeDict || []);
  return detail?.planeDict?.planeDict || [];
}

export function toAntTree(nodes: any[] = []): any[] {
  return nodes.map((node) => ({
    title: node.name,
    key: String(node.id),
    disabled: node.isDisabled,
    children: toAntTree(node.children || []),
  }));
}

export function displayKnowledgeValue(value: any, sceneItem: any, dictDetails: any[]) {
  if (!value) return '--';
  if (sceneItem?.type === 'dict') {
    const ids = safeJson(value.sceneItemSelectDictTreeIds).flat(Infinity);
    const nodes = dictNodes(sceneItem, dictDetails);
    const names = ids
      .map((id) => nodes.find((node: any) => String(node.id) === String(id))?.name)
      .filter(Boolean);
    return names.length ? names.join(' / ') : '--';
  }
  if (['picture', 'video', 'audio', 'file'].includes(sceneItem?.type || '')) {
    const count = value.sceneItemValue?.length || 0;
    return count ? `${count} 个${sceneTypeText[sceneItem.type] || '附件'}` : '--';
  }
  const values = value.sceneItemValue || [];
  return values.length ? values.join('，') : '--';
}

export function findKnowledgeItem(row: any, sceneItemId: number | string) {
  return row?.knowledgeShow?.find((item: any) => String(item.sceneItemId) === String(sceneItemId));
}

export function knowledgeDisplayTitle(knowledge: any, sceneItems: any[] = [], dictDetails: any[] = []) {
  const visibleItems = sceneItems.filter((item: any) => !item.isHide);
  const preferred =
    visibleItems.find((item: any) => /主题|标题|名称|问题|知识/.test(item.sceneItemName || '')) ||
    visibleItems.find((item: any) => item.type !== 'dict') ||
    visibleItems[0];

  if (preferred) {
    const value = displayKnowledgeValue(findKnowledgeItem(knowledge, preferred.id), preferred, dictDetails);
    if (value && value !== '--') return String(value).slice(0, 24);
  }

  const fallback = (knowledge?.knowledgeShow || [])
    .map((item: any) => {
      if (item.sceneItemValue?.length) return item.sceneItemValue.join('，');
      return '';
    })
    .find(Boolean);

  return fallback ? String(fallback).slice(0, 24) : `知识 ${knowledge?.knowledgeId || ''}`.trim();
}

export function setWorkTabLabel(path: string, label: string) {
  window.dispatchEvent(new CustomEvent('work-tab-label-change', { detail: { path, label } }));
}

export function closeWorkTab(path: string) {
  window.dispatchEvent(new CustomEvent('work-tab-close', { detail: { path } }));
}

export function buildKnowledgePayload(values: Record<string, any>, sceneItems: any[]) {
  return sceneItems.map((item) => {
    const raw = values[item.id];
    if (item.type === 'dict') {
      const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return {
        sceneItemId: item.id,
        sceneItemValue: [],
        sceneItemSelectDictTreeIds: JSON.stringify(arr.map((id) => Number(id))),
      };
    }
    if (['picture', 'video', 'audio', 'file'].includes(item.type || '')) {
      const fileList = Array.isArray(raw) ? raw : [];
      return {
        sceneItemId: item.id,
        sceneItemValue: fileList
          .map((file: any) => file?.response?.filePath || file?.response?.file_path || file?.url || file?.filePath || file?.file_path)
          .filter(Boolean),
      };
    }
    if (item.type === 'datetime') {
      const dates = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return {
        sceneItemId: item.id,
        sceneItemValue: dates
          .map((date: any) => dayjs.isDayjs(date) ? date.format('YYYY-MM-DD HH:mm:ss') : String(date || ''))
          .filter(Boolean),
      };
    }
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return {
      sceneItemId: item.id,
      sceneItemValue: arr,
    };
  });
}
