import React from 'react';
import ReactDOM from 'react-dom';
import {mount, shallow} from "enzyme";
import {MemoryRouter} from "react-router-dom";
import {Provider} from "react-redux";
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import promiseMiddleware from "redux-promise-middleware";
import {LoadingInlay, MessageDisplay} from '@fairspace/shared-frontend';

import CollectionBrowser from "../CollectionBrowser";
import CollectionBrowserContainer from "../CollectionBrowserContainer";
import Config from "../../common/services/Config/Config";
import * as actionTypes from "../../common/redux/actions/actionTypes";

const middlewares = [thunk, promiseMiddleware];
const mockStore = configureStore(middlewares);

let store;
let collectionBrowser;
const defaultState = {
    account: {
        user: {
            data: {username: 'test'},
            pending: false,
            error: false,
        }
    },
    cache: {
        collections: {
            data: [],
            pending: false,
            error: false,
        },
        users: {
            data: [],
            pending: false,
            error: false,
        }
    },
    collectionBrowser: {}
};

beforeEach(() => {
    store = mockStore(defaultState);

    collectionBrowser = (
        <MemoryRouter>
            <Provider store={store}>
                <CollectionBrowserContainer />
            </Provider>
        </MemoryRouter>
    );

    Config.setConfig({
        urls: {
            collections: "/collections"
        }
    });

    return Config.init();
});

describe('CollectionBrowser', () => {
    it('renders without crashing', () => {
        const div = document.createElement('div');
        ReactDOM.render(collectionBrowser, div);
        ReactDOM.unmountComponentAtNode(div);
    });

    it('dispatch an action on collection save', () => {
        const wrapper = mount(collectionBrowser);

        const addButton = wrapper.find('[aria-label="Add"]').first();
        addButton.simulate('click');

        const nameField = wrapper.find('input#name').first();
        nameField.simulate('focus');
        nameField.simulate('change', {target: {value: 'New collection'}});

        const locationField = wrapper.find('input#location').first();
        locationField.simulate('focus');
        locationField.simulate('change', {target: {value: 'new-collection'}});

        const saveButton = wrapper.find('button[aria-label="Save"]').first();
        saveButton.simulate('click');

        expect(store.getActions().length).toEqual(1);
        expect(store.getActions()[0].type).toBe(actionTypes.ADD_COLLECTION_PENDING);
    });

    it('is loading as long as the user is pending', () => {
        const wrapper = shallow(<CollectionBrowser currentUserLoading />);

        expect(wrapper.find(LoadingInlay).length).toBe(1);
    });

    it('is loading as long as the collections are pending', () => {
        const wrapper = shallow(<CollectionBrowser loading />);

        expect(wrapper.find(LoadingInlay).length).toBe(1);
    });

    it('is in error state when user fetching failed', () => {
        const wrapperErrorObj = shallow(<CollectionBrowser currentUserError={new Error()} />);
        const wrapperErrorText = shallow(<CollectionBrowser error="some error" />);

        expect(wrapperErrorObj.find(MessageDisplay).length).toBe(1);
        expect(wrapperErrorText.find(MessageDisplay).length).toBe(1);
    });
});
