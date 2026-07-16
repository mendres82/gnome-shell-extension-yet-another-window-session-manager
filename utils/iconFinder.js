'use strict';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as FileUtils from './fileUtils.js';

export function find(iconName) {
    let iconPath = `${FileUtils.current_extension_path}/icons/${iconName}`;
    if (GLib.file_test(iconPath, GLib.FileTest.EXISTS)) {
        return Gio.icon_new_for_string(`${iconPath}`);
    }

    return Gio.ThemedIcon.new_from_names([iconName]);
    
}
