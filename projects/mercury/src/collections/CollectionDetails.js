// @flow
import React, {useContext} from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    Grid,
    IconButton,
    Menu,
    MenuItem,
    Typography,
    withStyles
} from '@material-ui/core';
import {CloudDownload, FolderOpen, MoreVert} from '@material-ui/icons';
import {useHistory, withRouter} from 'react-router-dom';

import CollectionEditor from "./CollectionEditor";
import type {AccessMode, Collection, Resource, Status} from './CollectionAPI';
import CollectionsContext from './CollectionsContext';
import type {History} from '../types';
import UserContext from '../users/UserContext';
import WorkspaceContext from "../workspaces/WorkspaceContext";
import type {Workspace} from "../workspaces/WorkspacesAPI";
import {isAdmin} from "../users/userUtils";
import ErrorDialog from "../common/components/ErrorDialog";
import LoadingInlay from "../common/components/LoadingInlay";
import ConfirmationDialog from "../common/components/ConfirmationDialog";
import CollaboratorsCard from "../permissions/CollaboratorsCard";
import CollectionShareCard from "../permissions/SharesCard";
import MessageDisplay from "../common/components/MessageDisplay";
import UsersContext from "../users/UsersContext";
import WorkspaceUserRolesContext, {WorkspaceUserRolesProvider} from "../workspaces/WorkspaceUserRolesContext";
import {camelCaseToWords} from "../common/utils/genericUtils";
import CollectionPropertyChangeDialog from "./CollectionPropertyChangeDialog";
import CollectionOwnerChangeDialog from "./CollectionOwnerChangeDialog";

import {accessModes, statuses} from './CollectionAPI';

export const ICONS = {
    LOCAL_STORAGE: <FolderOpen aria-label="Local storage" />,
    AZURE_BLOB_STORAGE: <CloudDownload />,
    S3_BUCKET: <CloudDownload />,
    GOOGLE_CLOUD_BUCKET: <CloudDownload />
};

const DEFAULT_COLLECTION_TYPE = 'LOCAL_STORAGE';

const styles = {
    propertyLabel: {
        color: 'gray'
    },
    propertyText: {
        fontSize: 'small',
        marginTop: 2,
        marginBottom: 0,
        marginInlineStart: 4
    },
    propertyDetails: {
        marginLeft: 8
    }
};

type CollectionDetailsProps = {
    loading: boolean;
    collection: Collection;
    workspaces: Array<Workspace>;
    currentUser: any;
    inCollectionsBrowser: boolean;
    deleteCollection: (Resource) => Promise<void>;
    undeleteCollection: (Resource) => Promise<void>;
    setAccessMode: (location: string, mode: AccessMode) => Promise<void>;
    setStatus: (location: string, status: Status) => Promise<void>;
    setOwnedBy: (location: string, owner: string) => Promise<void>;
    setBusy: (boolean) => void;
    history: History;
    classes: any;
};

type CollectionDetailsState = {
    editing: boolean;
    changingAccessMode: boolean,
    changingStatus: boolean,
    changingOwner: boolean,
    deleting: boolean;
    undeleting: boolean;
    anchorEl: any;
}

class CollectionDetails extends React.Component<CollectionDetailsProps, CollectionDetailsState> {
    static defaultProps = {
        inCollectionsBrowser: false,
        setBusy: () => {}
    };

    state = {
        editing: false,
        changingAccessMode: false,
        changingStatus: false,
        changingOwner: false,
        anchorEl: null,
        deleting: false,
        undeleting: false
    };

    handleEdit = () => {
        if (this.props.collection.canWrite) {
            this.setState({editing: true});
            this.handleMenuClose();
        }
    };

    handleChangeAccessMode = () => {
        if (this.props.collection.canManage) {
            this.setState({changingAccessMode: true});
            this.handleMenuClose();
        }
    };

    handleChangeStatus = () => {
        if (this.props.collection.canManage) {
            this.setState({changingStatus: true});
            this.handleMenuClose();
        }
    };

    handleChangeOwner = () => {
        if (this.props.collection.canManage) {
            this.setState({changingOwner: true});
            this.handleMenuClose();
        }
    };

    handleDelete = () => {
        if (this.props.collection.canManage) {
            this.setState({deleting: true});
            this.handleMenuClose();
        }
    };

    handleUndelete = () => {
        if (this.props.collection.canWrite) {
            this.setState({undeleting: true});
            this.handleMenuClose();
        }
    };

    handleCloseDelete = () => {
        this.setState({deleting: false});
    };

    handleCloseUndelete = () => {
        this.setState({undeleting: false});
    };

