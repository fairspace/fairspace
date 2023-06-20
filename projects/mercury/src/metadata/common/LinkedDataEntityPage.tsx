// @ts-nocheck
import React from "react";
import {Paper} from "@mui/material";
import useNamespacedIri from "../../common/hooks/UseNamespacedIri";
import useLinkedData from "./UseLinkedData";
import LinkedDataEntityFormContainer from "./LinkedDataEntityFormContainer";
import LinkedDataEntityHeader from "./LinkedDataEntityHeader";
import BreadCrumbs from "../../common/components/BreadCrumbs";
import usePageTitleUpdater from "../../common/hooks/UsePageTitleUpdater";
export default (({
    title,
    subject
}) => {
    const iri = useNamespacedIri(subject);
    usePageTitleUpdater(`${iri} - ${title}`);
    const {
        properties,
        values,
        linkedDataLoading,
        linkedDataError,
        typeInfo,
        updateLinkedData
    } = useLinkedData(subject);
    return <>
        <BreadCrumbs />
        <Paper style={{
            maxWidth: 800,
            padding: 20
        }}>
            <LinkedDataEntityHeader subject={subject} typeInfo={typeInfo} values={values} linkedDataLoading={linkedDataLoading} linkedDataError={linkedDataError} updateLinkedData={updateLinkedData} enableDelete={false} />
            <LinkedDataEntityFormContainer subject={subject} typeInfo={typeInfo} hasEditRight={false} fullpage properties={properties} values={values} linkedDataLoading={linkedDataLoading} linkedDataError={linkedDataError} updateLinkedData={updateLinkedData} />
        </Paper>
    </>;
});