import React, {useContext, useState} from 'react';
import PropTypes from "prop-types";
import ExpandMore from "@material-ui/icons/ExpandMore";
import {Avatar, Card, CardContent, CardHeader, Collapse, IconButton, withStyles} from "@material-ui/core";
import classnames from "classnames";

import LockOpen from "@material-ui/icons/LockOpen";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import FormControl from "@material-ui/core/FormControl";
import FormHelperText from "@material-ui/core/FormHelperText";
import InputLabel from "@material-ui/core/InputLabel";
import PermissionViewer from "./PermissionViewer";
import {camelCaseToWords} from "../common/utils/genericUtils";
import CollectionsContext from "../collections/CollectionsContext";
import ConfirmationDialog from "../common/components/ConfirmationDialog";
import ErrorDialog from "../common/components/ErrorDialog";
import {accessLevels} from "../collections/CollectionAPI";
import {getAccessModeDescription, getPrincipalsWithCollectionAccess} from "../collections/collectionUtils";

const styles = theme => ({
    expand: {
        transform: 'rotate(0deg)',
        marginLeft: 'auto',
        transition: theme.transitions.create('transform', {
            duration: theme.transitions.duration.shortest,
        }),
    },
    expandOpen: {
        transform: 'rotate(180deg)',
    },
    permissionsCard: {
        marginTop: 10
    },
    avatar: {
        width: 20,
        height: 20,
        display: 'inline-block',
        verticalAlign: 'middle',
        margin: '0 4px'
    },
    additionalCollaborators: {
        display: 'inline-block',
        lineHeight: '20px',
        verticalAlign: 'middle',
        margin: '0 4px'
    },
    label: {
        fontWeight: 'bold'
    },
    propertyText: {
        marginTop: 2,
        marginBottom: 0,
        marginInlineStart: 4,
        width: '100%'
    },
    propertyDiv: {
        marginLeft: 16,
        marginRight: 16,
        marginBottom: 16
    }
});

