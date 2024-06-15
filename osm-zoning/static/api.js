// api.js

export const fetchWays = async (bbox) => {
    const response = await fetch(`/data?bbox=${bbox}`);
    const data = await response.json();
    return data;
};
