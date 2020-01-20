import {useContext, useState} from 'react';
import useDeepCompareEffect from "../common/hooks/UseDeepCompareEffect";

import LinkedDataContext from './LinkedDataContext';

const useLinkedDataSearch = (selectedTypes, query, size, page, availableTypes) => {
    const {shapesLoading, searchLinkedData} = useContext(LinkedDataContext);

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState();

    useDeepCompareEffect(() => {
        // Only execute search if there are any availableTypes to query on,
        // i.e. when the shapes have been loaded
        if (availableTypes.length === 0 || shapesLoading) {
            return;
        }

        const getTypesToQuery = () => {
            const targetClassesInCatalog = availableTypes.map(typeDefinition => typeDefinition.targetClass);

            return selectedTypes.length === 0
                ? targetClassesInCatalog
                : selectedTypes.filter(type => targetClassesInCatalog.includes(type));
        };

        searchLinkedData({
            query: query || '*',
            types: getTypesToQuery(),
            size,
            page
        })
            .then(data => {
                setItems(data.items);
                setTotal(data.total);
                setError(undefined);
            })
            .catch((e) => setError(e || true))
            .finally(() => setLoading(false));
    }, [query, shapesLoading, size, page, searchLinkedData, selectedTypes, availableTypes]);

    return {
        searchPending: loading,
        searchError: error,
        items,
        total,
        hasHighlights: items && items.some(({highlights}) => highlights.length > 0),
    };
};

export default useLinkedDataSearch;
