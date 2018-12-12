import React from 'react';
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List/List";
import ListItem from "@material-ui/core/ListItem/ListItem";
import ListItemText from "@material-ui/core/ListItemText/ListItemText";
import { generateUuid, getLabel } from "../../utils/metadatautils";
import Paper from "@material-ui/core/Paper/Paper";
import { compareBy } from "../../utils/comparators";
import TextField from "@material-ui/core/TextField/TextField";
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import LoadingInlay from '../generic/Loading/LoadingInlay';
import { fetchMetadataVocabularyIfNeeded } from "../../actions/metadata";
import { connect } from "react-redux";

class NewMetadataEntityDialog extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            creating: false,
            type: null
        };

        props.fetchMetadataVocabularyIfNeeded();
    }

    openDialog(e) {
        e.stopPropagation();
        this.setState({ creating: true, id: generateUuid(), type: undefined });
    }

    closeDialog(e) {
        if (e) e.stopPropagation();
        this.setState({ creating: false });
    }

    createEntity(e) {
        e.stopPropagation();
        this.setState({ creating: false });
        this.props.onCreate(this.state.type, this.state.id);
    }

    handleInputChange(event) {
        this.setState({ [event.target.name]: event.target.value });
    }

    render() {
        return (
            <div style={{ display: 'inline' }}>
                <Fab size="small" color="secondary" aria-label="Add" onClick={this.openDialog.bind(this)}>
                    <AddIcon />
                </Fab>
                <Dialog
                    open={this.state.creating}
                    onClick={e => e.stopPropagation()}
                    onClose={this.closeDialog.bind(this)}
                    aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title">Create new metadata entity</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            id='name'
                            label='Id'
                            value={this.state.id}
                            name='id'
                            onChange={this.handleInputChange.bind(this)}
                            fullWidth
                            required={true}
                            error={!this._hasValidId()}
                            style={{ width: 400 }} />
                        <Paper style={{ maxHeight: 400, overflow: 'auto', width: 400 }}>
                            {
                                this.props.types.length
                                    ? <List>
                                        {
                                            this.props.types.sort(compareBy(getLabel)).map(t => (
                                                <ListItem
                                                    key={t['@id']}
                                                    button
                                                    selected={this.state.type === t}
                                                    onClick={() => this.setState({ type: t })}>
                                                    <ListItemText primary={getLabel(t)} />
                                                </ListItem>
                                            ))
                                        }
                                    </List>
                                    : <LoadingInlay />
                            }
                        </Paper>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.closeDialog.bind(this)} color="secondary">
                            Close
                        </Button>
                        <Button onClick={this.createEntity.bind(this)} color="primary" disabled={!this._canCreate()}>
                            Create
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        );
    }

    _hasValidId() {
        return new URL('http://example.com/' + this.state.id).toString() === 'http://example.com/' + this.state.id
    }
    
    _canCreate() {
        return this.state.type && this.state.id && this._hasValidId()
    }
}

const mapStateToProps = (state) => ({
    loading: state.cache.vocabulary.pending,
    types: state.cache && state.cache.vocabulary && state.cache.vocabulary.data && state.cache.vocabulary.data.getFairspaceClasses()
})

const mapDispatchToProps = {
    fetchMetadataVocabularyIfNeeded
}

export default connect(mapStateToProps, mapDispatchToProps)(NewMetadataEntityDialog);
