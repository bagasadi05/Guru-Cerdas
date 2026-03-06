export const normalizeStudentName = (name: string): string => {
    return name.trim().replace(/\s+/g, ' ');
};

export const isStudentNameValid = (name: string): boolean => {
    return normalizeStudentName(name).length > 0;
};
