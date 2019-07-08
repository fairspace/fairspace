import React, {useContext} from "react";
import PropTypes from 'prop-types';
import {Grid} from "@material-ui/core";
import MaterialReactSelect from "../../../common/MaterialReactSelect";
import BaseInputValue from "./BaseInputValue";
import LinkedDataContext from "../../LinkedDataContext";

export const noNamespace = {
    id: '',
    label: '(no namespace)',
    value: ''
};

export const IriValue = ({
    namespace,
    localPart = '',
    onNamespaceChange = () => {},
    onLocalPartChange = () => {}
}) => {
    const {namespaces} = useContext(LinkedDataContext);

    const namespaceOptions = [
        noNamespace,
        ...namespaces.map(n => ({
            id: n.id,
            label: n.label,
            value: n.namespace,
            isDefault: n.isDefault
        }))
    ];

    const defaultNamespace = namespaceOptions.find(n => n.isDefault) || noNamespace;

    if (!namespace) {
        onNamespaceChange(defaultNamespace);
    }

    return (
        <Grid container justify="space-between" spacing={8}>
            <Grid item xs={4}>
                <MaterialReactSelect
                    options={namespaceOptions}
                    value={namespace || defaultNamespace}
                    onChange={onNamespaceChange}
                />
            </Grid>
            <Grid item xs={8} style={{paddingTop: 8, paddingBottom: 0}}>
                <BaseInputValue
                    property={{}}
                    entry={{value: localPart}}
                    onChange={e => onLocalPartChange(e.value)}
                    type="url"
                />
            </Grid>
        </Grid>
    );
};

IriValue.propTypes = {
    localPart: PropTypes.string,
    namespace: PropTypes.object,
    onLocalPartChange: PropTypes.func,
    onNamespaceChange: PropTypes.func
};

export default IriValue;
