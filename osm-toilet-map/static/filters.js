// filters.js
import { fetchDataAndAddMarkers } from './data.js';

const createFilterElement = (key, value, count) => {
    const filterId = `filter-${key}-${value}`;
    const filterElement = document.createElement('div');
    filterElement.innerHTML = `
        <input type="checkbox" id="${filterId}" data-key="${key}" data-value="${value}">
        <label for="${filterId}">${key}: ${value} (${count})</label>
    `;
    return filterElement;
};

const populateFilters = (topKeyValues) => {
    const filtersContainer = document.getElementById('filters');
    filtersContainer.innerHTML = ''; // Clear previous filters
    topKeyValues.forEach(([keyValue, count]) => {
        const [key, value] = keyValue.split(':');
        const filterElement = createFilterElement(key, value, count);
        filtersContainer.appendChild(filterElement);
    });
};

const setupFilterEventListeners = (map) => {
    document.getElementById('apply-filters').addEventListener('click', () => {
        const selectedFilters = Array.from(document.querySelectorAll('#filters input:checked')).map(input => ({
            key: input.getAttribute('data-key'),
            value: input.getAttribute('data-value')
        }));

        const filterCriteria = selectedFilters.reduce((criteria, filter) => {
            if (!criteria[filter.key]) {
                criteria[filter.key] = [];
            }
            criteria[filter.key].push(filter.value);
            return criteria;
        }, {});

        fetchDataAndAddMarkers(map, filterCriteria);
    });

    document.getElementById('clear-filters').addEventListener('click', () => {
        document.querySelectorAll('#filters input:checked').forEach(input => input.checked = false);
        fetchDataAndAddMarkers(map); // Fetch all data without any filters
    });

    document.getElementById('toggle-filters').addEventListener('click', () => {
        const filtersContent = document.getElementById('filters-content');
        const isHidden = filtersContent.style.display === 'none';
        filtersContent.style.display = isHidden ? 'block' : 'none';
        document.getElementById('toggle-filters').textContent = isHidden ? 'Hide Filters' : 'Show Filters';
    });
};

export { populateFilters, setupFilterEventListeners };
