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

export {
    getTimeStamp
};