    handleMenuClick = (event: Event) => {
        this.setState({anchorEl: event.currentTarget});
    };

    handleMenuClose = () => {
        this.setState({anchorEl: null});
    };

    handleCollectionDelete = (collection: Collection) => {
        const {setBusy, deleteCollection, history} = this.props;
        setBusy(true);
        this.handleCloseDelete();
        deleteCollection(collection)
            .then(() => history.push('/collections'))
            .catch(err => ErrorDialog.showError(
                err,
                "An error occurred while deleting a collection",
                () => this.handleCollectionDelete(collection)
            ))
            .finally(() => setBusy(false));
    };

    handleCollectionUndelete = (collection: Collection) => {
        const {setBusy, undeleteCollection, history} = this.props;
        setBusy(true);
        this.handleCloseUndelete();
        undeleteCollection(collection)
            .then(() => history.push('/collections'))
            .catch(err => ErrorDialog.showError(
                err,
                "An error occurred while undeleting a collection",
                () => this.handleCollectionUndelete(collection)
            ))
            .finally(() => setBusy(false));
    };

    renderCollectionProperty = (property: string, value: string) => (
        <Grid container direction="row">
            <Grid item xs={2}>
                <p className={`${this.props.classes.propertyLabel} ${this.props.classes.propertyText}`}>
                    {property}:
                </p>
            </Grid>
            <Grid item xs>
                <p className={this.props.classes.propertyText}>
                    {camelCaseToWords(value)}
                </p>
            </Grid>
        </Grid>
    );

    renderCollectionDescription = () => (
        <Typography component="p" className={this.props.classes.propertyText}>
            {this.props.collection.description}
        </Typography>
    );

    renderCollectionAccessMode = () => (
        this.props.collection.accessMode && this.renderCollectionProperty('Access mode', this.props.collection.accessMode)
    );

    renderCollectionStatus = () => (
        this.props.collection.status && this.renderCollectionProperty('Status', this.props.collection.status)
    );

