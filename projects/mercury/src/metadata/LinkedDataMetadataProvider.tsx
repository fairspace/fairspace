// @ts-nocheck
import React, { useCallback, useContext } from "react";
// Utils
import { getFirstPredicateValue } from "./common/jsonLdUtils";
// Other
import LinkedDataContext from "./LinkedDataContext";
import { USABLE_IN_METADATA_URI } from "../constants";
import valueComponentFactory from "./common/values/LinkedDataValueComponentFactory";
import VocabularyContext from "./vocabulary/VocabularyContext";
import { getNamespaces } from "./common/vocabularyUtils";
import MetadataAPI from "./common/MetadataAPI";

const LinkedDataMetadataProvider = ({
  children,
  ...otherProps
}) => {
  const {
    vocabulary,
    vocabularyLoading,
    vocabularyError
  } = useContext(VocabularyContext);
  const fetchMetadataBySubject = useCallback(subject => MetadataAPI.getDict({
    subject,
    withValueProperties: true
  }).catch(() => {
    throw new Error('An error occurred while loading the metadata');
  }), []);
  const submitLinkedDataChanges = useCallback((subject, values) => MetadataAPI.get({
    subject
  }).then(meta => meta.length && getFirstPredicateValue(meta[0], '@type')).then(type => MetadataAPI.updateEntity(subject, values, vocabulary, type)), [vocabulary]);
  const createLinkedDataEntity = useCallback((subject, values, type) => MetadataAPI.get({
    subject
  }).then(meta => {
    if (meta.length) {
      throw Error(`Entity already exists: ${subject}`);
    }
  }).then(() => MetadataAPI.updateEntity(subject, values, vocabulary, type)).then(() => ({
    subject,
    type,
    values
  })), [vocabulary]);

  const deleteLinkedDataEntity = subject => MetadataAPI.delete(subject);

  const extendProperties = ({
    properties = [],
    isEntityEditable = true
  }) => properties.map(p => ({ ...p,
    isEditable: isEntityEditable && !p.machineOnly
  }));

  const namespaces = getNamespaces(vocabulary, namespace => getFirstPredicateValue(namespace, USABLE_IN_METADATA_URI));
  const shapesError = !vocabularyLoading && vocabularyError && 'An error occurred while loading the vocabulary';
  return <LinkedDataContext.Provider value={{ ...otherProps,
    // Backend interactions
    fetchLinkedDataForSubject: fetchMetadataBySubject,
    createLinkedDataEntity,
    deleteLinkedDataEntity,
    submitLinkedDataChanges,
    // Fixed properties
    hasEditRight: true,
    requireIdentifier: true,
    namespaces,
    // Generic methods without reference to shapes
    extendProperties,
    valueComponentFactory,
    shapes: vocabulary,
    shapesError
  }}>
            {children}
        </LinkedDataContext.Provider>;
};

export default LinkedDataMetadataProvider;