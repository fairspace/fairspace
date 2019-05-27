import {createClient} from "webdav";
import axios from 'axios';
import Config from "./Config/Config";
import {addCounterToFilename, generateUniqueFileName, getFileName, getParentPath, joinPaths} from '../utils/fileUtils';
import {compareBy, comparing} from "../utils/genericUtils";

// Ensure that the client passes along the credentials
const defaultOptions = {withCredentials: true};

// Keep all item properties
const includeDetails = {...defaultOptions, details: true};

axios.interceptors.request.use((config) => {
    if (config.method === 'propfind') {
        config.headers['content-type'] = 'application/xml';
        config.data = '<?xml version="1.0" encoding="utf-8" ?><propfind xmlns:D="DAV:"><allprop/></propfind>';
    }
    return config;
}, (error) => Promise.reject(error));

class FileAPI {
    client() {
        if (!this.webDavClient) {
            this.webDavClient = createClient(Config.get().urls.files);
        }
        return this.webDavClient;
    }

    stat(path) {
        return this.client().stat(path, includeDetails)
            .then(result => result.data);
    }

    /**
     * List directory contents
     * @param path      Full path within the collection
     * @returns {Promise<T>}
     */
    list(path) {
        return this.client().getDirectoryContents(path, includeDetails)
            .then(result => result.data)
            .then(files => files.sort(comparing(compareBy('type'), compareBy('filename'))));
    }

    /**
     * Creates a new directory within the current collection
     * @param path      Full path within the collection
     * @returns {*}
     */
    createDirectory(path) {
        return this.client().createDirectory(path, defaultOptions);
    }

    /**
     * Uploads the given files into the provided path
     * @param path
     * @param files
     * @param nameMapping
     * @returns Promise<any>
     */
    upload(path, files) {
        if (!files) {
            return Promise.reject(Error("No files given"));
        }

        const allPromises = files.map(({name, value}) => this.client().putFileContents(`${path}/${name}`, value, defaultOptions));

        return Promise.all(allPromises).then(() => files);
    }

    /**
     * It will calls the browser API to open the file if it's 'openable' otherwise the browser will show download dialog
     * @param path
     */
    open(path) {
        const link = this.getDownloadLink(path);
        window.open(link);
    }

    /**
     * It creates a full download like to the path provided
     */
    getDownloadLink = (path = '') => this.client().getFileDownloadLink(path, defaultOptions);

    /**
     * Deletes the file given by path
     * @param path
     * @returns Promise<any>
     */
    delete(path) {
        if (!path) return Promise.reject(Error("No path specified for deletion"));

        return this.client().deleteFile(path, defaultOptions);
    }

    /**
     * Move the file specified by {source} to {destination}
     * @param source
     * @param destination
     * @returns Promise<any>
     */
    move(source, destination) {
        if (!source) {
            return Promise.reject(Error("No source specified to move"));
        }
        if (!destination) {
            return Promise.reject(Error("No destination specified to move to"));
        }

        if (source === destination) {
            return Promise.resolve();
        }

        // We have to specify the destination ourselves, as the client() adds the fullpath
        // to the
        return this.client().moveFile(source, destination, defaultOptions);
    }

    /**
     * Copy the file specified by {source} to {destination}
     * @param source
     * @param destination
     * @returns Promise<any>
     */
    copy(source, destination) {
        if (!source) {
            return Promise.reject(Error("No source specified to copy"));
        }
        if (!destination) {
            return Promise.reject(Error("No destination specified to copy to"));
        }

        return this.client().copyFile(source, destination, defaultOptions);
    }


    /**
     * Move one or more files to a destinationdir
     * @param filePaths
     * @param destinationDir
     * @returns {*}
     */
    movePaths(filePaths, destinationDir) {
        return Promise.all(filePaths.map((sourceFile) => {
            const destinationFile = joinPaths(destinationDir, generateUniqueFileName(getFileName(sourceFile)));
            return this.move(sourceFile, destinationFile);
        }));
    }

    /**
     * Copies one or more files from to a destinationdir
     * @param filePaths
     * @param destinationDir
     * @returns {*}
     */
    copyPaths(filePaths, destinationDir) {
        return Promise.all(filePaths.map((sourceFile) => {
            let destinationFilename = generateUniqueFileName(getFileName(sourceFile));
            // Copying files to the current directory involves renaming
            if (destinationDir === getParentPath(sourceFile)) {
                destinationFilename = addCounterToFilename(destinationFilename);
            }

            const destinationFile = joinPaths(destinationDir, destinationFilename);

            return this.copy(sourceFile, destinationFile);
        }));
    }
}

export default new FileAPI();
