import {linkedDataFormChangesReducerPerForm} from './linkedDataFormReducers';
import * as actionTypes from "../actions/actionTypes";

describe('Metadata form reducer', () => {
    describe('initialization', () => {
        it('should clear updates on initialization', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    {
                        updates: {a: 'b'}
                    }, {
                        type: actionTypes.INITIALIZE_LINKEDDATA_FORM
                    }
                )
            ).toEqual({
                updates: {},
                validations: {},
                error: false,
                pending: false
            });
        });
    });

    describe('adding values', () => {
        it('should add a value when no values are present yet', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    undefined, {
                        type: actionTypes.ADD_LINKEDDATA_VALUE,
                        property: {key: 'propertyA', values: ['previousValue']},
                        value: 'added'
                    }
                )
            ).toEqual({
                updates: {propertyA: ['previousValue', 'added']},
                error: false,
                pending: false,
                validations: {propertyA: []}
            });
        });
        it('should add a value if some updates were already done to this field', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    {
                        updates: {propertyA: ['test']}
                    }, {
                        type: actionTypes.ADD_LINKEDDATA_VALUE,
                        property: {key: 'propertyA', values: ['previousValue']},
                        value: 'added'
                    }
                )
            ).toEqual({
                updates: {propertyA: ['test', 'added']},
                validations: {propertyA: []}
            });
        });
        it('should not change values for other fields', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    {
                        updates: {propertyA: ['test']}
                    }, {
                        type: actionTypes.ADD_LINKEDDATA_VALUE,
                        property: {key: 'propertyB', values: ['previousValue']},
                        value: 'added'
                    }
                )
            ).toEqual({
                updates: {
                    propertyA: ['test'],
                    propertyB: ['previousValue', 'added']
                },
                validations: {propertyB: []}
            });
        });
    });

    describe('updating values', () => {
        it('should update a value when no changes are present yet', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    undefined, {
                        type: actionTypes.UPDATE_LINKEDDATA_VALUE,
                        property: {key: 'propertyA', values: ['previousValue']},
                        value: 'changed',
                        index: 0
                    }
                )
            ).toEqual({
                updates: {propertyA: ['changed']},
                validations: {propertyA: []},
                error: false,
                pending: false
            });
        });
        it('should update a value if some updates were already done to this field', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    {
                        updates: {propertyA: ['test', 'test2']}
                    }, {
                        type: actionTypes.UPDATE_LINKEDDATA_VALUE,
                        property: {key: 'propertyA', values: ['previousValue']},
                        value: 'changed',
                        index: 1
                    }
                )
            ).toEqual({
                updates: {propertyA: ['test', 'changed']},
                validations: {propertyA: []}
            });
        });
        it('should not change values for other fields', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    {
                        updates: {propertyA: ['test']}
                    }, {
                        type: actionTypes.UPDATE_LINKEDDATA_VALUE,
                        property: {key: 'propertyB', values: ['previousValue']},
                        value: 'changed',
                        index: 0
                    }
                )
            ).toEqual({
                updates: {
                    propertyA: ['test'],
                    propertyB: ['changed']
                },
                validations: {propertyB: []}
            });
        });
        it('should ignore changes where the index if out of bounds', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    {
                        updates: {propertyA: ['test', 'test2']}
                    }, {
                        type: actionTypes.UPDATE_LINKEDDATA_VALUE,
                        property: {key: 'propertyB', values: ['previousValue']},
                        value: 'changed',
                        index: 100
                    }
                )
            ).toEqual({
                updates: {
                    propertyA: ['test', 'test2'],
                    propertyB: ['previousValue']
                },
                validations: {propertyB: []}
            });
        });
    });

    describe('deleting values', () => {
        it('should delete a value when no changes are present yet', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    undefined, {
                        type: actionTypes.DELETE_LINKEDDATA_VALUE,
                        property: {key: 'propertyA', values: ['previousValue', 'previousValue2']},
                        index: 1
                    }
                )
            ).toEqual({
                updates: {propertyA: ['previousValue']},
                validations: {propertyA: []},
                error: false,
                pending: false
            });
        });
        it('should delete a value if some updates were already done to this field', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    {
                        updates: {propertyA: ['test', 'test2', 'test3']}
                    }, {
                        type: actionTypes.DELETE_LINKEDDATA_VALUE,
                        property: {key: 'propertyA', values: ['previousValue']},
                        index: 1
                    }
                )
            ).toEqual({
                updates: {propertyA: ['test', 'test3']},
                validations: {propertyA: []}
            });
        });
        it('should not change values for other fields', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    {
                        updates: {propertyA: ['test']}
                    }, {
                        type: actionTypes.DELETE_LINKEDDATA_VALUE,
                        property: {key: 'propertyB', values: ['previousValue']},
                        index: 0
                    }
                )
            ).toEqual({
                updates: {
                    propertyA: ['test'],
                    propertyB: []
                },
                validations: {propertyB: []}
            });
        });
        it('should ignore changes where the index if out of bounds', () => {
            expect(
                linkedDataFormChangesReducerPerForm(
                    {
                        updates: {propertyA: ['test', 'test2']}
                    }, {
                        type: actionTypes.DELETE_LINKEDDATA_VALUE,
                        property: {key: 'propertyB', values: ['previousValue']},
                        index: 100
                    }
                )
            ).toEqual({
                updates: {
                    propertyA: ['test', 'test2'],
                    propertyB: ['previousValue']
                },
                validations: {propertyB: []}
            });
        });
    });
});
