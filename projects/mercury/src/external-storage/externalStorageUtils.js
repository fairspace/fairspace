import {encodePath} from "../file/fileUtils";
import * as consts from "../constants";
import {PATH_SEPARATOR} from "../constants";

export type ExternalStorage = {
    url: string,
    name: string,
    label: string
}

export const getExternalStoragePathPrefix = (storageName: string) => (
    consts.PATH_SEPARATOR + "external-storages" + consts.PATH_SEPARATOR + storageName
);

export const getExternalStorageAbsolutePath = (path: string, storageName: string) => (
    `${getExternalStoragePathPrefix(storageName)}${encodePath(path)}`
);

export const getRelativePath = (absolutePath: string, storageName: string) => (
    absolutePath.replace(getExternalStoragePathPrefix(storageName), '')
);

export const getPathToDisplay = (path: string) => {
    let displayPath = path;
    if (displayPath.startsWith(PATH_SEPARATOR)) {
        displayPath = displayPath.substring(1, displayPath.length);
    }
    if (displayPath.endsWith(PATH_SEPARATOR)) {
        displayPath = path.substring(0, displayPath.length - 1);
    }
    return displayPath;
};