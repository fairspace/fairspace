import React, {useContext, useEffect, useState} from 'react';
import Grid from '@material-ui/core/Grid';
import FormControlLabel from "@material-ui/core/FormControlLabel";
import {Switch, withStyles} from "@material-ui/core";
import {Link} from "react-router-dom";
import Button from "@material-ui/core/Button";
import {Search} from "@material-ui/icons";
import usePageTitleUpdater from "../common/hooks/UsePageTitleUpdater";

import CollectionBreadcrumbsContextProvider from "./CollectionBreadcrumbsContextProvider";
import CollectionBrowser from "./CollectionBrowser";
import CollectionInformationDrawer from './CollectionInformationDrawer';
import {useSingleSelection} from "../file/UseSelection";
import LoadingOverlay from "../common/components/LoadingOverlay";
import {handleCollectionTextSearchRedirect} from "./collectionUtils";
import SearchBar from "../search/SearchBar";
import BreadCrumbs from "../common/components/BreadCrumbs";
import ConfirmationDialog from "../common/components/ConfirmationDialog";
import styles from "./CollectionsPage.styles";
import CollectionsContext from './CollectionsContext';

const CollectionsPage = ({history, showBreadCrumbs, workspaceIri, classes}) => {
    usePageTitleUpdater("Collections");

    const {collections, collectionsLoading, collectionsError} = useContext(CollectionsContext);

    const [busy, setBusy] = useState(false);
    const [showDeletedCollections, setShowDeletedCollections] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [hasCollectionMetadataUpdates, setHasCollectionMetadataUpdates] = useState(false);
    const {isSelected, toggle, selected} = useSingleSelection();
    const [preselectedCollectionIri, setPreselectedCollectionIri] = useState(false);

    const handleSearch = (value) => {
        handleCollectionTextSearchRedirect(history, value);
    };

    let unmounting = false;

    useEffect(() => function cleanup() {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        unmounting = true;
    });

    const toggleCollection = (collectionIri) => {
        if (unmounting) {
            return;
        }
        setPreselectedCollectionIri(collectionIri);
        if (hasCollectionMetadataUpdates) {
            setShowConfirmDialog(true);
        } else {
            toggle(collectionIri);
        }
    };


    const handleConfirmSwitchCollection = () => {
        setShowConfirmDialog(false);
        toggle(preselectedCollectionIri);
    };

    const handleCancelSwitchCollection = () => setShowConfirmDialog(false);

    return (
        <CollectionBreadcrumbsContextProvider>
            {showBreadCrumbs && <BreadCrumbs />}
            <Grid container justify="space-between" spacing={1}>
                <Grid item className={classes.topBar}>
                    <Grid container>
                        <Grid item xs={6}>
                            <SearchBar
                                placeholder="Search"
                                disableUnderline={false}
                                onSearchChange={handleSearch}
                                disabled={collectionsLoading || collectionsError || !collections || collections.length === 0}
                            />
                        </Grid>
                        <Grid item xs={3} className={classes.advancedSearchButton}>
                            <Link to="/views/collections">
                                <Button
                                    variant="text"
                                    color="primary"
                                    startIcon={<Search />}
                                >
                                    Advanced search
                                </Button>
                            </Link>
                        </Grid>
                        <Grid item xs={3} className={classes.topBarSwitch}>
                            <FormControlLabel
                                control={(
                                    <Switch
                                        color="primary"
                                        checked={showDeletedCollections}
                                        onChange={() => setShowDeletedCollections(!showDeletedCollections)}
                                    />
                                )}
                                label="Show deleted"
                            />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            <Grid container spacing={1}>
                <Grid item className={classes.centralPanel}>
                    <CollectionBrowser
                        setBusy={setBusy}
                        isSelected={collection => isSelected(collection.iri)}
                        toggleCollection={collection => toggleCollection(collection.iri)}
                        workspaceIri={workspaceIri}
                        showDeletedCollections={showDeletedCollections}
                    />
                </Grid>
                <Grid item className={classes.sidePanel}>
                    <CollectionInformationDrawer
                        inCollectionsBrowser
                        setBusy={setBusy}
                        selectedCollectionIri={selected}
                        onChangeOwner={() => {
                            if (workspaceIri) {
                                toggleCollection(selected);
                            }
                        }}
                        setHasCollectionMetadataUpdates={setHasCollectionMetadataUpdates}
                    />
                </Grid>
            </Grid>
            {showConfirmDialog ? (
                <ConfirmationDialog
                    open
                    title="Unsaved changes"
                    content={'You have unsaved changes, are you sure you want to navigate away?'
                    + ' Your pending changes will be lost.'}
                    agreeButtonText="Navigate"
                    disagreeButtonText="back to form"
                    onAgree={handleConfirmSwitchCollection}
                    onDisagree={handleCancelSwitchCollection}
                />
            ) : null}
            <LoadingOverlay loading={busy} />
        </CollectionBreadcrumbsContextProvider>
    );
};

export default withStyles(styles)(CollectionsPage);
