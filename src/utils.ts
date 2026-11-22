function getTimeStamp(): string {
    return new Date().toLocaleString('zh', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function compareNames(a: string, b: string): number {
    // 大小写不敏感的自然排序，例如 2 < 10
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export {
    getTimeStamp,
    compareNames,
};