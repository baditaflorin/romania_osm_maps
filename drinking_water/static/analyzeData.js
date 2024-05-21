// Filename: ./static/analyzeData.js

const getTopKeyValues = (data, topN = 200) => {
    const keyValueCounts = {};

    data.forEach(item => {
        Object.entries(item.tags).forEach(([key, value]) => {
            const keyValue = `${key}:${value}`;
            if (!keyValueCounts[keyValue]) {
                keyValueCounts[keyValue] = 0;
            }
            keyValueCounts[keyValue]++;
        });
    });

    const sortedKeyValues = Object.entries(keyValueCounts).sort((a, b) => b[1] - a[1]);
    return sortedKeyValues.slice(0, topN);
};
