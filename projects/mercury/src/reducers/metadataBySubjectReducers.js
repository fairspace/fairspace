import reduceReducers from "reduce-reducers";
import {promiseReducerFactory} from "../utils/redux";
import * as actionTypes from "../actions/actionTypes";
import {TYPE_URI} from "../constants";

const defaultState = {
    creatingMetadataEntity: false
};

const metadataCombinationReducer = promiseReducerFactory(actionTypes.COMBINE_METADATA, defaultState, action => action.meta.subject);

const metadataUpdateReducer = (state = defaultState, action) => {
    switch (action.type) {
        case actionTypes.UPDATE_METADATA_FULFILLED: {
            const {meta: {subject, predicate, values}} = action;
            return {
                ...state,
                [subject]: {
                    ...state[subject],
                    data: state[subject].data.map(el => ((el.key === predicate) ? {...el, values} : el)),
                    invalidated: true
                }
            };
        }
        case actionTypes.CREATE_METADATA_ENTITY_PENDING:
            return {
                ...state,
                creatingMetadataEntity: true
            };
        case actionTypes.CREATE_METADATA_ENTITY_FULFILLED:
            return {
                ...state,
                creatingMetadataEntity: false,
                [action.meta.subject]: {
                    data: [{key: TYPE_URI, values: [{id: action.meta.type}]}],
                    invalidated: true
                }
            };
        case actionTypes.CREATE_METADATA_ENTITY_REJECTED:
            return {
                ...state,
                creatingMetadataEntity: false
            };
        default:
            return state;
    }
};

export default reduceReducers(metadataCombinationReducer, metadataUpdateReducer, defaultState);
