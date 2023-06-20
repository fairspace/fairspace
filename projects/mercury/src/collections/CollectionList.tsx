// @ts-nocheck
import React, {useEffect, useState} from "react";
import {Link, ListItemText, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel} from "@mui/material";
import withStyles from "@mui/styles/withStyles";
import styles from "./CollectionList.styles";
import MessageDisplay from "../common/components/MessageDisplay";
import {camelCaseToWords, formatDateTime} from "../common/utils/genericUtils";
import useSorting from "../common/hooks/UseSorting";
import usePagination from "../common/hooks/UsePagination";
import {currentWorkspace} from "../workspaces/workspaces";
import {accessLevelForCollection, collectionAccessIcon} from "./collectionUtils";
import ColumnFilterInput from "../common/components/ColumnFilterInput";
import TablePaginationActions from "../common/components/TablePaginationActions";

const baseColumns = {
    name: {
        valueExtractor: 'name',
        label: 'Name'
    },
    workspace: {
        valueExtractor: 'ownerWorkspaceCode',
        label: 'Workspace'
    },
    status: {
        valueExtractor: 'status',
        label: 'Status'
    },
    viewMode: {
        valueExtractor: 'accessMode',
        label: 'Public access'
    },
    access: {
        valueExtractor: 'access',
        label: 'Access'
    },
    created: {
        valueExtractor: 'dateCreated',
        label: 'Created'
    },
    creator: {
        valueExtractor: 'creatorDisplayName',
        label: 'Creator'
    }
};
const allColumns = {...baseColumns,
    dateDeleted: {
        valueExtractor: 'dateDeleted',
        label: 'Deleted'
    }};

const CollectionList = ({
    collections = [],
    isSelected = () => false,
    showDeleted,
    onCollectionClick,
    onCollectionDoubleClick,
    classes
}) => {
    const columns = {...baseColumns};

    if (currentWorkspace()) {
        delete columns.workspace;
    }

    const [filterValue, setFilterValue] = useState("");
    const [filteredCollections, setFilteredCollections] = useState(collections);
    const {
        orderedItems,
        orderAscending,
        orderBy,
        toggleSort
    } = useSorting(filteredCollections, allColumns, 'name');
    const {
        page,
        setPage,
        rowsPerPage,
        setRowsPerPage,
        pagedItems
    } = usePagination(orderedItems);
    useEffect(() => {
        if (collections && collections.length > 0) {
            if (!filterValue) {
                setFilteredCollections(collections);
            } else {
                setFilteredCollections(collections.filter(c => c.name.toLowerCase().includes(filterValue.toLowerCase()) || c.description && c.description.toLowerCase().includes(filterValue.toLowerCase())));
            }

            setPage(0);
        }
    }, [filterValue, collections, setPage]);

    if (!collections || collections.length === 0) {
        return <MessageDisplay message="No collections available" variant="h6" withIcon={false} isError={false} noWrap={false} messageColor="textSecondary" />;
    }

    const renderCollectionFilter = () => <ColumnFilterInput placeholder="Filter by name" filterValue={filterValue} setFilterValue={setFilterValue} />;

    return <Paper className={classes.root}>
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        {Object.entries(columns).map(([key, column]) => <TableCell key={key} className={classes.headerCell}>
                            <TableSortLabel active={orderBy === key} direction={orderAscending ? 'asc' : 'desc'} onClick={() => toggleSort(key)}>
                                {column.label}
                            </TableSortLabel>
                            {key === "name" && renderCollectionFilter()}
                        </TableCell>)}
                        {showDeleted && <TableCell key="dateDeleted">
                            <TableSortLabel active={orderBy === 'dateDeleted'} direction={orderAscending ? 'asc' : 'desc'} onClick={() => toggleSort('dateDeleted')}>
                                    Deleted
                            </TableSortLabel>
                        </TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {pagedItems.map(collection => {
                        const selected = isSelected(collection);
                        const accessLevel = accessLevelForCollection(collection);
                        return <TableRow key={collection.iri} hover onClick={() => onCollectionClick(collection)} onDoubleClick={() => onCollectionDoubleClick(collection)} selected={selected} className={collection.dateDeleted && classes.deletedCollectionRow}>
                            <TableCell style={{
                                overflowWrap: "break-word",
                                maxWidth: 160
                            }} scope="row">
                                <ListItemText style={{
                                    margin: 0
                                }} primary={<Link component="button" onClick={e => {
                                    e.stopPropagation();
                                    onCollectionDoubleClick(collection);
                                }} color="inherit" variant="body2" style={{
                                    textAlign: "left"
                                }}>
                                    {collection.name}
                                </Link>} secondary={collection.description} secondaryTypographyProps={{
                                    noWrap: true
                                }} />
                            </TableCell>
                            {currentWorkspace() ? null : <TableCell style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 160
                            }}>
                                {collection.ownerWorkspaceCode}
                            </TableCell>}
                            <TableCell>
                                {camelCaseToWords(collection.status, "-")}
                            </TableCell>
                            <TableCell>
                                {camelCaseToWords(collection.accessMode)}
                            </TableCell>
                            <TableCell>
                                {collectionAccessIcon(accessLevel)}
                            </TableCell>
                            <TableCell>
                                {formatDateTime(collection.dateCreated)}
                            </TableCell>
                            <TableCell>
                                {collection.creatorDisplayName}
                            </TableCell>
                            {showDeleted && <TableCell>
                                {formatDateTime(collection.dateDeleted)}
                            </TableCell>}
                        </TableRow>;
                    })}
                </TableBody>
            </Table>
            <TablePagination rowsPerPageOptions={[5, 10, 25, 100]} component="div" count={filteredCollections.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(e, p) => setPage(p)} onRowsPerPageChange={e => setRowsPerPage(e.target.value)} style={{
                overflowX: "hidden"
            }} ActionsComponent={TablePaginationActions} />
        </TableContainer>
    </Paper>;
};

export default withStyles(styles, {
    withTheme: true
})(CollectionList);