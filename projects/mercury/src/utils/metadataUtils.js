import * as consts from "../constants";
import Vocabulary from "../services/Vocabulary";


/**
 * Returns the value of the given property on the first entry of the predicate for the metadat
 * @param metadataEntry     An expanded metadata object with keys being the predicates
 * @param predicate         The predicate to search for
 * @param property          The property to return for the found object. Mostly '@id' or '@value' are used
 * @param defaultValue      A default value to be returned if no value could be found for the metadata entry
 * @returns {*}
 */
export const getFirstPredicateProperty = (metadataEntry, predicate, property, defaultValue) =>
    // eslint-disable-next-line implicit-arrow-linebreak
    (metadataEntry && metadataEntry[predicate] && metadataEntry[predicate][0] ? metadataEntry[predicate][0][property] : defaultValue);

export const getFirstPredicateValue = (metadataEntry, predicate, defaultValue) => getFirstPredicateProperty(metadataEntry, predicate, '@value', defaultValue);

export const getFirstPredicateId = (metadataEntry, predicate, defaultValue) => getFirstPredicateProperty(metadataEntry, predicate, '@id', defaultValue);

export const getFirstPredicateList = (metadataEntry, predicate, defaultValue) => getFirstPredicateProperty(metadataEntry, predicate, '@list', defaultValue);

/**
 *
 * @param uri the URI to generate a label for
 * @param shortenExternalUris if true will generate a short label even if a URI doesn't belong to the current workspace
 * e.g. http://example.com/aaa/bbb => bbb
 * otherwise will leave external URIs unmodified
 * @returns {*}
 */
export function linkLabel(uri, shortenExternalUris = false) {
    const supportedLocalInfixes = ['/iri/', '/vocabulary/', '/collections/'];
    const url = new URL(uri);

    // Local uris are treated separately, as we know its
    // structure
    if (url.hostname === window.location.hostname) {
        const foundInfix = supportedLocalInfixes.find(infix => url.pathname.startsWith(infix));
        if (foundInfix) {
            return `${url.pathname.substring(foundInfix.length)}${url.search}${url.hash}`;
        }
    }

    if (shortenExternalUris) {
        return uri.includes('#')
            ? uri.substring(uri.lastIndexOf('#') + 1)
            : uri.substring(uri.lastIndexOf('/') + 1);
    }

    return uri;
}

/**
 * Returns the label for the given entity.
 *
 * If an rdfs:label is present, that label is used.
 * If an sh:name is present, that label is used
 * Otherwise the last part of the id is returned
 *
 * @param entity    Expanded JSON-LD entity
 * @param shortenExternalUris Shorten external URIs
 * @returns string
 */
export function getLabel(entity, shortenExternalUris = false) {
    return getFirstPredicateValue(entity, consts.LABEL_URI)
        || getFirstPredicateValue(entity, 'http://www.w3.org/ns/shacl#name')
        || (entity && entity['@id'] && linkLabel(entity['@id'], shortenExternalUris));
}

/**
 * Returns a relative navigable link, excluding the base url
 * @param link
 * @returns {string}
 */
export function relativeLink(link) {
    const withoutSchema = link.toString().substring(link.toString().indexOf('//') + 2);
    return withoutSchema.substring(withoutSchema.indexOf('/'));
}

export function isDateTimeProperty(property) {
    return property.datatype === 'http://www.w3.org/TR/xmlschema11-2/#dateTime';
}

export function generateUuid() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g,
        // eslint-disable-next-line
        c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
}

/**
 * Returns whether a property should be shown to the user
 * @param {string} key property key
 * @param {string} domain property domain
 */
export const shouldPropertyBeHidden = (key, domain) => {
    const isCollection = domain === consts.COLLECTION_URI;
    const isFile = domain === consts.FILE_URI;
    const isDirectory = domain === consts.DIRECTORY_URI;
    const isManaged = isCollection || isFile || isDirectory;

    switch (key) {
        case '@type':
        case consts.TYPE_URI:
        case consts.FILE_PATH_URI:
        case consts.DATE_DELETED_URI:
        case consts.DELETED_BY_URI:
            return true;
        case consts.LABEL_URI:
            return isManaged;
        case consts.COMMENT_URI:
            return isCollection;
        default:
            return false;
    }
};

/**
 * Returns a filtered list of only properties to be shown to the user
 * @param {Object[]} properties the list of properties
 */
export const propertiesToShow = (properties = []) => {
    const domainKey = properties.find(property => property.key === '@type');
    const domainValue = domainKey && domainKey.values && domainKey.values[0] ? domainKey.values[0].id : undefined;
    return properties.filter(p => !shouldPropertyBeHidden(p.key, domainValue));
};


/**
 * Returns the given values in the right container. By default, no container is used
 * If the predicate requires an rdf:List, the values are put into a {'@list': ...} object
 * @param values
 * @returns {*}
 */
const rdfContainerize = (values, shape) => {
    if (Vocabulary.isRdfList(shape)) {
        return {'@list': values};
    }

    return values;
};

/**
 * Creates a json-ld object from the given subject, predicate and values
 */
export const toJsonLd = (subject, predicate, values, vocabulary = new Vocabulary()) => {
    if (!subject || !predicate || !values) {
        return null;
    }

    // if there are no values then send a special nil value as required by the backend
    if (values.length === 0) {
        return {
            '@id': subject,
            [predicate]: {'@id': consts.NIL_URI}
        };
    }

    return {
        '@id': subject,
        [predicate]: rdfContainerize(
            values.map(({id, value}) => ({'@id': id, '@value': value})),
            vocabulary.determineShapeForProperty(predicate)
        )
    };
};

/**
 * Creates a textual description of the type for the given metadata item
 * @param metadata
 * @returns {string}
 */
export const getTypeInfo = (metadata) => {
    const typeProp = metadata && metadata.find(prop => prop.key === '@type');
    const typeValue = (typeProp && typeProp.values && typeProp.values.length && typeProp.values[0]) || {};
    const {label, comment} = typeValue;

    return (label && comment) ? `${label} - ${comment}` : (label || comment);
};

/**
 * Creates a new IRI within this workspace, based on the given identifier and infix
 *
 * Please note that IRIs within the workspace always use http as scheme, regardless
 * of whether the app runs on https. This ensures consistent IRI generation and
 * add the ability to access the same IRI on different protocols.
 *
 * @param id
 * @returns {string}
 */
export const createIri = (id, infix) => `http://${window.location.hostname}/${infix}/${id}`;

/**
 * Creates a new metadata IRI within this workspace
 *
 * @param id
 * @returns {string}
 * @see createIri
 */
export const createMetadataIri = (id) => createIri(id, 'iri');

/**
 * Creates a new vocabulary IRI within this workspace
 *
 * @param id
 * @returns {string}
 * @see createIri
 */
export const createVocabularyIri = (id) => createIri(id, 'vocabulary');

/**
 * Generates a compatible workspace IRI from the given iri.
 *
 * This method will return the same iri as was given, but with http as scheme
 * and without the port number.
 * This ensures consistent IRI generation and
 * add the ability to access the same IRI on different protocols.
 *
 * @param id
 * @returns {string}
 */
export const url2iri = (iri) => {
    try {
        const url = new URL(iri);
        return `http://${url.hostname}${url.pathname}${url.search}${url.hash}`;
    } catch (e) {
        console.warn("Invalid uri given to convert to iri", iri);
        return iri;
    }
};
