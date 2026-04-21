export enum ActionType {
    'create' = 'create',
    'edit' = 'edit',
}

export type BusinessListParams = {
    pageSize?: number;
    pageNumber?: number;
    searchSceneName?: string;
    [x: string]: any;
};

export type BusinessListResult = {
    sceneTemplateId: number;
    sceneName: string;
    sceneIsDisabled: boolean;
    sceneIsUsed: boolean;
    updateTime: number;
    creatorName: string;
};

export type BusinessDetailResult = {
};