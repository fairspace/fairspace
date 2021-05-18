import React, {useEffect, useMemo, useState} from 'react';
import {
    Checkbox,
    Grid,
    Link,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TableSortLabel,
    Typography,
    withStyles
} from "@material-ui/core";
import {FolderOpen, NoteOutlined} from "@material-ui/icons";
import filesize from 'filesize';

import styles from './FileList.styles';
import {compareBy, formatDateTime, stableSort} from "../common/utils/genericUtils";
import useSorting from "../common/hooks/UseSorting";
import usePagination from "../common/hooks/UsePagination";
import {isListOnlyFile} from "./fileUtils";
import ColumnFilterInput from "../common/components/ColumnFilterInput";

const FileList = ({
    classes, files, onPathCheckboxClick, onPathDoubleClick,
    selectionEnabled, onAllSelection, onPathHighlight,
    showDeleted, preselectedFile
}) => {
    const [hoveredFileName, setHoveredFileName] = useState('');

    const columns = {
        name: {
            valueExtractor: f => f.basename,
            label: 'Name'
        },
        size: {
            valueExtractor: f => f.size,
            label: 'Size'
        },
        lastmodified: {
            valueExtractor: f => f.lastmod,
            label: 'Last modified'
        },
        dateDeleted: {
            valueExtractor: f => f.dateDeleted,
            label: 'Deleted'
        }
    };

    const [filterValue, setFilterValue] = useState("");
    const [filteredFiles, setFilteredFiles] = useState(files);
    const {orderedItems, orderAscending, orderBy, toggleSort} = useSorting(filteredFiles, columns, 'name');
    const directoriesBeforeFiles = useMemo(
        () => stableSort(orderedItems, compareBy('type')),
        [orderedItems]
    );

    const {page, setPage, rowsPerPage, setRowsPerPage, pagedItems} = usePagination(directoriesBeforeFiles);

    useEffect(() => {
        if (files && files.length > 0) {
            if (!filterValue) {
                setFilteredFiles(files);
            } else {
                setFilteredFiles(files.filter(f => f.basename.toLowerCase().includes(filterValue.toLowerCase())));
            }
            setPage(0);
        }
    }, [filterValue, files, setPage]);

    useEffect(() => {
        if (preselectedFile) {
            const preselectedFileIndex = directoriesBeforeFiles.findIndex(f => f.filename === preselectedFile);
            if (preselectedFileIndex > -1) {
                const preselectedFilePage = Math.floor(preselectedFileIndex / rowsPerPage);
                setPage(preselectedFilePage);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preselectedFile]);

    if (!files || files.length === 0 || files[0] === null) {
        return (
            <Grid container>
                <Grid item xs={12}>
                    <Typography variant="subtitle1" style={{textAlign: 'center'}}>Empty directory</Typography>
                </Grid>
            </Grid>
        );
    }

    let checkboxHeader = null;

    if (selectionEnabled) {
        const numOfSelected = files.filter(f => f.selected).length;
        const allItemsSelected = files.length === numOfSelected;
        checkboxHeader = (
            <TableCell padding="none" style={{verticalAlign: "bottom"}}>
                <Checkbox
                    indeterminate={numOfSelected > 0 && numOfSelected < files.length}
                    checked={allItemsSelected}
                    onChange={(event) => onAllSelection(event.target.checked)}
                />
            </TableCell>
        );
    }

    const renderFileFilter = () => (
        <ColumnFilterInput placeholder="Filter by name" filterValue={filterValue} setFilterValue={setFilterValue} />
    );

    return (
        <Paper className={classes.root}>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            {checkboxHeader}
                            <TableCell padding="none" />
                            <TableCell className={classes.headerCell}>
                                <TableSortLabel
                                    active={orderBy === 'name'}
                                    direction={orderAscending ? 'asc' : 'desc'}
                                    onClick={() => toggleSort('name')}
                                >
                                Name
                                </TableSortLabel>
                                {renderFileFilter()}
                            </TableCell>
                            <TableCell align="right" className={classes.headerCell}>
                                <TableSortLabel
                                    active={orderBy === 'size'}
                                    direction={orderAscending ? 'asc' : 'desc'}
                                    onClick={() => toggleSort('size')}
                                >
                                Size
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right" className={classes.headerCell}>
                                <TableSortLabel
                                    active={orderBy === 'lastmodified'}
                                    direction={orderAscending ? 'asc' : 'desc'}
                                    onClick={() => toggleSort('lastmodified')}
                                >
                                Last modified
                                </TableSortLabel>
                            </TableCell>
                            {showDeleted && (
                                <TableCell align="right" className={classes.headerCell}>
                                    <TableSortLabel
                                        active={orderBy === 'dateDeleted'}
                                        direction={orderAscending ? 'asc' : 'desc'}
                                        onClick={() => toggleSort('dateDeleted')}
                                    >
                                    Deleted
                                    </TableSortLabel>
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pagedItems.map((file) => {
                            const checkboxVisibility = hoveredFileName === file.filename || file.selected ? 'visible' : 'hidden';

                            return (
                                <TableRow
                                    hover
                                    key={file.filename}
                                    selected={file.selected}
                                    onClick={() => onPathHighlight(file)}
                                    onDoubleClick={() => onPathDoubleClick(file)}
                                    onMouseEnter={() => setHoveredFileName(file.filename)}
                                    onMouseLeave={() => setHoveredFileName('')}
                                    className={file.dateDeleted && classes.deletedFileRow}
                                >
                                    {
                                        selectionEnabled ? (
                                            <TableCell
                                                data-testid="checkbox-cell"
                                                padding="none"
                                                onDoubleClick={(e) => e.stopPropagation()}
                                                onClick={(e) => {e.stopPropagation(); onPathCheckboxClick(file);}}
                                            >
                                                <Checkbox
                                                    style={{visibility: checkboxVisibility}}
                                                    checked={file.selected}
                                                />
                                            </TableCell>
                                        ) : null
                                    }

                                    <TableCell style={{padding: 5}} align="left">
                                        {file.type === 'directory' ? <FolderOpen /> : <NoteOutlined />}
                                    </TableCell>
                                    <TableCell>
                                        {isListOnlyFile(file) ? <span>{file.basename}</span> : (
                                            <Link
                                                onClick={(e) => {e.stopPropagation(); onPathDoubleClick(file);}}
                                                color="inherit"
                                                variant="body2"
                                                component="button"
                                                underline="hover"
                                            >
                                                {file.basename}
                                            </Link>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {file.type === 'file' ? filesize(file.size, {base: 10}) : ''}
                                    </TableCell>
                                    <TableCell align="right">
                                        {file.lastmod ? formatDateTime(file.lastmod) : null}
                                    </TableCell>
                                    {showDeleted && (
                                        <TableCell align="right">
                                            {file.dateDeleted ? formatDateTime(file.dateDeleted) : null}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 100]}
                    component="div"
                    count={filteredFiles.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onChangePage={(e, p) => setPage(p)}
                    onChangeRowsPerPage={e => setRowsPerPage(e.target.value)}
                    style={{overflowX: "hidden"}}
                />
            </TableContainer>
        </Paper>
    );
};

export default withStyles(styles)(FileList);
