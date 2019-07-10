import React from "react";
import PropTypes from "prop-types";
import {Button} from "@material-ui/core";

import LinkedDataShapeChooserDialog from "./LinkedDataShapeChooserDialog";
import {LoadingOverlay} from "../../common";
import NewLinkedDataEntityDialog from "./NewLinkedDataEntityDialog";
import {getFirstPredicateId} from "../../../utils/linkeddata/jsonLdUtils";
import {SHACL_TARGET_CLASS} from "../../../constants";

class LinkedDataCreator extends React.Component {
    static CREATION_STATE_CHOOSE_SHAPE = 'CHOOSE_SHAPE';

    static CREATION_STATE_CREATE_ENTITY = 'CREATE_ENTITY';

    state = {
        shape: null,
        creationState: null
    };

    unMounted = false;

    componentWillUnmount() {
        this.unMounted = true;
    }

    startCreating = (e) => {
        e.stopPropagation();

        this.setState({creationState: LinkedDataCreator.CREATION_STATE_CHOOSE_SHAPE});
    };

    chooseShape = (shape) => {
        this.setState({
            shape,
            creationState: LinkedDataCreator.CREATION_STATE_CREATE_ENTITY
        });
    };

    closeDialog = (e) => {
        if (e) e.stopPropagation();
        this.setState({creationState: false});
    };

    handleEntityCreation = (formKey, shape, id) => {
        this.setState({creatingMetadataEntity: true});

        const {create, onEntityCreationError} = this.props;
        const type = getFirstPredicateId(shape, SHACL_TARGET_CLASS);

        create(formKey, id, type)
            .catch(e => onEntityCreationError(e, id))
            .finally(() => {
                if (!this.unMounted) {
                    this.setState({creatingMetadataEntity: false});
                }
            });
    };

    render() {
        // TODO: don't forget isEditable
        const {children, loading, isEditable, shapes, requireIdentifier} = this.props;
        const {creationState, shape, creatingMetadataEntity} = this.state;

        return (
            <>
                {isEditable
                    ? (
                        <Button
                            variant="contained"
                            color="primary"
                            aria-label="Add"
                            title="Create a new metadata entity"
                            onClick={this.startCreating}
                            style={{margin: '10px 0'}}
                            disabled={loading || !shapes}
                        >
                            Create
                        </Button>
                    )
                    : null
                }

                <LinkedDataShapeChooserDialog
                    open={creationState === LinkedDataCreator.CREATION_STATE_CHOOSE_SHAPE}
                    shapes={shapes}
                    onChooseShape={this.chooseShape}
                    onClose={this.closeDialog}
                />


                {creationState === LinkedDataCreator.CREATION_STATE_CREATE_ENTITY && (
                    <NewLinkedDataEntityDialog
                        shape={shape}
                        onCreate={this.handleEntityCreation}
                        onClose={this.closeDialog}
                        requireIdentifier={requireIdentifier}
                    />
                )}

                {children}

                <LoadingOverlay loading={creatingMetadataEntity} />
            </>
        );
    }
}

LinkedDataCreator.propTypes = {
    create: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    shapes: PropTypes.array,
    isEditable: PropTypes.bool,
    requireIdentifier: PropTypes.bool,
};

LinkedDataCreator.defaultProps = {
    isEditable: true,
    requireIdentifier: true
};

export default LinkedDataCreator;
