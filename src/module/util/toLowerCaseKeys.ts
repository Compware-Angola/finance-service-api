export const toLowerCaseKeys = (data: any): any => {
  if (data == null) return data;

  if (Array.isArray(data)) {
    return data.map(toLowerCaseKeys);
  }

  if (data instanceof Date) {
    return data;
  }

  if (typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      const value = data[key];
      acc[key.toLowerCase()] = typeof value === 'object' && value !== null
        ? toLowerCaseKeys(value)  // recursivo para objetos aninhados
        : value;
      return acc;
    }, {} as any);
  }

  return data;
};