    render() {
        const {loading, error, collection, users, workspaceRoles, workspaces, inCollectionsBrowser = false} = this.props;
        const {anchorEl, editing, changingAccessMode, changingStatus, changingOwner, deleting, undeleting} = this.state;
        const iconName = collection.type && ICONS[collection.type] ? collection.type : DEFAULT_COLLECTION_TYPE;

        if (error) {
            return (<MessageDisplay message="An error occurred loading collection details." />);
        }

        if (loading) {
            return <LoadingInlay />;
        }
        const workspaceUsers = users.filter(u => workspaceRoles.some(r => r.iri === u.iri));

        return (
            <>
                <Card>
                    <CardHeader
                        action={collection.canManage && (
                            <>
                                <IconButton
                                    aria-label="More"
                                    aria-owns={anchorEl ? 'long-menu' : undefined}
                                    aria-haspopup="true"
                                    onClick={this.handleMenuClick}
                                >
                                    <MoreVert />
                                </IconButton>
                                <Menu
                                    id="simple-menu"
                                    anchorEl={anchorEl}
                                    open={Boolean(anchorEl)}
                                    onClose={this.handleMenuClose}
                                >
                                    {!collection.dateDeleted && (
                                        <div>
                                            <MenuItem onClick={this.handleEdit}>
                                                Edit
                                            </MenuItem>
                                            <MenuItem onClick={this.handleChangeAccessMode}>
                                                Change access mode
                                            </MenuItem>
                                            <MenuItem onClick={this.handleChangeStatus}>
                                                Change status
                                            </MenuItem>
                                            <MenuItem onClick={this.handleChangeOwner}>
                                                Transfer ownership
                                            </MenuItem>
                                        </div>
                                    )}
                                    {collection && collection.dateDeleted && isAdmin(this.props.currentUser) ? (
                                        <MenuItem onClick={this.handleDelete}>Delete permanently</MenuItem>
                                    ) : (
                                        <MenuItem onClick={this.handleDelete}>Delete</MenuItem>
                                    )}
                                    {collection.dateDeleted && (
                                        <MenuItem onClick={this.handleUndelete}>
                                            Undelete
                                        </MenuItem>
                                    )}
                                </Menu>
                            </>
                        )}
                        titleTypographyProps={{variant: 'h6'}}
                        title={collection.name}
                        avatar={ICONS[iconName]}
                    />
                    <CardContent style={{paddingTop: 0}}>
                        {this.renderCollectionDescription()}
                        {this.renderCollectionStatus()}
                        {this.renderCollectionAccessMode()}
                    </CardContent>
                </Card>

                <CollaboratorsCard
                    collection={collection}
                    workspaceUsers={workspaceUsers}
                    workspaces={workspaces}
                />
                <CollectionShareCard
                    users={users}
                    workspaceUsers={workspaceUsers}
                    workspaces={workspaces}
                    collection={collection}
                    setBusy={this.props.setBusy}
                />

                {editing ? (
                    <CollectionEditor
                        collection={collection}
                        updateExisting
                        inCollectionsBrowser={inCollectionsBrowser}
                        setBusy={this.props.setBusy}
                        onClose={() => this.setState({editing: false})}
                    />
                ) : null}
                {changingAccessMode ? (
                    <CollectionPropertyChangeDialog
                        collection={collection}
                        title="Select collection access mode"
                        confirmationMessage={`Are you sure you want to change the access mode of collection ${collection.name}`}
                        currentValue={collection.accessMode}
                        availableValues={accessModes.filter(mode => collection.availableAccessModes.includes(mode))}
                        setValue={this.props.setAccessMode}
                        onClose={() => this.setState({changingAccessMode: false})}
                    />
                ) : null}
                {changingStatus ? (
                    <CollectionPropertyChangeDialog
                        collection={collection}
                        title="Select collection status"
                        confirmationMessage={`Are you sure you want to change the status of collection ${collection.name}`}
                        currentValue={collection.status}
                        availableValues={statuses.filter(status => collection.availableStatuses.includes(status))}
                        setValue={this.props.setStatus}
                        onClose={() => this.setState({changingStatus: false})}
                    />
                ) : null}
                {changingOwner ? (
                    <CollectionOwnerChangeDialog
                        collection={collection}
                        workspaces={workspaces}
                        setOwnedBy={this.props.setOwnedBy}
                        onClose={() => this.setState({changingOwner: false})}
                    />
                ) : null}
                {undeleting ? (
                    <ConfirmationDialog
                        open
                        title="Confirmation"
                        content={`Undelete collection ${collection.name}`}
                        dangerous
                        agreeButtonText="Undelete"
                        onAgree={() => this.handleCollectionUndelete(this.props.collection)}
                        onDisagree={this.handleCloseUndelete}
                        onClose={this.handleCloseUndelete}
                    />
                ) : null}
                {deleting && collection.dateDeleted && (
                    <ConfirmationDialog
                        open
                        title="Confirmation"
                        content={`Collection ${collection.name} is already marked as deleted.`
                        + " Are you sure you want to delete it permanently?"}
                        dangerous
                        agreeButtonText="Delete permanently"
                        onAgree={() => this.handleCollectionDelete(this.props.collection)}
                        onDisagree={this.handleCloseDelete}
                        onClose={this.handleCloseDelete}
                    />
                )}
                {deleting && !collection.dateDeleted && (
                    <ConfirmationDialog
                        open
                        title="Confirmation"
                        content={`Delete collection ${collection.name}`}
                        dangerous
                        agreeButtonText="Delete"
                        onAgree={() => this.handleCollectionDelete(this.props.collection)}
                        onDisagree={this.handleCloseDelete}
                        onClose={this.handleCloseDelete}
                    />
                )}
            </>
        );
    }
}

const ContextualCollectionDetails = (props) => {
    const history = useHistory();
    const {currentUser} = useContext(UserContext);
    const {users} = useContext(UsersContext);
    const {deleteCollection, undeleteCollection, setAccessMode, setStatus, setOwnedBy} = useContext(CollectionsContext);
    const {workspaces, workspacesError, workspacesLoading} = useContext(WorkspaceContext);

    return (
        <WorkspaceUserRolesProvider iri={props.collection.ownerWorkspace}>
            <WorkspaceUserRolesContext.Consumer>
                {({workspaceRoles, workspaceRolesError, workspaceRolesLoading}) => (
                    <CollectionDetails
                        {...props}
                        error={props.error || workspacesError || workspaceRolesError}
                        loading={props.loading || workspacesLoading || workspaceRolesLoading}
                        currentUser={currentUser}
                        users={users}
                        workspaceRoles={workspaceRoles}
                        workspaces={workspaces}
                        history={history}
                        deleteCollection={deleteCollection}
                        undeleteCollection={undeleteCollection}
                        setAccessMode={setAccessMode}
                        setStatus={setStatus}
                        setOwnedBy={setOwnedBy}
                    />
                )}
            </WorkspaceUserRolesContext.Consumer>
        </WorkspaceUserRolesProvider>
    );
};

export default withRouter(withStyles(styles)(ContextualCollectionDetails));
