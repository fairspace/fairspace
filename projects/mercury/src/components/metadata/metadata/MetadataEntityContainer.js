import React from 'react';
import {connect} from 'react-redux';
import {Button} from '@material-ui/core';

import * as metadataActions from "../../../actions/metadataActions";
import * as vocabularyActions from "../../../actions/vocabularyActions";
import {getTypeInfo, isDateTimeProperty, linkLabel, propertiesToShow, url2iri} from "../../../utils/metadataUtils";
import {
    getCombinedMetadataForSubject,
    hasMetadataError,
    isMetadataPending
} from "../../../reducers/cache/jsonLdBySubjectReducers";
import {getVocabulary, hasVocabularyError, isVocabularyPending} from "../../../reducers/cache/vocabularyReducers";
import LinkedDataEntityForm from "../common/LinkedDataEntityForm";

const MetadataEntityContainer = (props) => (
    <LinkedDataEntityForm {...props}>
        {
            (onSubmit, actionButtonDisabled, actionButtonVisibility) => (
                <Button
                    onClick={onSubmit}
                    color="primary"
                    disabled={actionButtonDisabled}
                    style={{visibility: actionButtonVisibility}}
                >
                    Update
                </Button>
            )
        }
    </LinkedDataEntityForm>
);

const mapStateToProps = (state, ownProps) => {
    const subject = ownProps.subject || url2iri(window.location.href);
    const metadata = getCombinedMetadataForSubject(state, subject);
    const vocabulary = getVocabulary(state);

    const hasNoMetadata = !metadata || metadata.length === 0;
    const hasOtherErrors = hasMetadataError(state, subject) || hasVocabularyError(state);
    const error = hasNoMetadata || hasOtherErrors ? 'An error occurred while loading metadata.' : '';

    const typeInfo = getTypeInfo(metadata);
    const label = linkLabel(subject);
    const editable = Object.prototype.hasOwnProperty.call(ownProps, "editable") ? ownProps.editable : true;

    const properties = hasNoMetadata ? [] : propertiesToShow(metadata)
        .map(p => ({
            ...p,
            editable: editable && !isDateTimeProperty(p)
        }));

    return {
        loading: isMetadataPending(state, subject) || isVocabularyPending(state),
        error,

        properties,
        subject,

        typeInfo,
        label,
        showHeader: ownProps.showHeader || false,
        editable,
        vocabulary
    };
};

const mapDispatchToProps = {
    fetchShapes: vocabularyActions.fetchMetadataVocabularyIfNeeded,
    fetchLinkedData: metadataActions.fetchMetadataBySubjectIfNeeded,
    updateEntity: metadataActions.updateEntity
};

export default connect(mapStateToProps, mapDispatchToProps)(MetadataEntityContainer);
