import React from 'react';
import {connect} from 'react-redux';
// Actions
import {fetchMetadataVocabularyIfNeeded} from "../common/redux/actions/vocabularyActions";
import {
    createMetadataEntity, deleteMetadataEntity, fetchMetadataBySubjectIfNeeded, submitMetadataChanges
} from "../common/redux/actions/metadataActions";
// Reducers
import {getVocabulary, hasVocabularyError, isVocabularyPending} from "../common/redux/reducers/cache/vocabularyReducers";
import {getMetadataForSubject, hasMetadataError, isMetadataPending} from "../common/redux/reducers/cache/jsonLdBySubjectReducers";
// Utils
import {getTypeInfo} from "../common/utils/linkeddata/metadataUtils";
import {getFirstPredicateValue} from "../common/utils/linkeddata/jsonLdUtils";
// Other
import LinkedDataContext, {searchLinkedData} from './LinkedDataContext';
import {METADATA_PATH, USABLE_IN_METADATA_URI} from "../constants";
import valueComponentFactory from "./common/values/LinkedDataValueComponentFactory";

const LinkedDataMetadataProvider = ({
    children, fetchMetadataVocabulary, fetchMetadataBySubject, dispatchSubmitMetadataChanges,
    vocabulary, createEntity,
    getLinkedDataForSubject, shapesError, dispatchDeleteEntity,
    ...otherProps
}) => {
    if (!shapesError) {
        fetchMetadataVocabulary();
    }

    const createLinkedDataEntity = (subject, values, type) => createEntity(subject, values, vocabulary, type).then(({value}) => value);
    const submitLinkedDataChanges = (subject, values) => dispatchSubmitMetadataChanges(subject, values, vocabulary)
        .then(() => fetchMetadataBySubject(subject));

    const deleteLinkedDataEntity = subject => dispatchDeleteEntity(subject)
        .then(() => fetchMetadataBySubject(subject));

    const extendProperties = ({properties, isEntityEditable = true}) => properties
        .map(p => ({
            ...p,
            isEditable: isEntityEditable && !p.machineOnly
        }));

    const namespaces = vocabulary.getNamespaces(namespace => getFirstPredicateValue(namespace, USABLE_IN_METADATA_URI));

    const getTypeInfoForLinkedData = (metadata) => getTypeInfo(metadata, vocabulary);

    const getClassesInCatalog = () => vocabulary.getClassesInCatalog();

    return (
        <LinkedDataContext.Provider
            value={{
                ...otherProps,

                // Backend interactions
                fetchLinkedDataForSubject: fetchMetadataBySubject,
                searchLinkedData,
                createLinkedDataEntity,
                deleteLinkedDataEntity,
                submitLinkedDataChanges,
                getLinkedDataForSubject,

                // Fixed properties
                hasEditRight: true,
                requireIdentifier: true,
                editorPath: METADATA_PATH,
                namespaces,

                // Get information from shapes
                getDescendants: vocabulary.getDescendants,
                determineShapeForTypes: vocabulary.determineShapeForTypes,
                getTypeInfoForLinkedData,
                getClassesInCatalog,

                // Generic methods without reference to shapes
                extendProperties,
                valueComponentFactory,

                shapes: vocabulary,
                shapesError
            }}
        >
            {children}
        </LinkedDataContext.Provider>
    );
};

const mapStateToProps = (state) => {
    const shapesLoading = isVocabularyPending(state);
    const vocabulary = getVocabulary(state);
    const hasShapesError = hasVocabularyError(state);
    const shapesError = !shapesLoading && hasShapesError && 'An error occurred while loading the metadata';
    const isLinkedDataLoading = (subject) => isMetadataPending(state, subject);
    const hasLinkedDataErrorForSubject = (subject) => hasMetadataError(state, subject);
    const getLinkedDataForSubject = subject => getMetadataForSubject(state, subject);

    return {
        shapesLoading,
        vocabulary,
        shapesError,
        isLinkedDataLoading,
        hasLinkedDataErrorForSubject,
        getLinkedDataForSubject,
    };
};

const mapDispatchToProps = {
    fetchMetadataVocabulary: fetchMetadataVocabularyIfNeeded,
    fetchMetadataBySubject: fetchMetadataBySubjectIfNeeded,
    dispatchSubmitMetadataChanges: submitMetadataChanges,
    createEntity: createMetadataEntity,
    dispatchDeleteEntity: deleteMetadataEntity,
};

export default connect(mapStateToProps, mapDispatchToProps)(LinkedDataMetadataProvider);