export const PermissionCard = ({classes, collection, users, workspaceUsers, workspaces, maxCollaboratorIcons = 5, setBusy}) => {
    const [expanded, setExpanded] = useState(false);
    const [changingAccessMode, setChangingAccessMode] = useState(false);
    const [selectedAccessMode, setSelectedAccessMode] = useState(collection.accessMode);

    const ownerWorkspaceAccess = collection.workspacePermissions.find(p => p.iri === collection.ownerWorkspace)
        ? collection.workspacePermissions.find(p => p.iri === collection.ownerWorkspace).access : "None";
    const [changingOwnerWorkspaceAccess, setChangingOwnerWorkspaceAccess] = useState(false);
    const [selectedOwnerWorkspaceAccess, setSelectedOwnerWorkspaceAccess] = useState(ownerWorkspaceAccess);
    const {setAccessMode, setPermission} = useContext(CollectionsContext);

    const toggleExpand = () => setExpanded(!expanded);
    const collaboratingUsers = getPrincipalsWithCollectionAccess(users, collection.userPermissions);
    const collaboratingWorkspaces = getPrincipalsWithCollectionAccess(workspaces, collection.workspacePermissions);

    const availableWorkspaceMembersAccessLevels = accessLevels.filter(a => a !== "List");

    const handleSetAccessMode = (event) => {
        if (collection.canManage) {
            setSelectedAccessMode(event.target.value);
            setChangingAccessMode(true);
        }
    };

    const handleCancelSetAccessMode = () => {
        setChangingAccessMode(false);
    };

    const handleConfirmSetAccessMode = () => {
        setBusy(true);
        setAccessMode(collection.location, selectedAccessMode)
            .then(handleCancelSetAccessMode)
            .catch(err => ErrorDialog.showError(
                err,
                "An error occurred while setting an access mode",
                () => handleConfirmSetAccessMode()
            ))
            .finally(setBusy(false));
    };

    const handleSetOwnerWorkspaceAccess = (event) => {
        if (collection.canManage) {
            setSelectedOwnerWorkspaceAccess(event.target.value);
            setChangingOwnerWorkspaceAccess(true);
        }
    };

    const handleCancelSetOwnerWorkspaceAccess = () => {
        setChangingOwnerWorkspaceAccess(false);
    };

    const handleConfirmSetOwnerWorkspaceAccess = () => {
        setBusy(true);
        setPermission(collection.location, collection.ownerWorkspace, selectedOwnerWorkspaceAccess)
            .then(handleCancelSetOwnerWorkspaceAccess)
            .catch(err => ErrorDialog.showError(
                err,
                "An error occurred while setting an access level",
                () => handleConfirmSetOwnerWorkspaceAccess()
            ))
            .finally(setBusy(false));
    };

    const permissionIcons = collaboratingUsers
        .slice(0, maxCollaboratorIcons)
        .map(({iri, name}) => (
            <Avatar
                key={iri}
                title={name}
                src="/public/images/avatar.png"
                className={classes.avatar}
            />
        ));

    const cardHeaderAction = (
        <>
            {permissionIcons}
            {collaboratingUsers.length > maxCollaboratorIcons ? (
                <div className={classes.additionalCollaborators}>
                    + {collaboratingUsers.length - maxCollaboratorIcons}
                </div>
            ) : ''}
            <IconButton
                className={classnames(classes.expand, {
                    [classes.expandOpen]: expanded,
                })}
                onClick={toggleExpand}
                aria-expanded={expanded}
                aria-label="Show more"
                title="Access"
            >
                <ExpandMore />
            </IconButton>
        </>
    );

    const renderAccessModeChangeConfirmation = () => (
        <ConfirmationDialog
            open
            title="Confirmation"
            content={`Are you sure you want to change the view mode of ${collection.name} to ${selectedAccessMode}?`}
            dangerous
            agreeButtonText="Confirm"
            onAgree={handleConfirmSetAccessMode}
            onDisagree={handleCancelSetAccessMode}
            onClose={handleCancelSetAccessMode}
        />
    );

    const renderAccessMode = () => (
        <div className={classes.propertyDiv}>
            <FormControl className={classes.propertyText}>
                <InputLabel className={classes.label}>View mode:</InputLabel>
                <Select
                    value={collection.accessMode}
                    onChange={mode => handleSetAccessMode(mode)}
                    inputProps={{'aria-label': 'View mode'}}
                    disabled={!collection.canManage}
                >
                    {collection.availableAccessModes.map(mode => (
                        <MenuItem key={mode} value={mode}>
                            <span style={{marginRight: 10}}>{camelCaseToWords(mode)}</span>
                            <FormHelperText>{getAccessModeDescription(mode)}</FormHelperText>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </div>
    );

    const renderOwnerWorkspaceAccessChangeConfirmation = () => (
        <ConfirmationDialog
            open
            title="Confirmation"
            content={`Are you sure you want to change all workspace members access to ${selectedOwnerWorkspaceAccess} for ${collection.name} collection?`}
            dangerous
            agreeButtonText="Confirm"
            onAgree={handleConfirmSetOwnerWorkspaceAccess}
            onDisagree={handleCancelSetOwnerWorkspaceAccess}
            onClose={handleCancelSetOwnerWorkspaceAccess}
        />
    );

    const renderOwnerWorkspaceAccess = () => (
        <div className={classes.propertyDiv}>
            <FormControl className={classes.propertyText}>
                <InputLabel className={classes.label}>Default access for all workspace members:</InputLabel>
                <Select
                    value={ownerWorkspaceAccess}
                    onChange={access => handleSetOwnerWorkspaceAccess(access)}
                    inputProps={{'aria-label': 'Owner workspace access'}}
                    disabled={!collection.canManage}
                >
                    {availableWorkspaceMembersAccessLevels.map(access => (
                        <MenuItem key={access} value={access}>
                            <span style={{marginRight: 10}}>{access}</span>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </div>
    );

    return (
        <Card classes={{root: classes.permissionsCard}}>
            <CardHeader
                action={cardHeaderAction}
                titleTypographyProps={{variant: 'h6'}}
                title="Access"
                avatar={(
                    <LockOpen />
                )}
                subheader="Share the collection with users and workspaces."
            />
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <CardContent style={{paddingTop: 0}}>
                    {renderAccessMode()}
                    {renderOwnerWorkspaceAccess()}
                    <PermissionViewer
                        collection={collection}
                        collaboratingUsers={collaboratingUsers}
                        collaboratingWorkspaces={collaboratingWorkspaces}
                        workspaceUsers={workspaceUsers}
                    />
                </CardContent>
                {changingAccessMode && renderAccessModeChangeConfirmation()}
                {changingOwnerWorkspaceAccess && renderOwnerWorkspaceAccessChangeConfirmation()}
            </Collapse>
        </Card>
    );
};

PermissionCard.propTypes = {
    classes: PropTypes.object,
    collection: PropTypes.object.isRequired,
    users: PropTypes.array.isRequired,
    workspaceUsers: PropTypes.array.isRequired,
    workspaces: PropTypes.array.isRequired,
    maxCollaboratorIcons: PropTypes.number,
    setBusy: PropTypes.func
};

export default withStyles(styles)(PermissionCard);
