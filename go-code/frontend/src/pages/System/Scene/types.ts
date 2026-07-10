import { SceneType } from '@/constants/type';
export enum ActionType {
    'create' = 'create',
    'edit' = 'edit',
}


export type SceneListParams = {
    pageSize?: number;
    pageNumber?: number;
    searchSceneName?: string;
    searchSceneDisabled?: boolean;
    [x: string]: any;
};

export type SceneListResult = {
    sceneTemplateId: number;
    sceneName: string;
    sceneIsDisabled: boolean;
    sceneIsUsed: boolean;
    updateTime: number;
    creatorName: string;
};

export type SceneItem = {
    localId?: number;
    id?: number;
    sceneItemName: string | null;
    type: SceneType | null;
    dictTemplateId?: number;
    multiValue: boolean;
    isHide: boolean;
    isRequired: boolean;
    isSupportSearch: boolean;
    sortNumber?: number;
}
export type SceneDetailResult = {
    sceneTemplateDetail: SceneListResult;
    sceneItem: SceneItem[];
};