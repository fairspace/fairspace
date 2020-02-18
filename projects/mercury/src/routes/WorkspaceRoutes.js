import React from 'react';
import {Redirect, Route, Switch} from "react-router-dom";

import * as queryString from 'query-string';
import WorkspaceOverview from "../home/Home";
import Collections from "../collections/CollectionsPage";
import Notebooks from "../notebooks/Notebooks";
import FilesPage from "../file/FilesPage";
import SearchPage from '../search/SearchPage';
import {createMetadataIri, createVocabularyIri} from "../common/utils/linkeddata/metadataUtils";
import {MetadataWrapper, VocabularyWrapper} from '../metadata/LinkedDataWrapper';
import LinkedDataEntityPage from "../metadata/common/LinkedDataEntityPage";
import MetadataOverviewPage from "../metadata/MetadataOverviewPage";
import VocabularyOverviewPage from "../metadata/VocabularyOverviewPage";
import LinkedDataMetadataProvider from "../metadata/LinkedDataMetadataProvider";
import UsersPage from '../users/UsersPage';
import CollectionSearchResultList from "../collections/CollectionsSearchResultList";

const getSubject = () => (
    document.location.search ? decodeURIComponent(queryString.parse(document.location.search).iri) : null
);

const WorkspaceRoutes = () => (
    <Switch>
        <Route path="/workspaces/:workspace" exact component={WorkspaceOverview} />

        <Route
            path="/workspaces/:workspace/users"
            exact
            component={UsersPage}
        />

        <Route
            path="/workspaces/:workspace/collections"
            exact
            render={(props) => (
                <LinkedDataMetadataProvider>
                    <Collections history={props.history} />
                </LinkedDataMetadataProvider>
            )}
        />

        <Route
            path="/workspaces/:workspace/collections/search"
            render={(props) => (
                <LinkedDataMetadataProvider>
                    <CollectionSearchResultList {...props} />
                </LinkedDataMetadataProvider>
            )}
        />

        <Route
            path="/workspaces/:workspace/collections/:collection/:path(.*)?"
            render={(props) => (
                <LinkedDataMetadataProvider>
                    <FilesPage {...props} />
                </LinkedDataMetadataProvider>
            )}
        />

        <Route path="/workspaces/:workspace/notebooks" exact component={Notebooks} />

        <Route
            path="/workspaces/:workspace/metadata"
            exact
            render={() => {
                const subject = getSubject();

                return (
                    <MetadataWrapper>
                        {subject ? <LinkedDataEntityPage title="Metadata" subject={subject} /> : <MetadataOverviewPage />}
                    </MetadataWrapper>
                );
            }}
        />

        <Route
            /* This route redirects a metadata iri which is entered directly to the metadata editor */
            path="/workspaces/:workspace/iri/**"
            render={({match}) => (<Redirect to={"/metadata?iri=" + encodeURIComponent(createMetadataIri(match.params[0]))} />)}
        />

        <Route
            path="/workspaces/:workspace/vocabulary"
            exact
            render={() => {
                const subject = getSubject();

                return (
                    <VocabularyWrapper>
                        {subject ? <LinkedDataEntityPage title="Vocabulary" subject={subject} /> : <VocabularyOverviewPage />}
                    </VocabularyWrapper>
                );
            }}
        />

        <Route
            /* This route redirects a metadata iri which is entered directly to the metadata editor */
            path="/workspaces/:workspace/vocabulary/**"
            render={({match}) => (<Redirect to={"/vocabulary?iri=" + encodeURIComponent(createVocabularyIri(match.params[0]))} />)}
        />

        <Route
            path="/workspaces/:workspace/search"
            render={({location, history}) => <SearchPage location={location} history={history} />}
        />
    </Switch>
);

export default WorkspaceRoutes;
