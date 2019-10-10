import React from 'react';
import {createShallow} from '@material-ui/core/test-utils';
import {mount} from 'enzyme';

import {AlterPermissionDialog} from "../AlterPermissionDialog";
import UserSelect from "../UserSelect";

describe('AlterPermissionDialog', () => {
    let shallow;
    const mockAlterPermissionFn = jest.fn();
    const mockUsers = [
        {name: 'Mariah Carey', iri: 'http://localhost/iri/user1-id'},
        {name: 'Michael Jackson', iri: 'http://localhost/iri/user2-id'},
        {name: 'Bruno Mars', iri: 'http://localhost/iri/user3-id'},
        {name: 'Kurt Cobain', iri: 'http://localhost/iri/user4-id'},
        {name: 'Ariana Grande', iri: 'http://localhost/iri/user5-id'},
    ];
    const mockCollaborators = [
        {
            user: 'http://localhost/iri/user2-id',
            access: 'Write'
        },
        {
            user: 'http://localhost/iri/user4-id',
            access: 'Manage'
        }
    ];

    const mockCurrentLoggedUser = {
        id: 'user1-id',
        iri: 'http://localhost/iri/user1-id'
    };
    const mockCollectionId = 500;
    const mockPermission = {
        user: 'http://localhost/iri/user2-id',
        access: 'Write'
    };

    let wrapper;

    beforeAll(() => {
        shallow = createShallow({dive: true});
    });

    it('should render initial state of the dialog correctly', () => {
        wrapper = shallow(<AlterPermissionDialog
            open={false}
            classes={{}}
            permission={null}
            collectionId={mockCollectionId}
            collaborators={mockCollaborators}
            currentUser={mockCurrentLoggedUser}
            alterPermission={mockAlterPermissionFn}
            users={mockUsers}
        />);

        // initial state if it's open or not
        expect(wrapper.find('Dialog').prop('open')).toBeFalsy();

        // title =Share with
        expect(wrapper.find('WithStyles(DialogTitle)').childAt(0).text()).toEqual('Share with');

        // render collacborator selector
        expect(wrapper.find(UserSelect).prop('value')).toBe(null);

        // initial value of the access right is "Read"
        expect(wrapper.find('RadioGroup').prop('value')).toEqual('Read');
        // populate radio group with 3 access options
        expect(wrapper.find('RadioGroup').childAt(0).prop('value')).toEqual('Read');
        expect(wrapper.find('RadioGroup').childAt(1).prop('value')).toEqual('Write');
        expect(wrapper.find('RadioGroup').childAt(2).prop('value')).toEqual('Manage');

        // render cancel and submit buttons
        expect(wrapper.find('WithStyles(Button)').at(0).childAt(0).text()).toEqual('Cancel');
        expect(wrapper.find('WithStyles(Button)').at(1).childAt(0).text()).toEqual('Submit');
        expect(wrapper.find('WithStyles(Button)').at(1).prop('disabled')).toBeTruthy();
    });

    it('should not render user selector and render selected user fullname instead when user is provided', () => {
        wrapper = mount(
            <AlterPermissionDialog
                open
                classes={{}}
                user={mockPermission.user}
                access={mockPermission.access}
                iri={mockPermission.iri}
                collectionId={mockCollectionId}
                collaborators={mockCollaborators}
                currentUser={mockCurrentLoggedUser}
                alterPermission={mockAlterPermissionFn}
                users={mockUsers}
                loading={false}
            />
        );
        wrapper.setState({selectedUser: mockPermission.user});

        expect(wrapper.find('WithStyles(MaterialReactSelect)')).toHaveLength(0);
        expect(wrapper.find('WithStyles(Typography)').at(1).text()).toEqual('Michael Jackson');
        expect(wrapper.find('WithStyles(Button)').at(1).prop('disabled')).toBeFalsy(); // submit button enabled
    });
});
