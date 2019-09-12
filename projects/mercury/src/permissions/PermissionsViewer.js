import React, {useState} from 'react';
import {Button, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Menu} from "@material-ui/core";
import MenuItem from "@material-ui/core/MenuItem/MenuItem";
import MoreIcon from '@material-ui/icons/MoreVert';
import {LoadingInlay, MessageDisplay} from '@fairspace/shared-frontend';

import {ConfirmationDialog, LoadingOverlay} from "../common/components";
import AlterPermissionContainer from "./AlterPermissionContainer";
import {canAlterPermission, sortPermissions} from '../common/utils/permissionUtils';

const PermissionsViewer = ({
    permissions, error, loading, altering, iri,
    alterPermission, canManage, currentUser
}) => {
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
    const [selectedPermission, setSelectedPermission] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);

    const handleAlterPermission = ({user, access}) => {
        setShowPermissionDialog(true);
        setSelectedPermission({user, access});
        setAnchorEl(null);
    };

    const handleShareWithDialogClose = () => {
        setShowPermissionDialog(false);
        setSelectedPermission(null);
    };

    const handleRemoveCollaborator = ({user, access}) => {
        setShowConfirmDeleteDialog(true);
        setSelectedPermission({user, access});
        setAnchorEl(null);
    };

    const handleCloseConfirmDeleteDialog = () => {
        setShowConfirmDeleteDialog(false);
    };

    const handleDeleteCollaborator = () => {
        if (selectedPermission) {
            alterPermission(selectedPermission.user, iri, 'None');
            handleCloseConfirmDeleteDialog();
        }
    };

    const handleMenuClick = (event, permission) => {
        setAnchorEl(event.currentTarget);
        setSelectedPermission(permission);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedPermission(null);
    };

    const renderCollaboratorList = () => {
        const selectedPermissionKey = selectedPermission
            ? selectedPermission.access + selectedPermission.user
            : null;

        return sortPermissions(permissions)
            .map((permission) => {
                const key = permission.access + permission.user;
                return (
                    <ListItem
                        key={key}
                    >
                        <ListItemText primary={permission.userName} secondary={permission.access} />
                        <ListItemSecondaryAction>
                            <IconButton
                                onClick={e => handleMenuClick(e, permission)}
                                disabled={!canAlterPermission(canManage, permission, currentUser)}
                            >
                                <MoreIcon />
                            </IconButton>
                            <Menu
                                id="more-menu"
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl) && key === selectedPermissionKey}
                                onClose={handleMenuClose}
                            >
                                <MenuItem
                                    onClick={() => handleAlterPermission(permission)}
                                >
                                    Change access
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleRemoveCollaborator(permission)}
                                >
                                    Delete
                                </MenuItem>
                            </Menu>
                        </ListItemSecondaryAction>
                    </ListItem>
                );
            });
    };

    const renderUserList = () => (
        <List dense disablePadding>
            {renderCollaboratorList(permissions)}
            {canManage && (
                <Button
                    variant="text"
                    title="Add a collaborator"
                    aria-label="Add"
                    onClick={() => handleAlterPermission({})}
                    disabled={!canManage}
                >
                    Add
                </Button>
            )}
        </List>
    );

    const renderPermissionDialog = () => (
        <AlterPermissionContainer
            open={showPermissionDialog}
            alterPermission={alterPermission}
            onClose={handleShareWithDialogClose}
            user={selectedPermission && selectedPermission.user}
            access={selectedPermission && selectedPermission.access}
            iri={iri}
            currentUser={currentUser}
        />
    );

    const renderConfirmationDialog = () => {
        // TODO: Refactor variable naming: user vs iri vs id.
        // TODO: Use descriptive variable names. E.g. user.userName contains the fullName of the user
        const user = (selectedPermission && permissions.find(p => p.user === selectedPermission.user)) || {};
        const content = `Are you sure you want to remove "${user.userName}" from the collaborator list?`;

        return (
            <ConfirmationDialog
                open={showConfirmDeleteDialog}
                title="Confirmation"
                content={content}
                onAgree={handleDeleteCollaborator}
                onDisagree={handleCloseConfirmDeleteDialog}
                onClose={handleCloseConfirmDeleteDialog}
            />
        );
    };

    if (error) {
        return (<MessageDisplay message="An error occurred loading permissions" />);
    } if (loading) {
        return (<LoadingInlay />);
    } if (altering) {
        return (<LoadingOverlay loading />);
    } if (!permissions) {
        return (<div>No permission found</div>);
    }

    return (
        <>
            {renderPermissionDialog()}
            {renderConfirmationDialog()}
            {renderUserList()}
        </>
    );
};

PermissionsViewer.defaultProps = {
    renderPermissionsDialog: () => {}
};

export default PermissionsViewer;
