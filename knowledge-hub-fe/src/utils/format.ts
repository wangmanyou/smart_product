// 示例方法，没有实际意义
export function trim(str: string) {
  return str.trim();
}

// 过滤式空的字段
export function formatFilterEmpty(obj: any) {
  const newObj: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      newObj[key] = obj[key];
    }
  });
  return newObj;
}

