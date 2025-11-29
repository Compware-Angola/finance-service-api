export const toLowerCaseKeys = (obj: any): any => {
  if (!obj) return obj;
  return Object.keys(obj).reduce((acc, key) => {
    acc[key.toLowerCase()] = obj[key];
    return acc;
  }, {} as any);
};

