import React, {useState} from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    withStyles
} from '@material-ui/core';
import {useHistory} from "react-router-dom";
import type {MetadataViewColumn, MetadataViewData, MetadataViewFilter} from "./MetadataViewAPI";
import MetadataViewAPI from "./MetadataViewAPI";
import styles from "../../file/FileList.styles";
import useAsync from "../../common/hooks/UseAsync";
import LoadingInlay from "../../common/components/LoadingInlay";
import MessageDisplay from "../../common/components/MessageDisplay";
import IriTooltip from "../../common/components/IriTooltip";
import {TOOLTIP_ENTER_DELAY} from "../../constants";
import Iri from "../../common/components/Iri";
import {isCollectionView, LINKED_FILES_COLUMN_NAME, getContextualFileLink} from "./metadataViewUtils";
import type {MetadataViewEntityWithLinkedFiles} from "./metadataViewUtils";
import {formatDateTime} from "../../common/utils/genericUtils";


type MetadataViewTableContainerProperties = {
    columns: MetadataViewColumn[];
    filters: MetadataViewFilter[];
    toggleRow: () => {};
    view: string;
    locationContext: string;
    selected: MetadataViewEntityWithLinkedFiles;
    classes: any;
};

type MetadataViewTableProperties = {
    data: MetadataViewData;
    columns: MetadataViewColumn[];
    toggleRow: () => {};
    view: string;
    locationContext: string;
    history: any;
    selected?: MetadataViewEntityWithLinkedFiles;
};

export const MetadataViewTable = (props: MetadataViewTableProperties) => {
    const {columns, data, locationContext, toggleRow, selected, view, history} = props;
    const isCollectionViewTable = isCollectionView(view);

    const handleResultSingleClick = (itemIri, itemLabel, linkedFiles) => {
        toggleRow({label: itemLabel, iri: itemIri, linkedFiles: linkedFiles || []});
    };

    const handleResultDoubleClick = (itemIri) => {
        if (isCollectionViewTable) {
            history.push(getContextualFileLink(itemIri, locationContext));
        }
    };

    const renderTableCell = (row, column) => {
        const value = row[column.name];
        let displayValue;
        if (column.name === LINKED_FILES_COLUMN_NAME) {
            displayValue = !value ? 0 : value.length;
        } else if (column.type === 'date') {
            displayValue = formatDateTime(value);
        } else {
            displayValue = row[`${column.name}.label`] || value;
        }
        return (
            <TableCell key={column.name}>
                {row[`${column.name}.label`] ? (
                    <IriTooltip
                        key={column.name}
                        enterDelay={TOOLTIP_ENTER_DELAY}
                        title={<Iri iri={value} />}
                    >
                        <span>{displayValue}</span>
                    </IriTooltip>
                ) : (
                    <span>{displayValue}</span>
                )}
            </TableCell>
        );
    };

    return (
        <Table data-testid="results-table">
            <TableHead>
                <TableRow>
                    {columns.map(column => (
                        <TableCell key={column.name}>{column.title}</TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {data.rows.map(row => (
                    <TableRow
                        key={`${row[columns[0].name]}`}
                        hover={isCollectionViewTable}
                        selected={selected && selected.iri === row[columns[0].name]}
                        onClick={() => handleResultSingleClick(
                            row[columns[0].name],
                            row[`${columns[0].name}.label`],
                            row[LINKED_FILES_COLUMN_NAME]
                        )}
                        onDoubleClick={() => handleResultDoubleClick(row[columns[0].name])}
                    >
                        {columns.map(column => renderTableCell(row, column))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export const MetadataViewTableContainer = (props: MetadataViewTableContainerProperties) => {
    const {view, filters} = props;
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const history = useHistory();

    const {data = [], error, loading} = useAsync(
        () => MetadataViewAPI.getViewData(view, page, rowsPerPage, filters),
        [page, rowsPerPage, view]
    );

    if (loading) {
        return <LoadingInlay />;
    }

    if (!loading && error && error.message) {
        return <MessageDisplay message={error.message} />;
    }

    if (!data || data.length) {
        return <MessageDisplay message="No results found." />;
    }

    return (
        <Paper className={props.classes.root}>
            {data && data.rows && (
                <TableContainer>
                    <MetadataViewTable
                        {...props}
                        data={data}
                        history={history}
                    />
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 100]}
                        component="div"
                        count={data.rows.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onChangePage={(e, p) => setPage(p)}
                        onChangeRowsPerPage={e => setRowsPerPage(e.target.value)}
                        style={{overflowX: "hidden"}}
                    />
                </TableContainer>
            )}
        </Paper>
    );
};

export default withStyles(styles)(MetadataViewTableContainer);
