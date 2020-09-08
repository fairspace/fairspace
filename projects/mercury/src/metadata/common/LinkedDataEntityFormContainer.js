import React, {useCallback, useContext, useEffect, useState} from "react";
import PropTypes from "prop-types";
import {Button, CircularProgress, Grid, IconButton} from "@material-ui/core";
import {Edit} from '@material-ui/icons';

import {useDropzone} from "react-dropzone";
import LinkedDataEntityForm from "./LinkedDataEntityForm";
import useFormData from './UseFormData';
import LinkedDataContext from "../LinkedDataContext";
import useFormSubmission from "./UseFormSubmission";
import useNavigationBlocker from "../../common/hooks/UseNavigationBlocker";
import useLinkedData from "./UseLinkedData";
import {DATE_DELETED_URI} from "../../constants";
import ConfirmationDialog from "../../common/components/ConfirmationDialog";
import ErrorDialog from "../../common/components/ErrorDialog";

const LinkedDataEntityFormContainer = ({
    subject, hasEditRight = true, showEditButtons = false, fullpage = false,
    contextMenu = null,
    properties, values, linkedDataLoading, linkedDataError, updateLinkedData, setHasUpdates = () => {}, onUploadMetadata,
    ...otherProps
}) => {
    const isDeleted = values[DATE_DELETED_URI];
    const [editingEnabled, setEditingEnabled] = useState(hasEditRight && !showEditButtons && !isDeleted);
    const {submitLinkedDataChanges, extendProperties} = useContext(LinkedDataContext);

    const {
        addValue, updateValue, deleteValue, clearForm, getUpdates, hasFormUpdates, valuesWithUpdates,
        validateAll, validationErrors, isValid
    } = useFormData(values, properties);

    useEffect(() => setHasUpdates(hasFormUpdates), [hasFormUpdates, setHasUpdates]);

    useEffect(() => {
        setEditingEnabled(hasEditRight && !showEditButtons && !isDeleted);
    }, [hasEditRight, isDeleted, showEditButtons]);

    const [metadataUploading, setMetadataUploading] = useState(false);

    const uploadMetadata = file => {
        setMetadataUploading(true);
        onUploadMetadata(file)
            .catch(e => ErrorDialog.showError(e,"Error uploading metadata"))
            .finally(() => setMetadataUploading(false));
    };

    const onDropMetatata = useCallback(uploadMetadata, []);
    const {getRootProps, getInputProps} = useDropzone({onDropAccepted: (files) => {
        if (files.length === 1) {
            onDropMetatata(files[0]);
        }
    }});

    const {isUpdating, submitForm} = useFormSubmission(
        () => submitLinkedDataChanges(subject, getUpdates())
            .then(() => {
                clearForm();
                updateLinkedData();
            }),
        subject
    );

    const {
        confirmationShown, hideConfirmation, executeNavigation
    } = useNavigationBlocker(hasFormUpdates && editingEnabled);

    // Apply context-specific logic to the properties and filter on visibility
    const extendedProperties = extendProperties({properties, subject, isEntityEditable: editingEnabled});
    const validateAndSubmit = () => {
        const hasErrors = validateAll(extendedProperties);

        if (!hasErrors) submitForm();
    };

    const formId = `entity-form-${subject}`;
    let footer;
    if (isUpdating) {
        footer = <CircularProgress />;
    } else if (editingEnabled) {
        footer = (
            <div>
                <Button
                    type="submit"
                    form={formId}
                    variant={fullpage ? 'contained' : 'text'}
                    color="primary"
                    onClick={validateAndSubmit}
                    disabled={!hasFormUpdates || !isValid}
                >
                    Update
                </Button>
                <Button
                    color="default"
                    onClick={() => clearForm()}
                    disabled={!hasFormUpdates}
                >Cancel
                </Button>
                {onUploadMetadata && (
                    <Button {...getRootProps()} disabled={metadataUploading}>
                        <input {...getInputProps()} />
                        Upload metadata
                        {metadataUploading && (<CircularProgress size={16} />)}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <Grid container direction="row">
            <Grid item xs={11}>
                <Grid container>
                    <Grid item xs={12}>
                        <LinkedDataEntityForm
                            {...otherProps}
                            id={formId}
                            editable={editingEnabled}
                            onSubmit={validateAndSubmit}
                            errorMessage={linkedDataError}
                            loading={linkedDataLoading}
                            properties={extendedProperties}
                            values={valuesWithUpdates}
                            validationErrors={validationErrors}
                            onAdd={addValue}
                            onChange={updateValue}
                            onDelete={deleteValue}
                        />
                    </Grid>
                    {footer && <Grid item>{footer}</Grid>}
                </Grid>
                {confirmationShown && (
                    <ConfirmationDialog
                        open
                        title="Unsaved changes"
                        content={'You have unsaved changes, are you sure you want to navigate away?'
                        + ' Your pending changes will be lost.'}
                        agreeButtonText="Navigate"
                        disagreeButtonText="back to form"
                        onAgree={() => executeNavigation()}
                        onDisagree={hideConfirmation}
                    />
                )}
            </Grid>
            <Grid item xs={1} align="right">
                {showEditButtons && !editingEnabled && (
                    <IconButton
                        aria-label="Edit"
                        onClick={() => {
                            setEditingEnabled(true);
                        }}
                    ><Edit />
                    </IconButton>
                )}
                {!editingEnabled && contextMenu}
            </Grid>
        </Grid>
    );
};

LinkedDataEntityFormContainer.propTypes = {
    subject: PropTypes.string.isRequired,
    hasEditRight: PropTypes.bool,
};

export const LinkedDataEntityFormWithLinkedData = (
    {subject, hasEditRight, setHasCollectionMetadataUpdates, onUploadMetadata}
) => {
    const {properties, values, linkedDataLoading, linkedDataError, updateLinkedData} = useLinkedData(subject);

    return (
        <LinkedDataEntityFormContainer
            subject={subject}
            hasEditRight={hasEditRight}
            properties={properties}
            values={values}
            linkedDataLoading={linkedDataLoading}
            linkedDataError={linkedDataError}
            updateLinkedData={updateLinkedData}
            setHasUpdates={setHasCollectionMetadataUpdates}
            onUploadMetadata={onUploadMetadata}
        />
    );
};

export default LinkedDataEntityFormContainer;
