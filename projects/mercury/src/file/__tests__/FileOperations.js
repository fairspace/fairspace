import React from 'react';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import { IconButton } from '@mui/material';

import { FileOperations } from '../FileOperations';
import { COPY, CUT } from '../../constants';

// Enzyme is obsolete, the Adapter allows running our old tests.
// For new tests use React Testing Library. Consider migrating enzyme tests when refactoring.
configure({ adapter: new Adapter() });

describe('FileOperations', () => {
    const clearSelection = jest.fn();
    const refreshFiles = jest.fn();

    let wrapper;
    let clickHandler;

    const clipboardMock = {
        method: COPY,
        filenames: ['a'],
        isEmpty: () => false,
        length: () => 1,
    };

    const fileActionsMock = {
        getDownloadLink: () => 'http://a',
        createDirectory: () => Promise.resolve(),
        deleteMultiple: () => Promise.resolve(),
        copyPaths: () => new Promise(resolve => setTimeout(resolve, 500)),
    };

    const renderFileOperations = (clipboard, fileActions, openedPath) => shallow(<FileOperations
        classes={{}}
        paste={() => Promise.resolve()}
        files={[{ filename: 'a' }]}
        selectedPaths={['a']}
        clipboard={clipboard}
        fetchFilesIfNeeded={() => {}}
        getDownloadLink={() => {}}
        refreshFiles={refreshFiles}
        clearSelection={clearSelection}
        fileActions={fileActions}
        openedPath={openedPath}
        isWritingEnabled
    />);

    beforeEach(() => {
        clearSelection.mockReset();
        refreshFiles.mockReset();

        wrapper = renderFileOperations(clipboardMock, fileActionsMock);

        clickHandler = ariaLabel => wrapper.find('[aria-label="' + ariaLabel + '"]').prop('onClick');
    });

    it('should disable all buttons on when file operation is not finished yet', () => {
        clickHandler('Paste')({ stopPropagation: () => {} });

        wrapper.find(IconButton)
            .forEach(b => {
                expect(b.props().disabled).toBe(true);
            });
    });

    // eslint-disable-next-line arrow-body-style
    it('should enable all buttons after successful file operation', () => {
        return clickHandler('Paste')({ stopPropagation: () => {} })
            .then(() => {
                wrapper.find(IconButton)
                    .not('[download]')
                    .not('[aria-label="Show history"]')
                    .forEach(b => {
                        expect(b.props().disabled).toBe(false);
                    });
            });
    });

    async function performOperation(operation) {
        refreshFiles.mockReset();
        clearSelection.mockReset();

        try {
            await operation();
            expect(refreshFiles).toHaveBeenCalled();
            expect(clearSelection).toHaveBeenCalled();
        } catch (error) {
            throw new Error(`Operation failed: ${error}`);
        }
    }

    it('should clear selection and refresh files after all successful file operations', async () => {
        await performOperation(() => wrapper.find('CreateDirectoryButton').prop('onCreate')('some-dir'));
        await performOperation(() => clickHandler('Paste')({ stopPropagation: () => {} }));
        await performOperation(() => wrapper.find('[aria-label="Delete"]').parent().prop('onClick')());
    });

    describe('paste button', () => {
        it('should be disabled if clipboard is empty', () => {
            const emptyClipboard = {
                method: COPY,
                filenames: [],
                isEmpty: () => true,
                length: () => 0,
            };

            wrapper = renderFileOperations(emptyClipboard, fileActionsMock);
            expect(wrapper.find('[aria-label="Paste"]').prop('disabled')).toEqual(true);
        });
        it('should be disabled if the clipboard contains files cut from the current directory', () => {
            const openedPath = '/subdirectory';
            const currentDirClipboard = {
                method: CUT,
                filenames: ['/subdirectory/test.txt'],
                isEmpty: () => false,
                length: () => 1,
            };

            wrapper = renderFileOperations(currentDirClipboard, fileActionsMock, openedPath);
            expect(wrapper.find('[aria-label="Paste"]').prop('disabled')).toEqual(true);
        });
        it('should be enabled if the clipboard contains files cut from the other directory', () => {
            const openedPath = '/other-directory';
            const currentDirClipboard = {
                method: CUT,
                filenames: ['/subdirectory/test.txt'],
                isEmpty: () => false,
                length: () => 1,
            };

            wrapper = renderFileOperations(currentDirClipboard, fileActionsMock, openedPath);
            expect(wrapper.find('[aria-label="Paste"]').prop('disabled')).toEqual(false);
        });
        it('should be enabled if the clipboard contains files copied from the current directory', () => {
            const openedPath = '/subdirectory';
            const currentDirClipboard = {
                method: COPY,
                filenames: ['/subdirectory/test.txt'],
                isEmpty: () => false,
                length: () => 1,
            };

            wrapper = renderFileOperations(currentDirClipboard, fileActionsMock, openedPath);
            expect(wrapper.find('[aria-label="Paste"]').prop('disabled')).toEqual(false);
        });
    });

    describe('undelete button', () => {
        const emptyClipboard = {
            method: COPY,
            filenames: [],
            isEmpty: () => true,
            length: () => 0,
        };
        it('should not be shown if not in showDeleted mode', () => {
            const render = (fileActions) => shallow(<FileOperations
                classes={{}}
                paste={() => Promise.resolve()}
                files={[{ filename: 'a' }]}
                selectedPaths={[]}
                fetchFilesIfNeeded={() => {}}
                getDownloadLink={() => {}}
                refreshFiles={refreshFiles}
                clearSelection={clearSelection}
                fileActions={fileActions}
                openedPath={{}}
                isWritingEnabled
                clipboard={emptyClipboard}
                showDeleted={false}
            />);

            wrapper = render(fileActionsMock);
            expect(wrapper.find('[aria-label="Undelete"]')).toEqual({});
        });
        it('should be disabled if no file selected', () => {
            const render = (fileActions) => shallow(<FileOperations
                classes={{}}
                paste={() => Promise.resolve()}
                files={[{ filename: 'a' }]}
                selectedPaths={[]}
                fetchFilesIfNeeded={() => {}}
                getDownloadLink={() => {}}
                refreshFiles={refreshFiles}
                clearSelection={clearSelection}
                fileActions={fileActions}
                openedPath={{}}
                isWritingEnabled
                clipboard={emptyClipboard}
                showDeleted
            />);

            wrapper = render(fileActionsMock);
            expect(wrapper.find('[aria-label="Undelete"]').prop('disabled')).toEqual(true);
        });
        it('should be disabled if non-deleted file selected', () => {
            const render = (fileActions) => shallow(<FileOperations
                classes={{}}
                paste={() => Promise.resolve()}
                files={[{ filename: 'a' }]}
                selectedPaths={['a']}
                fetchFilesIfNeeded={() => {}}
                getDownloadLink={() => {}}
                refreshFiles={refreshFiles}
                clearSelection={clearSelection}
                fileActions={fileActions}
                openedPath={{}}
                isWritingEnabled
                clipboard={emptyClipboard}
                showDeleted
            />);

            wrapper = render(fileActionsMock);
            expect(wrapper.find('[aria-label="Undelete"]').prop('disabled')).toEqual(true);
        });
        it('should be enabled if deleted file selected', () => {
            const render = (fileActions) => shallow(<FileOperations
                classes={{}}
                paste={() => Promise.resolve()}
                files={[{ filename: 'a', dateDeleted: '08-06-2020' }]}
                selectedPaths={['a']}
                fetchFilesIfNeeded={() => {}}
                getDownloadLink={() => {}}
                refreshFiles={refreshFiles}
                clearSelection={clearSelection}
                fileActions={fileActions}
                openedPath={{}}
                isWritingEnabled
                clipboard={emptyClipboard}
                showDeleted
            />);

            wrapper = render(fileActionsMock);
            expect(wrapper.find('[aria-label="Undelete"]').prop('disabled')).toEqual(false);
        });
    });

    describe('show history button', () => {
        const emptyClipboard = {
            method: COPY,
            filenames: [],
            isEmpty: () => true,
            length: () => 0,
        };
        it('should be disabled if no file selected', () => {
            const render = (fileActions) => shallow(<FileOperations
                classes={{}}
                paste={() => Promise.resolve()}
                files={[{ filename: 'a', type: 'file' }]}
                selectedPaths={[]}
                fetchFilesIfNeeded={() => {}}
                getDownloadLink={() => {}}
                refreshFiles={refreshFiles}
                clearSelection={clearSelection}
                fileActions={fileActions}
                openedPath={{}}
                isWritingEnabled
                clipboard={emptyClipboard}
            />);

            wrapper = render(fileActionsMock);
            expect(wrapper.find('[aria-label="Show history"]').prop('disabled')).toEqual(true);
        });
        it('should be enabled if one file selected', () => {
            const render = (fileActions) => shallow(<FileOperations
                classes={{}}
                paste={() => Promise.resolve()}
                files={[{ filename: 'a', type: 'file' }]}
                selectedPaths={['a']}
                fetchFilesIfNeeded={() => {}}
                getDownloadLink={() => {}}
                refreshFiles={refreshFiles}
                clearSelection={clearSelection}
                fileActions={fileActions}
                openedPath={{}}
                isWritingEnabled
                clipboard={emptyClipboard}
            />);

            wrapper = render(fileActionsMock);
            expect(wrapper.find('[aria-label="Show history"]').prop('disabled')).toEqual(false);
        });
    });
});
