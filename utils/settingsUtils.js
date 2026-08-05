'use strict';

/**
 * The instance of the SettingsUtilsClass
 */
export let SettingsUtils = null;

/**
 * Initialize the SettingsUtilsClass from extension.js or prefs.js so that it can be used.
 * 
 * @param {*} extensionObject 
 * @param {*} settings 
 */
export function settingsUtilsInit(extensionObject, settings) {
    if (SettingsUtils) {
        return;
    }

    const settingsUtilsClass = new SettingsUtilsClass();
    settingsUtilsClass._init(extensionObject, settings);
    SettingsUtils = settingsUtilsClass;
}

export function settingsUtilsDestroy() {
    if (SettingsUtils) {
        SettingsUtils.destroy();
        SettingsUtils = null;
    }
}

/**
 * This class must be initialized using `settingsUtilsInit()` from extension.js or prefs.js before it can be used.
 */
const SettingsUtilsClass = class {

    constructor() {
    }

    _init(extensionObject, settings) {
        this.extensionObject = extensionObject;
        this.settings = settings;
    }

    getSettingString(settingName) {
        return this.settings.get_string(settingName);
    }

    getSettings() {
        return this.settings;
    }

    getExtensionPath() {
        return this.extensionObject.path;
    }

    isDebug() {
        return this.settings.get_boolean('debugging-mode');
    }

    isVerboseLogging() {
        return this.settings.get_boolean('verbose-logging');
    }

    destroy() {
        this.settings = null;
        this.extensionObject = null;
    }
}
