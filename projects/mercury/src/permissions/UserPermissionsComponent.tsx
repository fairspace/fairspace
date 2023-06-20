// @flow
import React, {useContext, useState} from 'react';
import {IconButton} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import {Add} from "@mui/icons-material";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import PropTypes from "prop-types";
import ErrorDialog from "../common/components/ErrorDialog";
import ConfirmationDialog from "../common/components/ConfirmationDialog";
import UsersContext from "../users/UsersContext";
import {sortPermissions} from "../collections/collectionUtils";
import AlterUserPermissionsDialog from "./AlterUserPermissionsDialog";
import UserPermissionsTable from "./UserPermissionsTable";
import type {Permission, Principal, PrincipalPermission} from "../collections/CollectionAPI";

const styles = {
    tableWrapper: {
        border: "1px solid #e0e0e0",
        borderRadius: 6,
        marginTop: 16,
        display: 'table',
        width: '99%'
    },
    header: {
        backgroundColor: "#f5f5f5",
        color: "black",
        fontWeight: "normal",
        display: "flex",
        paddingTop: 0,
        paddingBottom: 0,
        height: 35,
        minHeight: 35
    },
    addButton: {
        marginLeft: "auto",
        paddingTop: 0,
        paddingBottom: 0
    }
};

export const UserPermissionsComponent = ({permissions, setPermission, collection, currentUser, workspaceUsers, users, classes}) => {
    const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
    const [showConfirmChangeDialog, setShowConfirmChangeDialog] = useState(false);
    const [showAlterUserPermissionsDialog, setShowAlterUserPermissionsDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState();

    const isWorkspaceMember: boolean = (user: Principal) => user && workspaceUsers.some(u => u.iri === user.iri);
    const sortedPermissions = sortPermissions(permissions);
    const prioritizedSortedPermissions = [
        ...sortedPermissions.filter(p => isWorkspaceMember(p)),
        ...sortedPermissions.filter(p => !isWorkspaceMember(p))
    ];
    const permissionCandidates: PrincipalPermission[] = users.filter(p => !sortedPermissions.some(c => c.iri === p.iri));

    const handleDeletePermission = (permission: Permission) => {
        setSelectedUser(permission);
        setShowConfirmDeleteDialog(true);
    };

    const handleCloseConfirmDeleteDialog = () => {
        setShowConfirmDeleteDialog(false);
    };

    const handleChangePermission = (permission: Permission) => {
        setSelectedUser(permission);
        setShowConfirmChangeDialog(true);
    };

    const handleCloseConfirmChangeDialog = () => {
        setShowConfirmChangeDialog(false);
    };

    const handleAlterUserPermissionsDialogShow = () => {
        setShowAlterUserPermissionsDialog(true);
    };

    const handleUserPermissionsDialogClose = () => {
        setShowAlterUserPermissionsDialog(false);
    };

    const removePermission = (permission: Permission) => {
        setPermission(collection.name, permission.iri, 'None')
            .catch(err => ErrorDialog.showError('Error removing permission.', err))
            .finally(handleCloseConfirmDeleteDialog);
    };

    const changePermission = (permission: Permission) => {
        setPermission(collection.name, permission.iri, permission.access)
            .catch(err => ErrorDialog.showError('Error changing permissions.', err))
            .finally(handleCloseConfirmChangeDialog);
    };

    const renderHeader = () => (
        <Toolbar className={classes.header}>
            {collection.canManage && (
                <Tooltip title="Add users">
                    <IconButton
                        color="primary"
                        aria-label="add user permission"
                        className={classes.addButton}
                        onClick={() => handleAlterUserPermissionsDialogShow()}
                        size="medium"
                    >
                        <Add />
                    </IconButton>
                </Tooltip>
            )}
        </Toolbar>
    );

    const renderPermissionTable = () => (
        <UserPermissionsTable
            selectedPermissions={prioritizedSortedPermissions}
            emptyPermissionsText="Collection is not shared with any user."
            workspaceUsers={workspaceUsers}
            setSelectedPermissions={setPermission}
            canManage={collection.canManage}
            currentUser={currentUser}
            handleDeletePermission={handleDeletePermission}
            handleChangePermission={handleChangePermission}
        />
    );

    const renderDeletionConfirmationDialog = () => {
        if (!selectedUser || !showConfirmDeleteDialog) {
            return null;
        }
        return (
            <ConfirmationDialog
                open
                title="Confirmation"
                content={`Are you sure you want to remove permission for "${selectedUser.name}"?`}
                dangerous
                agreeButtonText="Remove"
                onAgree={() => removePermission(selectedUser)}
                onDisagree={handleCloseConfirmDeleteDialog}
                onClose={handleCloseConfirmDeleteDialog}
            />
        );
    };

    const renderChangeConfirmationDialog = () => {
        if (!selectedUser || !showConfirmChangeDialog) {
            return null;
        }
        return (
            <ConfirmationDialog
                open
                title="Confirmation"
                content={`Are you sure you want to change permission for "${selectedUser.name}"?`}
                dangerous
                agreeButtonText="Change"
                onAgree={() => changePermission(selectedUser)}
                onDisagree={handleCloseConfirmChangeDialog}
                onClose={handleCloseConfirmChangeDialog}
            />
        );
    };

    const renderAlterUserPermissionsDialog = () => (
        <AlterUserPermissionsDialog
            open={showAlterUserPermissionsDialog}
            onClose={handleUserPermissionsDialogClose}
            collection={collection}
            currentUser={currentUser}
            permissionCandidates={permissionCandidates}
            workspaceUsers={workspaceUsers}
            setPermission={setPermission}
        />
    );

    return (
        <div className={classes.tableWrapper}>
            {renderHeader()}
            {renderPermissionTable()}
            {renderAlterUserPermissionsDialog()}
            {renderDeletionConfirmationDialog()}
            {renderChangeConfirmationDialog()}
        </div>
    );
};

UserPermissionsComponent.propTypes = {
    classes: PropTypes.object.isRequired,
    permissions: PropTypes.array,
    setPermission: PropTypes.func,
    collection: PropTypes.object,
    currentUser: PropTypes.object,
    workspaceUsers: PropTypes.array,
    users: PropTypes.array
};

const ContextualUserPermissionsComponent = (props) => {
    const {users, usersLoading, usersError} = useContext(UsersContext);

    return (
        <UserPermissionsComponent
            {...props}
            loading={usersLoading}
            error={usersError}
            users={users}
        />
    );
};

export default withStyles(styles)(ContextualUserPermissionsComponent);
