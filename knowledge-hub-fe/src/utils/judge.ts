
export function isSupportFileType(file: File, types: string[] ) {
    
    const fileType = file.name?.split('.')?.pop();
    console.log(file.name, types, fileType);
    return types?.includes(`.${fileType}`);
}