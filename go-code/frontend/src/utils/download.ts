// 根据文件路径获取文件名称
export const getFilenameByPath = (path: string = '') => {
    const parts = path.split('/');
    return parts[parts.length - 1];
}

export function downloadFn(file: string, filename?: string) {
    const origin = window.location.origin;

    let nowFile = file;
    if(!file.startsWith('http')) {
        nowFile = `${origin}${file}`;
    }
    const a: any = document.createElement('a')
    a.download = filename || 'default';
    a.href = nowFile;
    document.body.appendChild(a)
    a.click()
    a.remove()
}