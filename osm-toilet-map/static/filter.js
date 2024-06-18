// filter.js

const filterData = (data, criteria) => {
    return data.filter(item => {
        return Object.entries(criteria).every(([key, value]) => {
            if (Array.isArray(value)) {
                return value.includes(item.tags[key]);
            }
            return item.tags[key] === value;
        });
    });
};
