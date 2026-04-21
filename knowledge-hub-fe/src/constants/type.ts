export enum ActionType {
    'create' = 'create',
    'edit' = 'edit',
}

export enum SceneType {
    'dict' = 'dict',
    'text' = 'text',
    'integer' = 'integer',
    'decimal' = 'decimal',
    'datetime' = 'datetime',
    'picture' = 'picture',
    'video' = 'video',
    'audio' = 'audio',
    'file' = 'file',
}
export const SceneTypeConfig: { value: SceneType, label: string }[] = [
    { value: SceneType.dict, label: '数据目录' },
    { value: SceneType.text, label: '文本' },
    { value: SceneType.integer, label: '整数' },
    { value: SceneType.decimal, label: '小数' },
    { value: SceneType.datetime, label: '日期时间' },
    { value: SceneType.picture, label: '图片' },
    { value: SceneType.video, label: '视频' },
    { value: SceneType.audio, label: '音频' },
    { value: SceneType.file, label: '文件' },
];

export const SceneTypeConfigEnum: Record<SceneType, { text: string }> = {
    [SceneType.dict]: { text: '数据目录' },
    [SceneType.text]: { text: '文本' },
    [SceneType.integer]: { text: '整数' },
    [SceneType.decimal]: { text: '小数' },
    [SceneType.datetime]: { text: '日期时间' },
    [SceneType.picture]: { text: '图片' },
    [SceneType.video]: { text: '视频' },
    [SceneType.audio]: { text: '音频' },
    [SceneType.file]: { text: '文件' },
}

export const PictureType = ['.jpg', '.jpeg', '.png', '.webp'];
export const AudioType = ['.mp3', '.flac'];
export const VideoType = ['.mp4', '.mov', '.mkv'];
export const FileType = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.war', '.wps', '.pdf', '.jpg', '.png', '.jpeg'];
