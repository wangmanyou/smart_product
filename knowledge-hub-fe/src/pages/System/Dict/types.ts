export enum DictType {
  'tree' = 'tree',
  'plane' = 'plane',
}

export enum ActionType {
  'create' = 'create',
  'edit' = 'edit',
}

export type DictListParams = {
  pageSize?: number;
  pageNumber?: number;
  searchDictName?: string;
  searchDictType?: DictType;
  searchDictDisabled?: string;
  [x: string]: any;
};

export type DictListResult = {
  dictTemplateId: number;
  dictName: string;
  dictType: string;
  dictDisabled: boolean;
  updateTime: number;
  creatorName: string;
};

export type DictDetailResult = {
  id?: number;
  contentId?: number;
  isDisabled?: boolean;
  isUsed?: boolean;
  name?: string;
  originName?: string;
  parentId?: number;
  localParentId?: number;
  level?: number;
  children?: DictDetailResult[];
  type?: string;
  [x: string]: any;
};
