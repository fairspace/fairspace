import React from 'react';
import PropTypes from 'prop-types';

import Dropdown from "./Dropdown";
import LoadingInlay from "../../../common/LoadingInlay";
import MessageDisplay from "../../../common/MessageDisplay";

const EntityDropdown = props => {
    if (props.pending) {
        return <LoadingInlay />;
    }

    if (props.error) {
        return <MessageDisplay message={props.error} />;
    }

    return (
        <Dropdown {...props} />
    );
};

EntityDropdown.propTypes = {
    property: PropTypes.object.isRequired,
    entry: PropTypes.object,
    onChange: PropTypes.func,

    entities: PropTypes.array,
    pending: PropTypes.bool,
    error: PropTypes.string
};

export default EntityDropdown;
