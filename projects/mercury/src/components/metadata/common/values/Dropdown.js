import React from 'react';
import PropTypes from 'prop-types';

import MaterialReactSelect from "../../../common/MaterialReactSelect";
import {compareBy} from "../../../../utils/genericUtils";

const Dropdown = ({options, ...otherProps}) => (
    <MaterialReactSelect
        style={{width: '100%'}}
        {...otherProps}
        options={options.sort(compareBy('disabled'))}
    />
);

Dropdown.propTypes = {
    onChange: PropTypes.func,
    options: PropTypes.array
};

export default (Dropdown);
