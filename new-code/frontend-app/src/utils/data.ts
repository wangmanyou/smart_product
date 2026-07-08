import dayjs from 'dayjs';

export const sceneTypeText: Record<string, string> = {
  dict: '数据目录',
  text: '文本',
  integer: '整数',
  decimal: '小数',
  datetime: '日期时间',
  tag: '标签',
  richtext: '富文本',
  picture: '图片',
  video: '视频',
  audio: '音频',
  file: '文件',
};

export function stripHtml(value?: string) {
  return String(value || '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function safeColor(value?: string) {
  const color = String(value || '').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(color)) return color;
  if (/^(black|white|red|blue|green|orange|purple|gray|grey|yellow)$/i.test(color)) return color;
  return '';
}

const richTextAllowedTags = new Set([
  'p', 'br', 'strong', 'b', 'u', 'em', 'i', 's', 'span', 'blockquote',
  'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'img', 'a', 'hr',
  'video', 'source',
]);

const richTextAllowedStyleNames = new Set([
  'color', 'background-color', 'font-size', 'font-family', 'font-weight', 'font-style',
  'text-decoration', 'text-align', 'line-height', 'padding', 'padding-left', 'padding-right',
  'margin', 'margin-left', 'margin-right', 'border', 'border-collapse', 'width', 'height',
]);

function safeRichTextUrl(value?: string) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.startsWith('/') || text.startsWith('./') || text.startsWith('../')) return text;
  if (/^(https?:|mailto:|tel:|data:image\/)/i.test(text)) return text;
  return '';
}

function cleanRichTextStyle(value?: string) {
  return String(value || '')
    .split(';')
    .map((item) => item.trim())
    .filter((item) => item.includes(':'))
    .map((item) => {
      const [rawName, ...rest] = item.split(':');
      const name = rawName.trim().toLowerCase();
      const styleValue = rest.join(':').trim();
      const lower = styleValue.toLowerCase();
      if (!richTextAllowedStyleNames.has(name)) return '';
      if (!styleValue || /javascript:|expression\(|url\(|@import|behavior:|[<>]/i.test(lower)) return '';
      if (name === 'color' || name === 'background-color') {
        return safeColor(styleValue) ? `${name}:${styleValue}` : '';
      }
      return `${name}:${styleValue}`;
    })
    .filter(Boolean)
    .join(';');
}

export function sanitizeRichTextHtml(value?: string) {
  const html = String(value || '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  if (typeof document === 'undefined') return html;

  const template = document.createElement('template');
  template.innerHTML = html;

  const cleanElement = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    if (!richTextAllowedTags.has(tag)) {
      Array.from(element.children).forEach(cleanElement);
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    Array.from(element.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      const allowed =
        name === 'class' ||
        name === 'style' ||
        tag === 'a' && ['href', 'title', 'target', 'rel'].includes(name) ||
        tag === 'img' && ['src', 'alt', 'title', 'width', 'height'].includes(name) ||
        tag === 'video' && ['src', 'poster', 'controls', 'width', 'height'].includes(name) ||
        tag === 'source' && ['src', 'type'].includes(name);

      if (!allowed) {
        element.removeAttribute(attr.name);
        return;
      }
      if (name === 'style') {
        const style = cleanRichTextStyle(value);
        if (style) element.setAttribute('style', style);
        else element.removeAttribute('style');
      }
      if (['href', 'src', 'poster'].includes(name)) {
        const url = safeRichTextUrl(value);
        if (url) element.setAttribute(name, url);
        else element.removeAttribute(name);
      }
      if (tag === 'a' && name === 'target') {
        element.setAttribute('rel', 'noopener noreferrer');
      }
    });

    Array.from(element.children).forEach(cleanElement);
  };

  Array.from(template.content.children).forEach(cleanElement);
  return template.innerHTML;
}

export function normalizeTagValues(value: any) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .flatMap((item) => String(item || '').split(/[,\uFF0C\u3001]+/))
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

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

function lastScalarValue(value: any): string | undefined {
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const next = lastScalarValue(value[index]);
      if (next) return next;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    return lastScalarValue(value.id ?? value.value ?? value.key);
  }
  const text = String(value ?? '').trim();
  return text || undefined;
}

function scalarValues(value: any): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => scalarValues(item));
  }
  if (value && typeof value === 'object') {
    return scalarValues(value.id ?? value.value ?? value.key);
  }
  const text = String(value ?? '').trim();
  return text ? [text] : [];
}

export function normalizeDictFormValue(value: any, multiValue?: boolean) {
  const parsed = safeJson(value);
  if (!multiValue) {
    return lastScalarValue(parsed);
  }

  const hasPathGroups = parsed.some((item) => Array.isArray(item));
  const ids = hasPathGroups
    ? parsed.map((item) => lastScalarValue(item)).filter(Boolean)
    : scalarValues(parsed);
  return Array.from(new Set(ids.map(String)));
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
  if (sceneItem?.type === 'tag') {
    return values.length ? normalizeTagValues(values).join('，') : '--';
  }
  if (sceneItem?.type === 'richtext') {
    const summary = stripHtml(values.join(''));
    return summary || '--';
  }
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
      if (item.sceneItemValue?.length) return stripHtml(item.sceneItemValue.join('，'));
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
    if (item.type === 'tag') {
      return {
        sceneItemId: item.id,
        sceneItemValue: normalizeTagValues(raw),
      };
    }
    if (item.type === 'richtext') {
      const html = String(raw || '').trim();
      return {
        sceneItemId: item.id,
        sceneItemValue: html ? [html] : [],
      };
    }
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return {
      sceneItemId: item.id,
      sceneItemValue: arr,
    };
  });
}
