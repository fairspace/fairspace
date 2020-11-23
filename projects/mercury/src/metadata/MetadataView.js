import React, {useContext, useEffect, useState} from 'react';
import {Grid, Paper, withStyles} from '@material-ui/core';
import MetadataViewTable from './MetadataViewTable';
import Facet from './MetadataViewFacetFactory';
import type {MetadataViewEntity, MetadataViewFacet, MetadataViewFilter, ValueType} from "./MetadataViewAPI";
import MetadataViewAPI from './MetadataViewAPI';
import BreadCrumbs from '../../common/components/BreadCrumbs';
import useAsync from "../../common/hooks/UseAsync";
import MetadataViewContext from "./MetadataViewContext";
import BreadcrumbsContext from "../../common/contexts/BreadcrumbsContext";
import LoadingInlay from "../../common/components/LoadingInlay";
import MessageDisplay from "../../common/components/MessageDisplay";
import {getSearchPathSegments} from "../../collections/collectionUtils";
import {getSearchContextFromString} from "../../search/searchUtils";
import {isCollectionView, LOCATION_FILTER_FIELD, ofRangeValueType} from "./metadataViewUtils";
import MetadataViewActiveFilters from "./MetadataViewActiveFilters";
import MetadataViewInformationDrawer from "./MetadataViewInformationDrawer";
import {useSingleSelection} from "../../file/UseSelection";
import * as consts from "../../constants";


type MetadataViewProperties = {
    view: string;
    classes: any;
}

const styles = (theme) => ({
    facet: {
        borderColor: theme.palette.info.light,
        borderWidth: 1.5,
        borderRadius: 6
    },
    facets: {
        marginTop: 10,
        minWidth: 265,
        maxHeight: consts.MAIN_CONTENT_MAX_HEIGHT,
        overflowY: 'auto'
    },
    centralPanel: {
        width: consts.MAIN_CONTENT_WIDTH,
        overflowX: 'auto',
        maxHeight: consts.MAIN_CONTENT_MAX_HEIGHT - 10
    },
    centralPanelFullWidth: {
        width: '100%'
    },
    sidePanel: {
        width: consts.SIDE_PANEL_WIDTH
    },
    metadataViewTable: {
        marginTop: 10,
        overflowX: 'auto',
        width: '100%'
    }
});

export const MetadataView = (props: MetadataViewProperties) => {
    const {view: currentView, classes} = props;
    const {views} = useContext(MetadataViewContext);
    const currentViewOptions = views.find(v => v.name === currentView) || {};
    const locationContext = getSearchContextFromString(window.location.search);
    const {toggle, selected} = useSingleSelection();

    const {data: facets = [], error: facetsError, loading: facetsLoading} = useAsync(
        () => MetadataViewAPI.getFacets(currentView)
    );

    const [filters: MetadataViewFilter[], setFilters] = useState([]);

    useEffect(() => {
        if (isCollectionView(currentView)) {
            const newFilter: MetadataViewFilter = {
                field: LOCATION_FILTER_FIELD,
                values: [locationContext]
            };
            setFilters([...filters, newFilter]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentView, locationContext]);

    const setFilterValues = (type: ValueType, filter: MetadataViewFilter, values: any[]) => {
        if (ofRangeValueType(type)) {
            [filter.rangeStart, filter.rangeEnd] = values;
        } else {
            filter.values = values;
        }
    };

    const updateFilters = (facet: MetadataViewFacet, values: any[]) => {
        if (filters.find(f => f.field === facet.name)) {
            let updatedFilters;
            if (values && values.length > 0 && !values.every(v => !v)) {
                updatedFilters = [...filters];
                const filter = updatedFilters.find(f => (f.field === facet.name));
                setFilterValues(facet.type, filter, values);
            } else {
                updatedFilters = [...filters.filter(f => f.field !== facet.name)];
            }
            setFilters(updatedFilters);
        } else {
            const newFilter: MetadataViewFilter = {
                field: facet.name
            };
            setFilterValues(facet.type, newFilter, values);
            setFilters([...filters, newFilter]);
        }
    };

    const toggleRow = (entity: MetadataViewEntity) => (toggle(entity));

    const getPathSegments = () => {
        if (isCollectionView(currentView)) {
            return getSearchPathSegments(locationContext);
        }
        return [];
    };

    const renderFacets = () => {
        if (facetsLoading) {
            return <LoadingInlay />;
        }

        if (!facetsLoading && facetsError && facetsError.message) {
            return <MessageDisplay message={facetsError.message} />;
        }
        return (
            <Grid
                container
                item
                direction="column"
                justify="flex-start"
                spacing={1}
            >
                {
                    facets.map(facet => (
                        <Grid key={facet.name} item>
                            <Facet
                                multiple
                                type={facet.type}
                                title={facet.title}
                                options={facet.values || [facet.rangeStart, facet.rangeEnd]}
                                onChange={(values) => updateFilters(facet, values)}
                                extraClasses={classes.facet}
                            />
                        </Grid>
                    ))
                }
            </Grid>
        );
    };

    const getBreadcrumbSegmentPath = () => {
        if (isCollectionView(currentView)) {
            return `/${currentView}`;
        }
        return `/views/${currentView}`;
    };

    return (
        <BreadcrumbsContext.Provider value={{
            segments: [
                {
                    label: currentViewOptions.title,
                    href: getBreadcrumbSegmentPath(),
                    icon: currentViewOptions.icon
                }
            ]
        }}
        >
            <BreadCrumbs additionalSegments={getPathSegments()} />
            <MetadataViewActiveFilters facets={facets} filters={filters} />
            <Grid container direction="row" spacing={1} wrap="nowrap">
                <Grid item className={`${classes.centralPanel} ${!selected && classes.centralPanelFullWidth}`}>
                    <Grid container direction="row" spacing={1} wrap="nowrap">
                        <Grid item className={classes.facets}>
                            {renderFacets()}
                        </Grid>
                        <Grid item className={classes.metadataViewTable}>
                            <Paper>
                                <MetadataViewTable
                                    columns={currentViewOptions.columns}
                                    view={currentView}
                                    filters={filters}
                                    locationContext={locationContext}
                                    selected={selected}
                                    toggleRow={toggleRow}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
                <Grid item className={classes.sidePanel} hidden={!selected}>
                    <MetadataViewInformationDrawer
                        forceExpand
                        showLinkedFiles={!isCollectionView(currentView)}
                        entity={selected}
                        viewIcon={currentViewOptions.icon}
                        locationContext={locationContext}
                    />
                </Grid>
            </Grid>
        </BreadcrumbsContext.Provider>
    );
};

export default withStyles(styles)(MetadataView);
