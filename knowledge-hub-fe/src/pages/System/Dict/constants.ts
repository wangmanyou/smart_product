import { DictType } from './types';

export const DictTypeMap = {
  [DictType.plane]: '平面结构数据',
  [DictType.tree]: '树状结构数据',
};
export const DictTypeConfig = [
  {
    value: DictType.plane,
    label: DictTypeMap[DictType.plane],
  },
  {
    value: DictType.tree,
    label: DictTypeMap[DictType.tree],
  },
];

export const DictStatusConfig = [
  {
    value: 'all',
    label: '全部',
  },
  {
    value: 'enabled',
    label: '正常',
  },
  {
    value: 'disabled',
    label: '禁用',
  },
];
