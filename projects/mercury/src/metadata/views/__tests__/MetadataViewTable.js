import {render} from "@testing-library/react";
import React from "react";
import '@testing-library/jest-dom/extend-expect';
import {shallow} from "enzyme";
import TableRow from "@material-ui/core/TableRow";
import {TableBody} from "@material-ui/core";
import {MetadataViewTable} from "../MetadataViewTable";
// eslint-disable-next-line jest/no-mocks-import
import {mockViews, mockRows} from "../__mocks__/MetadataViewAPI";

describe('MetadataViewTable', () => {
    it('renders correct header and values columns', () => {
        const historyMock = {
            push: jest.fn()
        };

        const view = 'samples';
        const {columns} = mockViews().find(v => v.name === view);
        const data = {rows: mockRows(view)};
        const {queryByText, queryAllByText} = render(
            <MetadataViewTable
                columns={columns}
                data={data}
                view=""
                locationContext=""
                toggleRow={() => {}}
                history={historyMock}
            />
        );

        expect(queryByText('Sample label')).toBeInTheDocument();
        expect(queryByText('Sample type')).toBeInTheDocument();
        expect(queryByText('Topography')).toBeInTheDocument();
        expect(queryByText('Nature')).toBeInTheDocument();
        expect(queryByText('Origin')).toBeInTheDocument();
        expect(queryByText('Files')).toBeInTheDocument();
        expect(queryByText('S01')).toBeInTheDocument();
        expect(queryByText('S02')).toBeInTheDocument();
        expect(queryAllByText('Tissue').length).toBe(2);
        expect(queryAllByText('DNA').length).toBe(2);
        expect(queryByText('Lip')).toBeInTheDocument();
        expect(queryByText('Tongue')).toBeInTheDocument();
    });

    it('should redirect when opening collection entry', () => {
        const historyMock = {
            push: jest.fn()
        };
        const view = 'collections';
        const {columns} = mockViews().find(v => v.name === view);
        const data = {rows: mockRows(view)};
        const wrapper = shallow(<MetadataViewTable
            columns={columns}
            data={data}
            view={view}
            locationContext=""
            toggleRow={() => {}}
            history={historyMock}
        />);

        const tableRows = wrapper.find(TableBody).find(TableRow);
        expect(tableRows.length).toEqual(1);
        tableRows.first().prop("onDoubleClick")();

        expect(historyMock.push).toHaveBeenCalledTimes(1);
        expect(historyMock.push).toHaveBeenCalledWith('/collections/c01');
    });
});
