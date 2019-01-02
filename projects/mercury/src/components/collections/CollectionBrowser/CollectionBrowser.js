import React from 'react';
import {withRouter} from "react-router-dom";
import {connect} from 'react-redux';
import Fab from "@material-ui/core/Fab";
import Icon from "@material-ui/core/Icon";
import BreadCrumbs from "../../generic/BreadCrumbs/BreadCrumbs";
import ErrorDialog from "../../error/ErrorDialog";
import ErrorMessage from "../../error/ErrorMessage";
import CollectionList from "../CollectionList/CollectionList";
import * as collectionBrowserActions from "../../../actions/collectionbrowser";
import * as collectionActions from "../../../actions/collections";
import GenericCollectionsScreen from "../GenericCollectionsScreen/GenericCollectionsScreen";
import CollectionEditor from "../CollectionList/CollectionEditor";
import {findById} from "../../../utils/arrayutils";
import LoadingInlay from '../../generic/Loading/LoadingInlay';
import LoadingOverlay from '../../generic/Loading/LoadingOverlay';
import Config from "../../../services/Config/Config";

class CollectionBrowser extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            editingCollection: false
        };
    }

    componentDidMount() {
        this.props.fetchCollectionsIfNeeded();
        this.props.closePath();
    }

    handleAddCollectionClick = () => {
        this.setState({editingCollection: true});
    }

    handleCollectionClick = (collection) => {
        const {selectedCollectionId, selectCollection, deselectCollection} = this.props;
        // If this collection is already selected, deselect
        if (selectedCollectionId && selectedCollectionId === collection.id) {
            deselectCollection();
        } else {
            selectCollection(collection.id);
        }
    }

    handleCollectionDelete = (collection) => {
        const {deleteCollection, fetchCollectionsIfNeeded} = this.props;
        deleteCollection(collection.id)
            .then(fetchCollectionsIfNeeded)
            .catch(err => ErrorDialog.showError(
                err,
                "An error occurred while deleting a collection",
                this.handleCollectionDelete
            ));
    }

    handleCollectionDoubleClick = (collection) => {
        this.props.history.push(`/collections/${collection.id}`);
    }

    renderButtons() {
        return (
            <Fab
                mini="true"
                color="secondary"
                aria-label="Add"
                title="Add collection"
                onClick={this.handleAddCollectionClick}
            >
                <Icon>add</Icon>
            </Fab>
        );
    }

    renderLoading() {
        return <LoadingInlay />;
    }

    renderCollectionList() {
        const {
            users, collections, addingCollection, deletingCollection
        } = this.props;
        // TODO: is this required, does it have an effect?
        collections.map(col => col.creatorObj = findById(users, col.creator));

        return (
            <>
                <CollectionList
                    collections={this.props.collections}
                    selectedCollectionId={this.props.selectedCollectionId}
                    onCollectionClick={this.handleCollectionClick}
                    onCollectionDoubleClick={this.handleCollectionDoubleClick}
                    onCollectionDelete={this.handleCollectionDelete}
                />
                <CollectionEditor
                    title="Add collection"
                    name={`${this.props.user.fullName}'s collection`}
                    editing={this.state.editingCollection}
                    onSave={this.handleAddCollection}
                    onCancel={this.handleCancelAddCollection}
                    editType={Config.get().enableExperimentalFeatures}
                />
                <LoadingOverlay loading={addingCollection || deletingCollection} />
            </>
        );
    }

    handleAddCollection = (name, description, type) => {
        this.setState({editingCollection: false});
        this.props.addCollection(name, description, type)
            .then(this.props.fetchCollectionsIfNeeded)
            .catch(err => ErrorDialog.showError(
                err,
                "An error occurred while creating a collection",
                this.handleAddCollectionClick
            ));
    }

    handleCancelAddCollection = () => {
        this.setState({editingCollection: false});
    }

    render() {
        const {loading, error} = this.props;

        if (error) {
            return <ErrorMessage message="An error occurred while loading collections" />;
        }

        return (
            <GenericCollectionsScreen
                breadCrumbs={<BreadCrumbs />}
                buttons={this.renderButtons()}
                main={loading ? this.renderLoading() : this.renderCollectionList()}
            />
        );
    }
}

const mapStateToProps = (state) => ({
    user: state.account.user.data,
    loading: state.cache.collections.pending || state.account.user.pending || state.cache.users.pending,
    error: state.cache.collections.error || state.account.user.error || state.cache.users.error,
    collections: state.cache.collections.data,
    users: state.cache.users.data,
    selectedCollectionId: state.collectionBrowser.selectedCollectionId,
    addingCollection: state.collectionBrowser.addingCollection,
    deletingCollection: state.collectionBrowser.deletingCollection
});

const mapDispatchToProps = {
    ...collectionActions,
    ...collectionBrowserActions
};

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(CollectionBrowser));
